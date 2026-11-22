/**
 * Drill — relais IA (Cloudflare Worker, gratuit)
 * Trois usages :
 *  - par défaut : question + ce que le moteur de Drill a trouvé (CCAM ou prescription) → { reponse }
 *  - mode "lecture" : photo recadrée d'une ordonnance → { medicaments: [{nom, dosage, posologie}] }
 *  - mode "ordo" : synthèse de l'analyse d'un traitement faite par Drill → { reponse }
 * Rien n'est stocké. La photo n'est transmise qu'à Gemini pour la lecture.
 * La clé Gemini reste secrète ici (variable GEMINI_API_KEY), jamais dans l'app.
 */
const MODELE_PAR_DEFAUT = 'gemini-2.5-flash';

const CONSIGNES = `Tu es l'assistant clinique de Drill, une app pour étudiants en chirurgie dentaire en France. Tu réponds aux questions de cotation CCAM et de prescription.
Règles :
- Réponds en français, en tutoyant, comme un collègue expérimenté : réponse directe d'abord (oui/non, quoi faire), puis l'explication en 2 à 5 phrases.
- Appuie-toi UNIQUEMENT sur les informations fournies par l'app : "pistes" (codes CCAM officiels V84 avec tarifs) et "contexte" (conduite à tenir calculée d'après la HAS 2026 sur les antibiotiques, la HAS 2024 sur l'endocardite, la SFCO 2015 sur les antithrombotiques, l'ANSM et les RCP).
- N'invente jamais de code, de tarif, de molécule, de dose ou de durée. Si l'information manque, dis-le et pose UNE question précise (âge, poids, allergie, antécédent, traitement, signes d'extension, risque hémorragique de l'acte).
- Ne recopie pas l'ordonnance ligne par ligne : l'app l'affiche déjà sous ta réponse. Mentionne seulement l'essentiel (molécule et durée).
- Si le contexte contient des hypothèses ("J'ai supposé…"), signale-les en une phrase.
- Rappelle que la décision finale revient au praticien quand le cas est à risque (avis du prescripteur, du senior, hospitalisation).
- Modificateurs CCAM : 9 = +30 % soins conservateurs éligibles de 1 à 26 ans ; N = +15,7 % restauration/endo sur dent permanente avant 13 ans ; E = +49 % radio avant 5 ans ; F = +19,06 € urgence dimanche/férié ; U = +25,15 € urgence de nuit (F et U : une fois par séance).
- Ne demande et ne mentionne jamais de données personnelles de patient (nom, date de naissance).`;

const CONSIGNES_LECTURE = `Tu lis la photo d'une ordonnance médicale française pour un chirurgien-dentiste.
Extrais UNIQUEMENT les médicaments prescrits : nom (spécialité ou DCI, tel qu'écrit), dosage, posologie.
- N'écris JAMAIS le nom, le prénom, l'âge, l'adresse ou un identifiant du patient, ni le nom du prescripteur ou de l'établissement.
- Corrige les fautes de lecture évidentes vers le nom de médicament français le plus probable (ex. "Kardegic" pour "Kardegik").
- Ignore les dispositifs non médicamenteux (pansements, bandelettes, aiguilles) sauf s'ils indiquent un traitement (ex. aiguilles à insuline → noter "insuline").
- Si un nom est illisible, mets ce que tu lis suivi de "(?)".
- Si l'image ne contient pas d'ordonnance lisible, renvoie une liste vide et lisible=false.`;

const CONSIGNES_ORDO = `Tu es l'assistant clinique de Drill. Un étudiant en chirurgie dentaire a scanné le traitement d'un patient.
Drill a déjà calculé les interactions (thésaurus ANSM 2023), le terrain (HAS 2026, SFCO 2015) et les effets en bouche : ils sont dans le contexte et affichés à l'écran.
Ta mission, en français et en tutoyant, 6 à 10 phrases au maximum :
1. Résume ce que ce traitement dit du patient (pathologies probables), en 1 ou 2 phrases.
2. Donne les 2 à 4 points qui comptent le plus pour le dentiste (geste, prescription), sans recopier toute la liste.
3. Pour chaque ligne "non reconnue", dis ce que c'est si tu le sais avec certitude (DCI, classe) et s'il y a une conséquence dentaire connue ; sinon dis qu'il faut vérifier sur le Vidal.
4. Termine par les questions à poser au patient si le contexte en liste.
N'invente aucune interaction, dose ou contre-indication absente du contexte, sauf pour les lignes non reconnues où tu restes prudent. Ne mentionne jamais de données personnelles.`;

