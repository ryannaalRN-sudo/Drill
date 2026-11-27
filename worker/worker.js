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
const MODELES = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];

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

/* Appel d'un modèle, avec délai maximal et réflexion réduite au minimum (c'est elle qui coûtait
   des dizaines de secondes). Si un modèle refuse le réglage de réflexion, on le renvoie sans. */
async function appel(env, modele, corps, delai, signalCommun) {
  const essai = async (avecReflexion) => {
    const c = JSON.parse(JSON.stringify(corps));
    if (avecReflexion) {
      const t = /^gemini-2\.5/.test(modele) ? { thinkingBudget: 0 } : { thinkingLevel: 'low' };
      c.generationConfig = { ...c.generationConfig, thinkingConfig: t };
    }
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), delai);
    const stop = () => ctrl.abort();
    signalCommun?.addEventListener('abort', stop);
    const t0 = Date.now();
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modele}:generateContent`, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify(c),
      });
      if (r.ok) {
        const d = await r.json();
        const texte = d?.candidates?.[0]?.content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
        return { texte, modele, ms: Date.now() - t0 };
      }
      let detail = ''; try { detail = (await r.json())?.error?.message || ''; } catch {}
      return { erreur: r.status, detail: `${modele} : ${detail}`.slice(0, 300) };
    } catch (e) {
      return { erreur: ctrl.signal.aborted ? 504 : 503, detail: `${modele} : ${ctrl.signal.aborted ? 'trop lent' : 'réseau'}` };
    } finally { clearTimeout(minuteur); signalCommun?.removeEventListener('abort', stop); }
  };
  let r = await essai(true);
  if (r.erreur === 400 && /think/i.test(r.detail)) r = await essai(false);
  return r;
}

/* Course entre modèles : le premier modèle part tout de suite ; s'il n'a pas répondu après
   `relance` ms, le suivant part en parallèle ; la première réponse valable gagne et coupe les autres.
   Un modèle indisponible (404, surcharge, délai dépassé) passe aussitôt la main au suivant. */
async function gemini(env, corps, { delai = 14000, relance = 3500, rapide = false } = {}) {
  let liste = env.GEMINI_MODEL ? [env.GEMINI_MODEL, ...MODELES.filter(m => m !== env.GEMINI_MODEL)] : MODELES;
  // Questions de l'assistant : le modèle « lite » d'abord (réponse en moins d'une seconde), « flash » en relais.
  if (rapide) liste = [...liste.filter(m => /lite/.test(m)), ...liste.filter(m => !/lite/.test(m))];
  const commun = new AbortController();
  let derniere = { erreur: 0, detail: '' };
  return await new Promise(resolve => {
    let i = 0, enCours = 0, fini = false, prochain = null;
    const terminer = res => { if (fini) return; fini = true; clearTimeout(prochain); commun.abort(); resolve(res); };
    const lancer = () => {
      if (fini || i >= liste.length) { if (!enCours) terminer(derniere); return; }
      const modele = liste[i++]; enCours++;
      clearTimeout(prochain); prochain = setTimeout(lancer, relance);
      appel(env, modele, corps, delai, commun.signal).then(r => {
        enCours--;
        if (fini) return;
        if (!r.erreur) return terminer(r);
        derniere = r;
        // Clé invalide ou requête refusée : inutile d'essayer les autres modèles.
        if ((r.erreur === 400 || r.erreur === 401 || r.erreur === 403) && !/model|not found|not supported|no longer/i.test(r.detail)) return terminer(r);
        lancer();
      });
    };
    lancer();
  });
}

/* ---------- Fiches officielles (RCP de la base publique des médicaments) ---------- */
const BDPM = cis => `https://base-donnees-publique.medicaments.gouv.fr/medicament/${cis}/extrait`;
const ENTITES = { nbsp:' ', amp:'&', lt:'<', gt:'>', quot:'"', apos:"'", rsquo:'’', lsquo:'‘', laquo:'«', raquo:'»', hellip:'…', ndash:'–', mdash:'—', deg:'°', micro:'µ', oelig:'œ', eacute:'é', egrave:'è', ecirc:'ê', euml:'ë', agrave:'à', acirc:'â', ccedil:'ç', icirc:'î', iuml:'ï', ocirc:'ô', ucirc:'û', ugrave:'ù', Eacute:'É', Agrave:'À', times:'×', le:'≤', ge:'≥', middot:'·', bull:'•' };
function texteDe(html) {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr|td|th|ul|ol|section)>/gi, '\n')
    .replace(/<\/?[a-z!][^>]*>/gi, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, e) => ENTITES[e] ?? m)
    .replace(/[ \t\r\u00a0]+/g, ' ')
    .replace(/ *\n[ \n]*/g, '\n')
    .trim();
}
function section(t, debut, fin) {
  let meilleur = '';
  for (const m of t.matchAll(new RegExp(debut + '([\\s\\S]*?)(?=' + fin + ')', 'gi'))) if (m[1].length > meilleur.length) meilleur = m[1];
  return meilleur.trim();
}
const couper = (s, n) => s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s;
/* ---------- RCP en blocs (Médicodex) ----------
   ['h', titre] · ['p', texte] · ['l', puce] · ['c', en-tête, corps] (ligne de tableau regroupée)
   Le gras d'origine est gardé entre \u0002 et \u0003. */
