/**
 * Drill — relais IA (Cloudflare Worker, gratuit)
 * Trois usages :
 *  - par défaut : question + ce que le moteur de Drill a trouvé (CCAM ou prescription) → { reponse }
 *  - mode "lecture" : photo recadrée d'une ordonnance → { medicaments: [{nom, dosage, posologie}] }
 *  - mode "ordo" : synthèse de l'analyse d'un traitement faite par Drill → { reponse }
 *  - mode "fiche" : classe, indications et contre-indications lues dans le RCP officiel
 *    (base de données publique des médicaments, ANSM) → { fiches: [...] } — sans IA
 * Rien n'est stocké. La photo n'est transmise qu'à Gemini pour la lecture.
 * La clé Gemini reste secrète ici (variable GEMINI_API_KEY), jamais dans l'app.
 */
// Modèles essayés dans l'ordre (le premier disponible pour ta clé est utilisé).
// Google réserve les modèles 2.5 aux anciens projets : une clé récente reçoit une erreur 404.
const MODELES = ['gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];

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
  const liste = env.GEMINI_MODEL ? [env.GEMINI_MODEL, ...MODELES.filter(m => m !== env.GEMINI_MODEL)] : MODELES;
  let derniere = { erreur: 0, detail: '' };
  // Deux tours : si tous les modèles sont surchargés, on réessaie une fois après une courte pause.
  for (let tour = 0; tour < 2; tour++) {
    if (tour) await new Promise(r => setTimeout(r, 1500));
    let surcharge = false;
    for (const modele of liste) {
      const c = JSON.parse(JSON.stringify(corps));
      // Les modèles 2.5 réfléchissent sur le budget de sortie : on coupe la réflexion pour aller vite.
      if (/^gemini-2\.5-flash/.test(modele)) c.generationConfig = { ...c.generationConfig, thinkingConfig: { thinkingBudget: 0 } };
      let r;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
          body: JSON.stringify(c),
        });
      } catch (e) { derniere = { erreur: 503, detail: `${modele} : réseau` }; surcharge = true; continue; }
      if (r.ok) {
        const d = await r.json();
        return { texte: d?.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '', modele };
      }
      let detail = ''; try { detail = (await r.json())?.error?.message || ''; } catch {}
      derniere = { erreur: r.status, detail: `${modele} : ${detail}`.slice(0, 300) };
      // Surcharge ou panne passagère (429, 500, 503…) : on passe au modèle suivant.
      if (r.status === 429 || r.status >= 500) { surcharge = true; continue; }
      // Modèle inconnu ou non ouvert à cette clé : modèle suivant.
      if (r.status === 404 || /model|not found|not supported|no longer/i.test(detail)) continue;
      // Autre erreur (clé invalide, requête refusée) : inutile d'insister.
      return derniere;
    }
    if (!surcharge) break;
  }
  return derniere;
}

