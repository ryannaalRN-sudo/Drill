/**
 * Drill — relais IA (Cloudflare Worker, gratuit)
 * Reçoit la question + ce que le moteur de Drill a trouvé (codes CCAM ou conduite à tenir),
 * demande à Gemini de rédiger la réponse, et renvoie { reponse }.
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
    const question = String(corps.question || '').slice(0, 800);
    if (!question) return json({ erreur: 'Question vide' }, 400, cors);
    const pistes = Array.isArray(corps.pistes) ? corps.pistes.slice(0, 12) : [];
    const contexte = String(corps.contexte || '').slice(0, 6000);
    const historique = Array.isArray(corps.historique) ? corps.historique.slice(-6) : [];

    const contents = [
      ...historique.filter(m => m && m.texte).map(m => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: String(m.texte).slice(0, 800) }] })),
      { role: 'user', parts: [{ text: `Question : ${question}\n\nContexte calculé par Drill :\n${contexte || '(aucun)'}\n\nPistes CCAM (JSON) : ${JSON.stringify(pistes)}` }] },
    ];

    const modele = env.GEMINI_MODEL || MODELE_PAR_DEFAUT;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CONSIGNES }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
      }),
    });
    if (!r.ok) return json({ erreur: 'IA indisponible', statut: r.status }, 502, cors);
    const d = await r.json();
    const reponse = d?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    return json({ reponse }, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
}