const SCHEMA_LECTURE = {
  type: 'OBJECT',
  properties: {
    lisible: { type: 'BOOLEAN' },
    medicaments: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      nom: { type: 'STRING' }, dosage: { type: 'STRING' }, posologie: { type: 'STRING' } }, required: ['nom'] } },
  },
  required: ['lisible', 'medicaments'],
};

async function gemini(env, corps) {
  const modele = env.GEMINI_MODEL || MODELE_PAR_DEFAUT;
  if (/flash/.test(modele)) corps.generationConfig = { ...corps.generationConfig, thinkingConfig: { thinkingBudget: 0 } };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify(corps),
  });
  if (!r.ok) return { erreur: r.status };
  const d = await r.json();
  return { texte: d?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '' };
}

export default {
  async fetch(request, env) {
    const origine = env.ALLOWED_ORIGIN || 'https://ryannaalrn-sudo.github.io';
    const cors = {
      'Access-Control-Allow-Origin': origine,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST') return new Response('Méthode non autorisée', { status: 405, headers: cors });

    let corps;
    try { corps = await request.json(); } catch { return json({ erreur: 'JSON invalide' }, 400, cors); }
    // --- Lecture d'une photo d'ordonnance ---
    if (corps.mode === 'lecture') {
      const image = String(corps.image || '');
      const mime = /^image\/(jpeg|png|webp)$/.test(corps.mime) ? corps.mime : 'image/jpeg';
      if (!image || image.length > 4_000_000) return json({ erreur: 'Image absente ou trop lourde' }, 400, cors);
      const g = await gemini(env, {
        systemInstruction: { parts: [{ text: CONSIGNES_LECTURE }] },
        contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data: image } }, { text: 'Liste les médicaments de cette ordonnance.' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 1200, responseMimeType: 'application/json', responseSchema: SCHEMA_LECTURE },
      });
      if (g.erreur) return json({ erreur: 'IA indisponible', statut: g.erreur }, 502, cors);
      let res; try { res = JSON.parse(g.texte); } catch { return json({ erreur: 'Lecture impossible' }, 502, cors); }
      const medicaments = (res.medicaments || []).slice(0, 30).map(m => ({ nom: String(m.nom || '').slice(0, 80), dosage: String(m.dosage || '').slice(0, 60), posologie: String(m.posologie || '').slice(0, 160) }));
      return json({ lisible: !!res.lisible, medicaments }, 200, cors);
    }

    const question = String(corps.question || '').slice(0, 800);
    if (!question) return json({ erreur: 'Question vide' }, 400, cors);
    const pistes = Array.isArray(corps.pistes) ? corps.pistes.slice(0, 12) : [];
    const contexte = String(corps.contexte || '').slice(0, 8000);
    const historique = Array.isArray(corps.historique) ? corps.historique.slice(-6) : [];
    const ordo = corps.mode === 'ordo';

    const contents = [
      ...historique.filter(m => m && m.texte).map(m => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: String(m.texte).slice(0, 800) }] })),
      { role: 'user', parts: [{ text: ordo ? `${question}\n\nAnalyse calculée par Drill :\n${contexte}` : `Question : ${question}\n\nContexte calculé par Drill :\n${contexte || '(aucun)'}\n\nPistes CCAM (JSON) : ${JSON.stringify(pistes)}` }] },
    ];
    const g = await gemini(env, {
      systemInstruction: { parts: [{ text: ordo ? CONSIGNES_ORDO : CONSIGNES }] },
      contents,
      generationConfig: { temperature: 0.2, maxOutputTokens: ordo ? 900 : 700 },
    });
    if (g.erreur) return json({ erreur: 'IA indisponible', statut: g.erreur }, 502, cors);
    return json({ reponse: g.texte }, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
}
