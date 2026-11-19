/**
 * Drill — relais IA (Cloudflare Worker, gratuit)
 * Reçoit la question + les codes trouvés par le moteur local de l'app,
 * demande à Gemini de rédiger une réponse, et renvoie { reponse }.
 * La clé Gemini reste secrète ici (variable GEMINI_API_KEY), jamais dans l'app.
 */
const MODELE_PAR_DEFAUT = 'gemini-2.5-flash';

const CONSIGNES = `Tu es l'assistant de cotation CCAM de Drill, une app pour étudiants en chirurgie dentaire en France.
Règles :
- Réponds en français, en tutoyant, en 2 à 5 phrases maximum, comme un collègue qui connaît bien la CCAM.
- Appuie-toi UNIQUEMENT sur les codes fournis dans "pistes" (issus de la CCAM V84 officielle). N'invente jamais de code ni de tarif.
- Indique le code le plus adapté en gras (**HBGD036**) avec son tarif, puis explique brièvement pourquoi, et cite l'alternative utile s'il y en a une.
- Si les pistes ne suffisent pas pour répondre, pose UNE question précise (nombre de dents, numéro de dent, pulpe vivante ou non, etc.).
- Modificateurs : 9 = +30 % soins conservateurs éligibles de 1 à 26 ans ; N = +15,7 % restauration/endo sur dent permanente avant 13 ans ; E = +49 % radio avant 5 ans ; F = +19,06 € urgence dimanche/férié ; U = +25,15 € urgence de nuit 20 h-8 h (F et U : une fois par séance, exclusifs). Mentionne-les seulement s'ils s'appliquent.
- Plusieurs actes bucco-dentaires d'une même séance se cumulent à taux plein. Les avulsions se codent par nombre total de dents.
- Ne demande et ne mentionne jamais de données personnelles de patient.`;

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
    const question = String(corps.question || '').slice(0, 600);
    if (!question) return json({ erreur: 'Question vide' }, 400, cors);
    const pistes = Array.isArray(corps.pistes) ? corps.pistes.slice(0, 12) : [];
    const historique = Array.isArray(corps.historique) ? corps.historique.slice(-6) : [];

    const contents = [
      ...historique.filter(m => m && m.texte).map(m => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: String(m.texte).slice(0, 600) }] })),
      { role: 'user', parts: [{ text: `Question : ${question}\n\npistes (JSON) : ${JSON.stringify(pistes)}` }] },
    ];

    const modele = env.GEMINI_MODEL || MODELE_PAR_DEFAUT;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CONSIGNES }] },
        contents,
        generationConfig: { temperature: 0.2, maxOutputTokens: 400 },
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