/* ---------- Fiches officielles (RCP de la base publique des médicaments) ---------- */
const BDPM = cis => `https://base-donnees-publique.medicaments.gouv.fr/medicament/${cis}/extrait`;
const ENTITES = { nbsp:' ', amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", rsquo:'’', lsquo:'‘', laquo:'«', raquo:'»', hellip:'…', ndash:'–', mdash:'—', deg:'°', micro:'µ', oelig:'œ', eacute:'é', egrave:'è', ecirc:'ê', euml:'ë', agrave:'à', acirc:'â', ccedil:'ç', icirc:'î', iuml:'ï', ocirc:'ô', ucirc:'û', ugrave:'ù', Eacute:'É', Agrave:'À', times:'×', le:'≤', ge:'≥', middot:'·', bull:'•' };
function texteDe(html) {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr|td|th|ul|ol|section)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, e) => ENTITES[e] ?? m)
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n[ \n]*/g, '\n')
    .trim();
}
function section(t, debut, fin) {
  let meilleur = '';
  for (const m of t.matchAll(new RegExp(debut + '([\\s\\S]*?)(?=' + fin + ')', 'gi'))) if (m[1].length > meilleur.length) meilleur = m[1];
  return meilleur.trim();
}
const couper = (s, n) => s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s;
async function fiche(cis) {
  const cle = new Request('https://drill-cache.local/fiche2/' + cis);
  let cache = null; try { cache = caches.default; const deja = await cache.match(cle); if (deja) return await deja.json(); } catch { cache = null; }
  let f = { cis, url: BDPM(cis) };
  try {
    const r = await fetch(BDPM(cis), { headers: { 'User-Agent': 'Drill (outil clinique etudiant)', 'Accept-Language': 'fr' } });
    if (!r.ok) return { ...f, erreur: r.status };
    const t = texteDe(await r.text());
    const cl = t.match(/Classe pharmacoth[ée]rapeutique\s*:?\s*([^\n]*?)\s*[,;.\-–]?\s*code ATC\s*:?\s*([A-Z]\d{2}[A-Z0-9]{0,4})/i)
            || t.match(/Classe pharmacoth[ée]rapeutique\s*:?\s*([^\n]{3,200})/i);
    f.classe = cl ? cl[1].replace(/[\s,;:–-]+$/, '').trim() : '';
    f.atc = cl && cl[2] ? cl[2] : (t.match(/code ATC\s*:?\s*([A-Z]\d{2}[A-Z0-9]{0,4})/i) || [])[1] || '';
    f.indications = couper(section(t, '4\\.1\\.?\\s*Indications th[ée]rapeutiques', '4\\.2\\.?\\s*Posologie'), 900);
    f.contreIndications = couper(section(t, '4\\.3\\.?\\s*Contre-?\\s?indications', '4\\.4\\.?\\s*Mises en garde'), 900);
    f.posologie = couper(section(t, '4\\.2\\.?\\s*Posologie et mode d.administration', '4\\.3\\.?\\s*Contre-?\\s?indications'), 1200);
    if (cache) { try { await cache.put(cle, new Response(JSON.stringify(f), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=604800' } })); } catch {} }
  } catch (e) { f.erreur = 'lecture'; }
  return f;
}

export default {
  async fetch(request, env) {
    try { return await traiter(request, env); }
    catch (e) {
      // Toujours répondre en JSON avec les en-têtes CORS, sinon l'app ne voit qu'une erreur réseau.
      return json({ erreur: 'Erreur du relais', detail: String(e && e.message || e).slice(0, 300) }, 500, {
        'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://ryannaalrn-sudo.github.io' });
    }
  },
};

async function traiter(request, env) {
  {
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
    // --- Fiches officielles : aucune IA, lecture du RCP sur la base publique (ANSM) ---
    if (corps.mode === 'fiche') {
      const liste = (Array.isArray(corps.cis) ? corps.cis : []).map(String).filter(c => /^\d{8}$/.test(c)).slice(0, 15);
      const fiches = await Promise.all(liste.map(fiche));
      return json({ fiches }, 200, cors);
    }

    // --- Lecture d'une photo d'ordonnance ---
    if (corps.mode === 'lecture') {
      const image = String(corps.image || '');
      const mime = /^image\/(jpeg|png|webp)$/.test(corps.mime) ? corps.mime : 'image/jpeg';
      if (!image || image.length > 4_000_000) return json({ erreur: 'Image absente ou trop lourde' }, 400, cors);
      const g = await gemini(env, {
        systemInstruction: { parts: [{ text: CONSIGNES_LECTURE }] },
        contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data: image } }, { text: 'Liste les médicaments de cette ordonnance.' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 4096, responseMimeType: 'application/json', responseSchema: SCHEMA_LECTURE },
      });
      if (g.erreur) return json({ erreur: 'IA indisponible', statut: g.erreur, detail: g.detail }, 502, cors);
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
      generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
    });
    if (g.erreur) return json({ erreur: 'IA indisponible', statut: g.erreur, detail: g.detail }, 502, cors);
    return json({ reponse: g.texte }, 200, cors);
  }
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
}