const GD = '\u0002', GF = '\u0003';
const decoder = s => s
  .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/gi, (m, e) => ENTITES[e] ?? m);
function enLigne(html) {
  let t = decoder(html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<span[^>]*font-family:\s*(?:Symbol|Wingdings|&quot;Courier New|"Courier New)[^>]*>[\s\S]*?<\/span>\s*<\/span>/gi, ' ')
    .replace(/<(b|strong|u)\b[^>]*>/gi, GD).replace(/<\/(b|strong|u)>/gi, GF)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[a-z!][^>]*>/gi, ''))
    .replace(/[\s\u00a0]+/g, ' ')
    .replace(/³(?=\s*\d)/g, '≥').replace(/£(?=\s*\d)/g, '≤');   // police Symbol de Word
  // gras vides, gras collés, gras emboîtés
  for (let i = 0; i < 3; i++) t = t.replace(new RegExp(GD + '(\\s*)' + GF, 'g'), '$1').replace(new RegExp(GF + '(\\s*)' + GD, 'g'), '$1');
  let n = 0; t = [...t].filter(ch => { if (ch === GD) return ++n === 1; if (ch === GF) { if (n === 0) return false; return --n === 0; } return true; }).join('');
  if (n > 0) t += GF;
  return t.replace(new RegExp('\\s+(' + GF + ')', 'g'), '$1').trim();
}
const sansGras = t => t.replace(/[\u0002\u0003]/g, '');
const toutGras = t => { const g = (t.match(/\u0002([^\u0003]*)\u0003/g) || []).join('').length - 2 * (t.match(/\u0002/g) || []).length; return g > 0 && g >= 0.9 * sansGras(t).length; };
function celluleRCP(html) { return html.split(/<\/p>|<br\s*\/?>|<\/li>/i).map(enLigne).filter(x => sansGras(x).trim()).join('\n'); }
function tableRCP(h) {
  const rows = [...h.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(r => [...r[1].matchAll(/<t([dh])\b([^>]*)>([\s\S]*?)<\/t[dh]>/gi)].map(c => ({
    span: +((c[2].match(/rowspan\s*=\s*["']?(\d+)/i) || [])[1] || 1),
    col: +((c[2].match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || 1),
    x: celluleRCP(c[3]), th: c[1].toLowerCase() === 'h' })));
  // grille : une cellule fusionnée sur plusieurs lignes est le même objet sur chaque ligne
  const grille = [], pend = [];
  for (const r of rows) {
    const ligne = []; let ci = 0, k = 0;
    while (k < r.length || pend.slice(ci).some(p => p && p.reste > 0)) {
      if (pend[ci] && pend[ci].reste > 0) { ligne.push(pend[ci].cell); pend[ci].reste--; ci++; continue; }
      if (k >= r.length) { ligne.push(null); ci++; continue; }
      const c = r[k++];
      for (let j = 0; j < c.col; j++) { ligne.push(j ? null : c); if (c.span > 1) pend[ci] = { cell: c, reste: c.span - 1 }; ci++; }
    }
    if (ligne.some(c => c && sansGras(c.x).trim())) grille.push(ligne);
  }
  if (!grille.length) return [];
  const nc = Math.max(...grille.map(l => l.length));
  if (nc === 1) return grille.map(l => ['p', l[0] ? l[0].x : '']).filter(b => b[1]);
  // ligne d'en-tête : cellules en gras, <th>, ou intitulés usuels
  const l0 = grille[0].filter(Boolean);
  const motEntete = c => /^(indications?|doses?|posologie|poids|[âa]ge|fr[ée]quence|classes?|syst[èe]me|effets?|m[ée]dicaments?|population|dur[ée]e|voie|clairance|dfg|crcl|adultes?|enfants?|patients?|tranche|type)\b/i.test(sansGras(c.x).trim());
  const entete = grille.length > 1 && l0.length > 1 && (l0.every(c => c.th || !c.x || toutGras(c.x) || motEntete(c))
    || (l0.some(motEntete) && !l0.some(c => /\d\s*(mg|g|ml|µg)\b/i.test(sansGras(c.x)))));
  const hdr = entete ? grille.shift().map(c => c ? sansGras(c.x).replace(/\s*\*+$/, '').trim() : '') : [];
  const cartes = []; let prec = null;
  for (const l of grille) {
    const c0 = l[0], autres = l.slice(1);
    const lib = (c, j) => c && sansGras(c.x).trim() ? (nc > 2 && hdr[j + 1] ? hdr[j + 1] + ' : ' : '') + c.x : '';
    if (prec && c0 && prec.l[0] === c0) {        // même première cellule (fusionnée) : nouvelle ligne de corps
      prec.corps.push(autres.filter((c, j) => c !== prec.l[j + 1]).map((c, j) => lib(c, j)).filter(Boolean).join('\n'));
      prec.l = l; continue;
    }
    if (prec && autres.length && autres.every((c, j) => c && c === prec.l[j + 1])) {   // même corps (fusionné) : on regroupe les en-têtes
      if (c0 && sansGras(c0.x).trim()) prec.tetes.push(sansGras(c0.x).replace(/\n/g, ' '));
      prec.l = l; continue;
    }
    const t0 = c0 && sansGras(c0.x).trim() ? sansGras(c0.x).replace(/\n/g, ' ') : '';
    prec = { l, tetes: t0 ? [nc > 2 && hdr[0] && autres.some(Boolean) ? hdr[0] + ' : ' + t0 : t0] : [], corps: [autres.map((c, j) => lib(c, j)).filter(Boolean).join('\n')] };
    cartes.push(prec);
  }
  return cartes.map(c => {
    const tete = c.tetes.join(' · '), corps = c.corps.filter(Boolean).join('\n');
    if (!corps) return tete.length > 90 || /^[*+#(†‡]/.test(tete) ? ['p', tete] : ['h', tete];   // ligne seule : intertitre ou note
    return ['c', tete, corps];
  }).filter(c => c[1] || c[2]);
}
function blocsRCP(html, max) {
  const out = []; let n = 0;
  const re = /<table[\s\S]*?<\/table>|<p\b([^>]*)>([\s\S]*?)<\/p>|<li\b[^>]*>([\s\S]*?)<\/li>|<h[3-6]\b[^>]*>([\s\S]*?)<\/h[3-6]>/gi;
  for (const m of html.matchAll(re)) {
    let b = [];
    if (/^<table/i.test(m[0])) b = tableRCP(m[0]);
    else {
      const attrs = m[1] || '', brut = m[2] ?? m[3] ?? m[4] ?? '';
      const puce = m[3] != null || /Puce|Liste|Bullet/i.test(attrs) || /font-family:\s*Symbol/i.test(brut);
      let x = enLigne(brut); if (!sansGras(x).trim()) continue;
      if (puce) x = x.replace(/^([\u0002]?)\s*[·•o§▪\-–—]\s+/, '$1');
      const court = sansGras(x).length <= 160;
      if (m[4] != null || /Titre/i.test(attrs)) b = [['h', sansGras(x)]];
      else if (puce) b = [['l', x]];
      else if (court && toutGras(x) && !/[.;]$/.test(sansGras(x).trim())) b = [['h', sansGras(x)]];
      else b = [['p', x]];
    }
    for (const x of b) { n += (x[1] || '').length + (x[2] || '').length; if (n > max) { out.push(['p', '… (suite dans le RCP complet)']); return out; } out.push(x); }
  }
  return out;
}
/* Découpe le RCP par rubrique (titres « 4.x. … » de niveau 2) */
function rubriquesRCP(html) {
  const tit = [...html.matchAll(/<p\b[^>]*class=["']?AmmAnnexeTitre2[^>]*>([\s\S]*?)<\/p>/gi)];
  const r = {};
  tit.forEach((m, i) => {
    const num = (sansGras(enLigne(m[1])).match(/^\s*(\d+(?:\.\d+)?)/) || [])[1];
    if (!num) return;
    const fin = i + 1 < tit.length ? tit[i + 1].index : html.length;
    r[num] = html.slice(m.index + m[0].length, fin);
  });
  return r;
}
/* Monographie complète (Médicodex) : les rubriques du RCP officiel, un peu plus longues que la fiche courte */
async function monographie(cis) {
  const cle = new Request('https://drill-cache.local/mono3/' + cis);
  let cache = null; try { cache = caches.default; const deja = await cache.match(cle); if (deja) return await deja.json(); } catch { cache = null; }
  const f = { cis, url: BDPM(cis) };
  try {
    const r = await fetch(BDPM(cis), { headers: { 'User-Agent': 'Drill (outil clinique etudiant)', 'Accept-Language': 'fr' } });
    if (!r.ok) return { ...f, erreur: r.status };
    const html = await r.text();
    const t = texteDe(html);
    const cl = t.match(/Classe pharmacoth[ée]rapeutique\s*:?\s*([^\n]*?)\s*[,;.\-–]?\s*code ATC\s*:?\s*([A-Z]\d{2}[A-Z0-9]{0,4})/i)
            || t.match(/Classe pharmacoth[ée]rapeutique\s*:?\s*([^\n]{3,200})/i);
    f.classe = cl ? cl[1].replace(/[\s,;:–-]+$/, '').trim() : '';
    f.atc = cl && cl[2] ? cl[2] : (t.match(/code ATC\s*:?\s*([A-Z]\d{2}[A-Z0-9]{0,4})/i) || [])[1] || '';
    // rubriques structurées (titres, puces, tableaux) quand la page suit le modèle ANSM
    const rub = rubriquesRCP(html);
    const B = { indications: ['4.1', 4000], posologie: ['4.2', 12000], contreIndications: ['4.3', 3500], precautions: ['4.4', 7000], interactions: ['4.5', 6000], grossesse: ['4.6', 4000], effets: ['4.8', 6000] };
    f.blocs = {};
    for (const [k, [num, max]] of Object.entries(B)) if (rub[num]) { const b = blocsRCP(rub[num], max); if (b.length) f.blocs[k] = b; }
    const R = (a, b, n) => couper(section(t, a, b), n);
    f.indications = R('4\\.1\\.?\\s*Indications th[ée]rapeutiques', '4\\.2\\.?\\s*Posologie', 3000);
    f.posologie = R('4\\.2\\.?\\s*Posologie et mode d.administration', '4\\.3\\.?\\s*Contre-?\\s?indications', 7000);
    f.contreIndications = R('4\\.3\\.?\\s*Contre-?\\s?indications', '4\\.4\\.?\\s*Mises en garde', 2500);
    f.precautions = R('4\\.4\\.?\\s*Mises en garde', '4\\.5\\.?\\s*Interactions', 5000);
    f.interactions = R('4\\.5\\.?\\s*Interactions', '4\\.6\\.?\\s*(Fertilit|Grossesse)', 4000);
    f.grossesse = R('4\\.6\\.?\\s*(?:Fertilit[ée],?\\s*)?[Gg]rossesse', '4\\.7\\.?\\s*Effets sur', 3000);
    f.effets = R('4\\.8\\.?\\s*Effets ind[ée]sirables', '4\\.9\\.?\\s*Surdosage', 3500);
    if (cache) { try { await cache.put(cle, new Response(JSON.stringify(f), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=604800' } })); } catch {} }
  } catch (e) { f.erreur = 'lecture'; }
  return f;
}
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
    if (corps.mode === 'monographie') {
      const cis = String(corps.cis || '');
      if (!/^\d{8}$/.test(cis)) return json({ erreur: 'CIS invalide' }, 400, cors);
      return json(await monographie(cis), 200, cors);
    }
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
      }, { delai: 30000, relance: 9000 });
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
      generationConfig: { temperature: 0.2, maxOutputTokens: ordo ? 1400 : 900 },
    }, ordo ? { delai: 25000, relance: 3500 } : { delai: 13000, relance: 3000, rapide: true });
    if (g.erreur) return json({ erreur: 'IA indisponible', statut: g.erreur, detail: g.detail }, 502, cors);
    return json({ reponse: g.texte, modele: g.modele, ms: g.ms }, 200, cors);
  }
}

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
}
