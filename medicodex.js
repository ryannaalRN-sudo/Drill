/* =====================================================================
   Drill — Médicodex : une seule fiche par molécule
   ---------------------------------------------------------------------
   - Toutes les spécialités (marques et génériques), formes et dosages
     d'une molécule réunis sur une fiche : base de données publique des
     médicaments (ANSM).
   - Rubriques du RCP officiel (indications, posologie, contre-indications,
     précautions, interactions, grossesse, effets indésirables), lues pour
     la forme choisie via le relais (mode « monographie »).
   - Calcul au poids pour les molécules prescrites au cabinet dentaire :
     schémas de la HAS 2026 (antibiotiques en pratique bucco-dentaire) et
     des RCP, avec conversion en mL pour chaque suspension buvable.
   - Lien avec Prescri'Dent : une posologie s'ajoute à l'ordonnance.
   Chargé après le script principal : il en utilise app, $, esc, aller, P…
   ===================================================================== */
const nMX = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ').replace(/\s+/g, ' ').trim();
const cleSubMX = s => nMX(s).replace(/^solution de /, '').replace(/^digluconate de /, '').replace(/^acide /, '').replace(/\s*,.*$/, '').trim();
const majMX = s => s.charAt(0).toUpperCase() + s.slice(1);
const normFormeMX = p => String(p || '').replace(/\s*\/\s*/g, '/').replace(/\s*,\s+/g, ', ').replace(/\s+/g, ' ').trim()
  .replace(/^(\d+(?:[.,]\d+)?\s*(?:%|mg|g|µg|mL)(?:\/\d*(?:[.,]\d+)?\s*(?:mL|g))?)\s+(?=[a-zà-ÿ])/i, '$1, ');   // « 5 % crème » = « 5 %, crème »
let MXI = null, MXI_attente = null;
let MX = { q: '', cle: null, forme: null, kg: '', qui: 'enfant', conc: null, mono: {}, monoEtat: {}, vidal: {} };

/* ---------- Index des molécules ---------- */
function indexMX() {
  if (MXI) return Promise.resolve(MXI);
  if (MXI_attente) return MXI_attente;
  MXI_attente = MEDS.chargerBDPM().then(BD => {
    const mol = new Map();
    const ajouter = (subs, nom, cis, pres, type) => {
      subs = (subs || []).filter(Boolean);
      if (!subs.length || subs.some(s => /homeopath|pour preparations/.test(nMX(s)))) return;
      const cle = [...new Set(subs.map(cleSubMX))].sort().join(' + ');
      if (!mol.has(cle)) mol.set(cle, { cle, noms: new Map(), specs: [], formes: new Map() });
      const m = mol.get(cle);
      subs.forEach(s => { const k = cleSubMX(s), propre = s.replace(/\s*,.*$/, '').replace(/^solution de /, ''); if (!m.noms.has(k) || propre.length > m.noms.get(k).length) m.noms.set(k, propre); });
      if (type === 'spe') m.specs.push({ nom, cis, pres });
      (pres || []).forEach(p => { p = normFormeMX(p); if (p && !m.formes.has(p)) m.formes.set(p, cis); });
    };
    for (const e of BD.noms.values()) ajouter(e.subs, e.nom, e.cis, e.pres, 'spe');
    for (const e of BD.dci.values()) ajouter(e.subs, e.nom, e.cis, e.pres, 'dci');
    mol.forEach(m => { m.nom = majMX([...m.noms.keys()].sort().map(k => m.noms.get(k)).join(' + ')); });
    MXI = { mol, liste: [...mol.values()] };
    return MXI;
  });
  MXI_attente.catch(() => { MXI_attente = null; });
  return MXI_attente;
}
function chercherMX(q, n = 20) {
  if (!MXI) return [];
  const mots = nMX(q).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 2);
  if (!mots.length) return [];
  const res = [];
  for (const m of MXI.liste) {
    let sc = 99;
    if (mots.every(w => m.cle.includes(w))) sc = m.cle.startsWith(mots[0]) ? (m.cle.includes(' + ') ? 1 : 0) : 2;
    else if (m.specs.some(s => mots.every(w => nMX(s.nom).includes(w)))) sc = m.specs.some(s => nMX(s.nom).startsWith(mots[0])) ? 3 : 4;
    if (sc < 99) res.push({ m, sc });
  }
  res.sort((a, b) => a.sc - b.sc || b.m.specs.length - a.m.specs.length || a.m.cle.length - b.m.cle.length);
  return res.slice(0, n).map(x => x.m);
}
/* Meilleure molécule pour un libellé d'ordonnance (« Amoxicilline (forme buvable) », « Chlorhexidine 0,12 % … ») */
function moleculeMX(texte) {
  const t = nMX(texte).replace(/\(.*?\)/g, ' ').replace(/\d+([.,]\d+)?\s*(%|mg|g|ml)?/g, ' ');
  const combo = t.split('+').map(x => x.trim().split(' ')[0]).filter(Boolean);
  if (combo.length > 1) { const r = chercherMX(combo.join(' '), 1)[0]; if (r && r.cle.includes(' + ')) return r; }
  return chercherMX(t.split(/[ +]/).filter(w => w.length >= 4)[0] || t, 1)[0] || null;
}
const estGeneriqueMX = (m, s) => nMX(s.nom).includes(m.cle.split(' + ')[0].split(' ')[0]);

/* ---------- Posologies au poids : schémas de la HAS 2026 et des RCP ---------- */
const POSO_MX = {
  'amoxicilline': [
    { qui: 'enfant', t: 'Antibioprophylaxie avant un geste', mgkg: 50, max: 2000, rythme: 'en une prise, 30 à 60 min avant le geste', src: 'HAS 2026 · RCP' },
    { qui: 'enfant', t: 'Infection bucco-dentaire (curatif)', mgkgj: 50, prises: 3, maxj: 3000, rythme: 'pendant 3 jours, à prolonger de 2 jours si les symptômes persistent', src: 'HAS 2026' },
    { qui: 'enfant', t: 'Cellulite cervico-faciale', mgkgj: [80, 100], prises: 3, maxj: 3000, rythme: '', src: 'HAS 2026' },
    { qui: 'enfant', t: 'Fourchette du RCP (sinusite, otite, abcès dentaire avec cellulite…)', mgkgj: [20, 90], prises: 3, maxj: 3000, rythme: 'selon l’indication (2 prises possibles pour les doses les plus élevées)', src: 'RCP' },
    { qui: 'adulte', t: 'Antibioprophylaxie avant un geste', texte: '2 g en une prise, 30 à 60 min avant le geste', src: 'HAS 2026 · RCP' },
    { qui: 'adulte', t: 'Infection bucco-dentaire (curatif)', texte: '1 g 3 fois par jour pendant 3 jours, à prolonger de 2 jours si les symptômes persistent', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Cellulite cervico-faciale', texte: '1 g 3 fois par jour, avec le geste de drainage', src: 'HAS 2026' },
  ],
  'amoxicilline + clavulanique': [
    { qui: 'enfant', t: 'Sinusite d’origine dentaire, ostéite, morsure', mgkgj: 80, prises: 3, maxj: 3000, rythme: '', note: 'Dose exprimée en amoxicilline.', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Sinusite d’origine dentaire', texte: '1 g / 125 mg 3 fois par jour pendant 7 jours', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Morsure ou plaie souillée', texte: '1 g / 125 mg 3 fois par jour pendant 5 jours', src: 'HAS 2026' },
  ],
  'metronidazole': [
    { qui: 'enfant', t: 'Curatif', mgkgj: 30, prises: 3, maxj: 1500, rythme: 'pendant 3 jours', note: 'Pas d’alcool pendant le traitement (effet antabuse).', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Curatif', texte: '500 mg 3 fois par jour pendant 3 jours', note: 'Pas d’alcool pendant le traitement (effet antabuse).', src: 'HAS 2026' },
  ],
  'clarithromycine': [
    { qui: 'enfant', t: 'Antibioprophylaxie (allergie aux pénicillines)', mgkg: 15, max: 500, rythme: 'en une prise, 30 à 60 min avant le geste', src: 'HAS 2026' },
    { qui: 'enfant', t: 'Curatif (allergie aux pénicillines, hors AMM)', mgkgj: 15, prises: 2, maxj: 1000, rythme: 'pendant 3 jours', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Antibioprophylaxie (allergie aux pénicillines)', texte: '500 mg en une prise, 30 à 60 min avant le geste', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Curatif (allergie aux pénicillines, hors AMM)', texte: '500 mg 2 fois par jour pendant 3 jours', src: 'HAS 2026' },
  ],
  'azithromycine': [
    { qui: 'enfant', t: 'Antibioprophylaxie (allergie aux pénicillines)', mgkg: 20, max: 500, rythme: 'en une prise, 30 à 60 min avant le geste', src: 'HAS 2026' },
    { qui: 'enfant', t: 'Curatif (allergie aux pénicillines)', mgkgj: 20, prises: 1, maxj: 500, rythme: 'pendant 3 jours', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Antibioprophylaxie (allergie aux pénicillines)', texte: '500 mg en une prise, 30 à 60 min avant le geste', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Curatif (allergie aux pénicillines)', texte: '500 mg 1 fois par jour pendant 3 jours', src: 'HAS 2026' },
  ],
  'pristinamycine': [
    { qui: 'enfant', t: 'Antibioprophylaxie (allergie aux pénicillines)', mgkg: 25, max: 1000, rythme: 'en une prise, 30 à 60 min avant le geste', note: 'Comprimés : pas avant 6 ans.', src: 'HAS 2026' },
    { qui: 'enfant', t: 'Curatif (allergie aux pénicillines, hors AMM)', mgkgj: 50, prises: 3, maxj: 2000, rythme: 'pendant 3 jours', note: 'Comprimés : pas avant 6 ans.', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Antibioprophylaxie (allergie aux pénicillines)', texte: '1 g en une prise, 30 à 60 min avant le geste', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Curatif (allergie aux pénicillines, hors AMM)', texte: '1 g 2 fois par jour pendant 3 jours', src: 'HAS 2026' },
  ],
  'clindamycine': [
    { qui: 'enfant', t: 'Morsure ou plaie souillée (allergie aux pénicillines)', mgkgj: 30, prises: 3, maxj: 1800, rythme: 'pendant 5 jours', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Morsure ou plaie souillée (allergie aux pénicillines)', texte: '600 mg 3 fois par jour pendant 5 jours', src: 'HAS 2026' },
  ],
  'cefpodoxime': [
    { qui: 'enfant', t: 'Sinusite d’origine dentaire (allergie aux pénicillines)', mgkgj: 8, prises: 2, maxj: 400, rythme: 'pendant 10 jours', src: 'HAS 2026' },
    { qui: 'adulte', t: 'Sinusite d’origine dentaire (allergie aux pénicillines)', texte: '200 mg 2 fois par jour pendant 5 jours', src: 'HAS 2026' },
  ],
  'paracetamol': [
    { qui: 'enfant', t: 'Douleur', mgkg: 15, max: 1000, rythme: 'toutes les 6 heures si douleur, sans dépasser 60 mg/kg par jour', src: 'RCP' },
    { qui: 'adulte', t: 'Douleur', texte: '1 g par prise si douleur, au moins 4 h entre deux prises, sans dépasser 3 g par jour', src: 'RCP · ANSM' },
    { qui: 'adulte', t: 'Insuffisance hépatique ou alcoolisme', texte: '1 g par prise, au moins 8 h entre deux prises, sans dépasser 2 g par jour', src: 'RCP' },
  ],
  'ibuprofene': [
    { qui: 'enfant', t: 'Douleur (dès 3 mois)', mgkg: 10, max: 400, rythme: '3 fois par jour au cours des repas, sans dépasser 30 mg/kg par jour', src: 'RCP' },
    { qui: 'adulte', t: 'Douleur', texte: '400 mg 3 fois par jour au cours des repas, sans dépasser 1 200 mg par jour', src: 'RCP' },
  ],
  'aciclovir': [
    { qui: 'enfant', t: 'Gingivostomatite herpétique, moins de 2 ans', texte: '100 mg (2,5 mL de la suspension à 200 mg/5 mL) 5 fois par jour pendant 5 jours', src: 'RCP' },
    { qui: 'enfant', t: 'Gingivostomatite herpétique, 2 ans et plus', texte: '200 mg (5 mL de la suspension à 200 mg/5 mL) 5 fois par jour pendant 5 jours', src: 'RCP' },
  ],
  'miconazole': [
    { qui: 'enfant', titre: 'Miconazole 2 %, gel buccal', t: 'Candidose buccale (gel 2 %), dès 4 mois', texte: 'Moins de 2 ans : 1,25 mL 4 fois par jour ; à partir de 2 ans : 2,5 mL 4 fois par jour, à distance des repas, 7 à 15 jours', note: 'Contre-indiqué avec les AVK et les sulfamides hypoglycémiants.', src: 'RCP' },
    { qui: 'adulte', titre: 'Miconazole 2 %, gel buccal', t: 'Candidose buccale (gel 2 %)', texte: '2,5 mL 4 fois par jour, à distance des repas, à garder en bouche avant d’avaler, 7 à 15 jours', note: 'Contre-indiqué avec les AVK et les sulfamides hypoglycémiants.', src: 'RCP' },
  ],
  'amphotericine b': [
    { qui: 'enfant', t: 'Candidose buccale (suspension à 10 %)', mlkgj: 0.5, maxml: 15, rythme: 'en 2 prises, en bain de bouche puis avalé, 2 à 3 semaines', src: 'RCP' },
    { qui: 'adulte', t: 'Candidose buccale (suspension à 10 %)', texte: '15 à 20 mL par jour en 2 à 3 prises, en bain de bouche puis avalé, 2 à 3 semaines', src: 'RCP' },
  ],
  'chlorhexidine': [
    { qui: 'adulte', t: 'Bain de bouche 0,12 % (après un geste chirurgical)', texte: '15 mL en bain de bouche d’1 min, 2 fois par jour après les repas, sans rincer, 7 jours', note: 'Pas avant 6 ans.', src: 'RCP' },
  ],
};
const MARQUES_MX = { clamoxyl: 'amoxicilline', augmentin: 'amoxicilline + clavulanique', flagyl: 'metronidazole', zeclar: 'clarithromycine', zithromax: 'azithromycine', pyostacine: 'pristinamycine', dalacine: 'clindamycine', orelox: 'cefpodoxime', doliprane: 'paracetamol', dafalgan: 'paracetamol', efferalgan: 'paracetamol', advil: 'ibuprofene', nurofen: 'ibuprofene', zovirax: 'aciclovir', daktarin: 'miconazole', fungizone: 'amphotericine b', paroex: 'chlorhexidine' };

const arrMX = mg => mg >= 100 ? Math.round(mg / 10) * 10 : Math.round(mg / 5) * 5;
const gMX = mg => mg >= 1000 && mg % 100 === 0 ? String(mg / 1000).replace('.', ',') + ' g' : mg + ' mg';
const mlMX = v => (Math.round(v * 10) / 10).toString().replace('.', ',') + ' mL';
/* Concentrations des formes buvables : mg par mL */
function concentrationsMX(formes) {
  const out = new Map();
  for (const p of formes) {
    if (!/buvable|sirop/i.test(p)) continue;
    let m = p.match(/^(\d+(?:[.,]\d+)?)\s*mg\s*\/\s*\d+(?:[.,]\d+)?\s*mg\s*(?:par|\/)\s*(\d+(?:[.,]\d+)?)?\s*mL/i), v = null;
    if (m) v = parseFloat(m[1].replace(',', '.')) / (m[2] ? parseFloat(m[2].replace(',', '.')) : 1);
    else if ((m = p.match(/(\d+(?:[.,]\d+)?)\s*mg\s*\/\s*(\d+(?:[.,]\d+)?)\s*mL/i))) v = parseFloat(m[1].replace(',', '.')) / parseFloat(m[2].replace(',', '.'));
    else if ((m = p.match(/(\d+(?:[.,]\d+)?)\s*mg\s*(?:par|\/)\s*mL/i))) v = parseFloat(m[1].replace(',', '.'));
    else if ((m = p.match(/^(\d+(?:[.,]\d+)?)\s*%/))) v = parseFloat(m[1].replace(',', '.')) * 10;
    if (!v || !isFinite(v)) continue;
    const lib = p.split(', ').filter(x => /\d/.test(x)).join(', ').replace(/\s*\/\s*/g, '/').replace(/\s+(ENFANTS?|ADULTES?|NOURRISSONS?)\b.*$/i, '').trim() || p;
    if (![...out.values()].some(x => Math.abs(x.v - v) < 1e-6)) out.set(lib, { v, lib, pres: p });
  }
  return [...out.values()].sort((a, b) => a.v - b.v);
}
/* Une posologie calculée : texte d'écran (ligne) et texte d'ordonnance (ordo) */
function calculMX(s, kg, conc) {
  if (s.texte) return { ligne: s.texte, ok: true };
  if (!(kg > 0)) {
    const base = s.mgkg ? `${s.mgkg} mg/kg ${s.rythme}${s.max ? ` (max ${gMX(s.max)})` : ''}`
      : s.mgkgj ? `${Array.isArray(s.mgkgj) ? s.mgkgj.join(' à ') : s.mgkgj} mg/kg/jour en ${s.prises} prise${s.prises > 1 ? 's' : ''}${s.maxj ? ` (max ${gMX(s.maxj)}/jour)` : ''} ${s.rythme}`
      : `${s.mlkgj * 2} mL pour 2 kg par jour (max ${s.maxml} mL) ${s.rythme}`;
    return { ligne: base.trim(), ok: false };
  }
  const ml = mg => mlMX(mg / conc.v);
  if (s.mlkgj) { const t = `${mlMX(Math.min(kg * s.mlkgj, s.maxml))} par jour ${s.rythme}`.trim(); return { ligne: t, ok: true, ordo: t }; }
  let mgT, mlT, fois = '';
  if (s.mgkg) {
    const d = arrMX(Math.min(kg * s.mgkg, s.max || Infinity));
    mgT = gMX(d); mlT = conc ? ml(d) : '';
  } else {
    const [a, b] = Array.isArray(s.mgkgj) ? s.mgkgj : [s.mgkgj, s.mgkgj];
    const p1 = arrMX(Math.min(kg * a, s.maxj || Infinity) / s.prises), p2 = arrMX(Math.min(kg * b, s.maxj || Infinity) / s.prises);
    mgT = p1 === p2 ? gMX(p1) : `${gMX(p1)} à ${gMX(p2)}`;
    mlT = conc ? (p1 === p2 ? ml(p1) : `${ml(p1)} à ${ml(p2)}`) : '';
    fois = s.prises === 1 ? ' 1 fois par jour' : ` ${s.prises} fois par jour`;
  }
  return {
    ok: true,
    ligne: `${mgT}${mlT ? ` (${mlT} de la forme à ${conc.lib})` : ''}${fois} ${s.rythme}`.trim(),
    ordo: `${mgT}${mlT ? ` (soit ${mlT})` : ''}${fois} ${s.rythme}`.trim(),
  };
}
/* Nom de la molécule tel que Prescri'Dent le connaît (pour ses présentations : comprimé, sachet…) */
function nomPresMX(m) {
  return Object.keys(typeof PRESENTATIONS === 'object' ? PRESENTATIONS : {}).find(k => [...new Set(k.split(' + ').map(cleSubMX))].sort().join(' + ') === m.cle) || m.nom;
}
/* La ligne telle qu'on l'écrit sur l'ordonnance */
function ordoMX(m, s, kg, conc) {
  const r = calculMX(s, kg, conc);
  if (!r.ok) return null;
  const horsAMM = /^Antibioprophylaxie|hors AMM/i.test(s.t);
  let titre, pos;
  if (s.texte) {
    const f = formaterLigne({ med: s.titre || nomPresMX(m), pos: s.texte, qsp: 'unique', cat: s.t });
    titre = f.titre; pos = f.pos;
  } else {
    titre = conc ? `${nomPresMX(m).replace(/\s\+\s/g, '/')} ${conc.pres}` : nomPresMX(m);
    pos = majMX(r.ordo).replace(/\s+,/g, ',') + (/[.!]$/.test(r.ordo) ? '' : '.');
  }
  return { titre, pos, horsAMM, texte: `${titre}\n${pos}${horsAMM ? '\nPrescription hors autorisation de mise sur le marché.' : ''}` };
}

/* ---------- Lien avec Prescri'Dent ---------- */
function versPrescriMX(ajout) {
  if (!P.attente) P.attente = [];
  P.attente.push(ajout);
  const pret = P.rep.motif && P.i >= etapes().length;
  aller('prescri');
  toast(pret ? 'Ajouté à l’ordonnance' : 'Réponds aux questions : il s’ajoutera à l’ordonnance');
}
function ouvrirMX(texte) {
  MX.q = ''; MX.cle = null; MX.forme = null;
  aller('medoc');
  indexMX().then(() => { const m = moleculeMX(texte); if (m) { MX.cle = m.cle; MX.forme = null; MX.conc = null; } else MX.q = texte; if (vue === 'medoc') vMedoc(); });
}
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-mx]'); if (!b) return;
  ev.preventDefault(); ev.stopPropagation();
  ouvrirMX(b.dataset.mx);
}, true);

/* ---------- Écran ---------- */
const SUGG_MX = ['Amoxicilline', 'Amoxicilline acide clavulanique', 'Paracétamol', 'Ibuprofène', 'Métronidazole', 'Clarithromycine', 'Azithromycine', 'Aciclovir', 'Miconazole', 'Chlorhexidine'];
const RUBRIQUES_MX = [['indications', 'Indications'], ['posologie', 'Posologie et mode d’administration'], ['contreIndications', 'Contre-indications'], ['precautions', 'Mises en garde et précautions'], ['interactions', 'Interactions'], ['grossesse', 'Grossesse et allaitement'], ['effets', 'Effets indésirables']];
function vMedoc() {
  const calme = !!app.querySelector('.vue.v-medoc');
  const m = MX.cle && MXI ? MXI.mol.get(MX.cle) : null;
  app.innerHTML = `<div class="vue v-medoc${calme ? ' calme' : ''}">
    <header class="top">${m ? `<button class="retour" id="mxRet">${ICO.retour}Recherche</button>` : `<div class="logo">${logo}Médicodex</div>`}</header>
    ${m ? ficheMX(m) : `<section class="accroche" style="padding:14px 0 10px"><h2>Une fiche par molécule</h2>
      <p class="sous" style="margin-top:6px">Toutes les spécialités, formes et posologies réunies. Données officielles de l’ANSM.</p></section>
      <label class="recherche">${ICO.loupe}<input id="mxQ" type="search" placeholder="Molécule, princeps ou générique" value="${esc(MX.q)}" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Rechercher un médicament"></label>
      <div id="mxRes" class="mx-res"></div>`}
    <div style="height:110px"></div>
  </div>`;
  if (!m) {
    const qi = $('#mxQ'), zone = $('#mxRes');
    const afficher = () => {
      if (!MXI) { zone.innerHTML = '<p class="sous" style="margin-top:14px">Chargement de la base officielle…</p>'; return; }
      MX.q = qi.value;
      const res = chercherMX(MX.q);
      zone.innerHTML = MX.q.trim().length < 2
        ? `<p class="groupe">Au cabinet dentaire</p><div class="mx-sugg">${SUGG_MX.map(s => `<button class="chip-pres" data-mxq="${esc(s)}">${esc(s)}</button>`).join('')}</div>`
        : res.length ? res.map(x => {
            const marques = x.specs.filter(s => !estGeneriqueMX(x, s)).map(s => MEDS.titre(s.nom));
            const nbG = x.specs.length - marques.length;
            return `<button class="mx-carte" data-cle="${esc(x.cle)}"><span><b>${esc(x.nom)}</b><small>${esc([marques.slice(0, 3).join(', ') + (marques.length > 3 ? '…' : ''), nbG ? `${nbG} générique${nbG > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ') || `${x.formes.size} forme${x.formes.size > 1 ? 's' : ''}`)}</small></span>${ICO.fleche}</button>`;
          }).join('')
        : '<p class="sous" style="margin-top:14px">Aucun médicament trouvé. Vérifie l’orthographe ou essaie la molécule (DCI).</p>';
      zone.querySelectorAll('[data-cle]').forEach(b => b.onclick = () => { MX.cle = b.dataset.cle; MX.forme = null; MX.conc = null; vMedoc(); window.scrollTo(0, 0); });
      zone.querySelectorAll('[data-mxq]').forEach(b => b.onclick = () => { qi.value = b.dataset.mxq; afficher(); const r = chercherMX(qi.value, 1)[0]; if (r) { MX.cle = r.cle; MX.forme = null; MX.conc = null; vMedoc(); window.scrollTo(0, 0); } });
    };
    qi.oninput = afficher;
    afficher();
    if (!MXI) indexMX().then(() => { if (vue === 'medoc' && !MX.cle) afficher(); }).catch(() => { zone.innerHTML = '<p class="sous" style="margin-top:14px">Base officielle indisponible : vérifie ta connexion.</p>'; });
    return;
  }
  brancherFicheMX(m);
}
const ICO_COPIE_MX = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
function schemasHTML(schemas, qui, kg, conc) {
  return schemas.filter(s => s.qui === qui).map(s => {
    const i = schemas.indexOf(s), r = calculMX(s, kg, qui === 'enfant' ? conc : null);
    return `<div class="mx-schema">
      <div class="mx-st"><h4>${esc(s.t)}</h4><span class="src">${esc(s.src)}</span></div>
      <p class="mx-dose">${esc(r.ligne)}</p>${s.note ? `<small>${esc(s.note)}</small>` : ''}
      ${r.ok ? `<div class="mx-bas"><button class="mini sec" data-mxcp="${i}">${ICO_COPIE_MX}<span>Copier</span></button><button class="mini" data-mxaj="${i}">Ajouter à Prescri’Dent</button></div>` : ''}
    </div>`;
  }).join('') + (qui === 'enfant' && !(kg > 0) ? '<p class="sous" style="font-size:.84rem;margin-top:4px">Saisis le poids : les doses et les volumes se calculent tout seuls.</p>' : '');
}
function concChoisieMX(formes) {
  const concs = concentrationsMX(formes);
  return concs.find(c => c.lib === MX.conc) || concs.find(c => c.v >= 40) || concs[concs.length - 1] || null;
}
/* Formes : voie orale d'abord, puis autres voies, puis injectables ; par dose croissante */
const voieMX = f => /injectable|perfusion/i.test(f) ? 2 : /buvable|comprim|g[ée]lule|sachet|sirop|granul|lyophilisat|orodispersible|capsule|pastille/i.test(f) ? 0 : 1;
const doseFormeMX = f => { const x = f.match(/^(\d+(?:[.,]\d+)?)\s*(g|mg|µg|microgrammes?|%)/i); if (!x) return 1e9; const v = parseFloat(x[1].replace(',', '.')); return /^g$/i.test(x[2]) ? v * 1000 : /µg|micro/i.test(x[2]) ? v / 1000 : v; };
const formesMX = m => [...m.formes.keys()].sort((a, b) => voieMX(a) - voieMX(b) || doseFormeMX(a) - doseFormeMX(b) || a.localeCompare(b, 'fr', { numeric: true }));
/* Tout ce que la fiche affiche, calculé à un seul endroit */
function etatFicheMX(m) {
  const formes = formesMX(m);
  const schemas = POSO_MX[m.cle] || [];
  const concs = concentrationsMX(formes);
  const conc = concChoisieMX(formes);
  const quiDispo = [...new Set(schemas.map(s => s.qui))];
  const qui = quiDispo.includes(MX.qui) ? MX.qui : quiDispo[0];
  // sans choix : la suspension du calcul (enfant), sinon la première forme orale
  const forme = MX.forme && m.formes.has(MX.forme) ? MX.forme : (qui === 'enfant' && conc && m.formes.has(conc.pres) ? conc.pres : formes[0]);
  const cis = m.formes.get(forme) || m.specs[0]?.cis;
  return { m, formes, forme, cis, schemas, concs, conc, quiDispo, qui, kg: parseFloat(String(MX.kg).replace(',', '.')), mono: cis ? MX.mono[cis] : null, etat: cis ? MX.monoEtat[cis] : '' };
}
function classeHTML(e) {
  return e.mono?.classe ? esc(majMX(e.mono.classe)) + (e.mono.atc ? ` · ATC ${esc(e.mono.atc)}` : '') : e.etat === 'charge' ? 'Lecture du RCP officiel…' : '';
}
function calcHTML(e) {
  if (!e.schemas.length) return '';
  return `<section class="compteur mx-calc" id="mxCalc"><h3>Posologies au poids</h3>
      <p class="sous" style="font-size:.86rem">Toutes les posologies utiles, sans avoir à choisir l’infection.</p>
      ${e.quiDispo.length > 1 ? `<div class="seg" data-mxk="qui">${e.quiDispo.map(v => `<button data-v="${v}" aria-pressed="${e.qui === v}">${v === 'enfant' ? 'Enfant (au poids)' : 'Adulte'}</button>`).join('')}</div>` : ''}
      ${e.qui === 'enfant' ? `<div class="rangee" style="margin-top:12px"><label class="sous" for="mxKg">Poids de l’enfant</label><div class="mx-kg"><input id="mxKg" class="nb" type="text" inputmode="decimal" value="${esc(MX.kg)}" placeholder="kg" autocomplete="off"><span>kg</span></div></div>
        ${e.concs.length > 1 ? `<p class="groupe" style="margin:12px 0 6px">Forme buvable</p><div class="mx-sugg">${e.concs.map(c => `<button class="chip-pres" data-conc="${esc(c.lib)}" aria-pressed="${!!e.conc && c.lib === e.conc.lib}">${esc(c.lib)}</button>`).join('')}</div>` : ''}` : ''}
      <div class="mx-schemas">${schemasHTML(e.schemas, e.qui, e.kg, e.conc)}</div>
    </section>`;
}
function formesHTML(e) {
  if (!e.formes.length) return '<div id="mxFormes"><p class="sous">Aucune présentation commercialisée listée.</p></div>';
  const noms = ['Voie orale', 'Autres voies', 'Injectable'];
  const groupes = [0, 1, 2].map(v => e.formes.filter(f => voieMX(f) === v)).map((fs, v) => fs.length ? `${e.formes.length > 4 ? `<p class="mx-voie">${noms[v]}</p>` : ''}<div class="mx-sugg mx-formes">${fs.map(f => `<button class="chip-pres" data-forme="${esc(f)}" aria-pressed="${f === e.forme}">${esc(f)}</button>`).join('')}</div>` : '');
  return `<div id="mxFormes">${groupes.join('')}</div>`;
}
/* ---------- RCP : intitulés en gras, explications en texte normal ---------- */
const nuMX = t => String(t || '').replace(/[\u0002\u0003]/g, '');
function grasMX(t) {
  let n = 0;
  const h = esc(String(t)).replace(/[\u0002\u0003]/g, c => { if (c === '\u0002') { n++; return '<b>'; } if (!n) return ''; n--; return '</b>'; });
  return h + '</b>'.repeat(n);
}
function accentMX(x, k, puce) {
  if (/\u0002/.test(x)) return grasMX(x);
  const t = nuMX(x).trim();
  // « Insuffisance rénale : … », « Phase précoce : … » → intitulé en gras
  let r = t.match(/^([A-ZÀ-Ýa-zà-ÿ0-9≥≤<>][^:;]{1,55}?)\s?:\s+(\S.*)$/);
  if (r && r[1].split(' ').length <= 8 && !/\.\s/.test(r[1])) return `<b>${esc(r[1])}</b> : ${esc(r[2])}`;
  if (k === 'indications' && puce && t.length <= 90) return `<b>${esc(t.replace(/[,;.]$/, ''))}</b>${esc(/[,;.]$/.test(t) ? t.slice(-1) : '')}`;
  if ((k === 'indications' && puce) || k === 'contreIndications') {
    r = t.match(/^(.{6,70}?)(,\s| \(|\s:|\.\s|\.$|;)(.*)$/);
    if (r) return `<b>${esc(r[1])}</b>${esc(r[2] + r[3])}`;
    if (t.length <= 90) return `<b>${esc(t)}</b>`;
  }
  return esc(t);
}
function rcpHTML(k, blocs) {
  let h = '', liste = [];
  const vider = () => { if (liste.length) { h += `<ul class="mx-l">${liste.join('')}</ul>`; liste = []; } };
  for (const [t, a, b] of blocs) {
    if (t === 'l') { liste.push(`<li>${accentMX(a, k, true)}</li>`); continue; }
    vider();
    if (t === 'h') h += `<h4 class="mx-h">${esc(nuMX(a))}</h4>`;
    else if (t === 'c') h += `<div class="mx-cas">${a ? `<b class="mx-cas-t">${esc(nuMX(a))}</b>` : ''}${String(b || '').split('\n').filter(Boolean).map(x => `<p>${accentMX(x, k)}</p>`).join('')}</div>`;
    else h += `<p>${accentMX(a, k)}</p>`;
  }
  vider();
  return h;
}
/* Ancien format (texte brut) : lignes courtes sans point = intertitres */
function blocsDepuisTexteMX(t) {
  return String(t || '').replace(/\r/g, '').replace(/^[a-zà-ÿ][^\n]*\n/, '').split('\n').map(x => x.trim()).filter(Boolean)
    .map(x => x.length <= 70 && !/[.;:,]$/.test(x) && /^[A-ZÀ-Ý]/.test(x) ? ['h', x] : ['p', x]);
}
function rubHTML(e) {
  const { mono, etat, cis } = e;
  return `<div class="mx-rubriques" id="mxRub">
      ${etat === 'charge' ? '<p class="sous" style="margin-top:10px"><span class="roue sombre"></span>Lecture du RCP officiel…</p>' : ''}
      ${etat === 'erreur' ? '<p class="sous" style="margin-top:10px">RCP indisponible pour le moment.</p>' : ''}
      ${mono ? RUBRIQUES_MX.filter(([k]) => mono.blocs?.[k] || mono[k]).map(([k, t]) => `<details class="pr mx-rub"${k === 'posologie' ? ' open' : ''}><summary><span>${t}</span></summary><div class="mx-rcp">${rcpHTML(k, mono.blocs?.[k] || blocsDepuisTexteMX(mono[k]))}${k === 'grossesse' ? `<p><a class="vidal" href="https://www.lecrat.fr" target="_blank" rel="noopener">Vérifier sur lecrat.fr (CRAT) ↗</a></p>` : ''}</div></details>`).join('') : ''}
      ${cis ? `<a class="vidal" style="display:inline-block;margin-top:10px" href="https://base-donnees-publique.medicaments.gouv.fr/medicament/${cis}/extrait" target="_blank" rel="noopener">RCP complet (base publique ANSM) ↗</a>` : ''}
    </div>`;
}
/* ---------- Page Vidal dédiée : trouvée par le relais, recherche Vidal en attendant ---------- */
function demandeVidalMX(m, e) {
  const subs = m.cle.split(' + ');   // « chlorhexidine » plutôt que « digluconate de chlorhexidine »
  const marque = subs.length > 1 ? (m.specs.filter(s => !estGeneriqueMX(m, s)).map(s => MEDS.titre(s.nom))[0] || '') : '';
  const dose = subs.length > 1 ? String(e.forme || '').split(', ')[0] : '';
  return { subs, marque, dose, cle: [subs.join('+'), marque, dose].join('|') };
}
function vidalHTML(m, e) {
  const d = demandeVidalMX(m, e), v = MX.vidal[d.cle];
  const url = v?.url || 'https://www.vidal.fr/recherche.html?query=' + encodeURIComponent(d.subs.join(' '));
  return `<a class="mx-vidal" id="mxVidal" href="${esc(url)}" target="_blank" rel="noopener"><span>Voir la page Vidal</span>${v?.type === 'medicament' ? `<small>${esc(v.nom.replace(/^[A-ZÀ-Ý][A-ZÀ-Ý\/ '-]*?(?=\s\d|$)/, x => MEDS.titre(x)))}</small>` : ''}<b aria-hidden="true">↗</b></a>`;
}
function majVidalMX(m) {
  const e = etatFicheMX(m), d = demandeVidalMX(m, e);
  const poser = () => { const a = $('#mxVidal'); if (a && vue === 'medoc' && MX.cle === m.cle) a.outerHTML = vidalHTML(m, etatFicheMX(m)); };
  if (MX.vidal[d.cle]) return poser();
  MX.vidal[d.cle] = null;
  fetch(IA_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'vidal', subs: d.subs, marque: d.marque, dose: d.dose }) })
    .then(r => r.json()).then(j => { if (j && j.url) { MX.vidal[d.cle] = j; poser(); } else delete MX.vidal[d.cle]; })
    .catch(() => { delete MX.vidal[d.cle]; });
}
function ficheMX(m) {
  const e = etatFicheMX(m);
  const marques = m.specs.filter(s => !estGeneriqueMX(m, s)), generiques = m.specs.filter(s => estGeneriqueMX(m, s));
  return `<section class="mx-tete">
      <h2>${esc(m.nom)}</h2>
      <p class="sous" id="mxClasse">${classeHTML(e)}</p>
      ${vidalHTML(m, e)}
      <p class="sous mx-compte">${marques.length ? `${marques.length} marque${marques.length > 1 ? 's' : ''}` : ''}${marques.length && generiques.length ? ' · ' : ''}${generiques.length ? `${generiques.length} générique${generiques.length > 1 ? 's' : ''}` : ''} · ${e.formes.length} forme${e.formes.length > 1 ? 's' : ''} et dosage${e.formes.length > 1 ? 's' : ''}</p>
    </section>
    ${calcHTML(e)}
    <p class="groupe">Formes et dosages</p>
    ${formesHTML(e)}
    <p class="sous" style="font-size:.8rem;margin-top:6px">Touche une forme : le RCP ci-dessous est celui de la forme choisie.</p>
    ${rubHTML(e)}
    <p class="groupe">Spécialités</p>
    ${marques.length ? `<details class="pr"${marques.length <= 6 ? ' open' : ''}><summary><span>Marques (${marques.length})</span></summary><ul>${marques.map(s => `<li>${esc(MEDS.titre(s.nom))}${s.pres.length ? `<small class="sous" style="display:block">${esc(s.pres.join(' · '))}</small>` : ''}</li>`).join('')}</ul></details>` : ''}
    ${generiques.length ? `<details class="pr" style="margin-top:8px"><summary><span>Génériques (${generiques.length})</span></summary><ul>${generiques.map(s => `<li>${esc(MEDS.titre(s.nom))}${s.pres.length ? `<small class="sous" style="display:block">${esc(s.pres.join(' · '))}</small>` : ''}</li>`).join('')}</ul></details>` : ''}
    <button class="btn sec" id="mxPrescri" style="width:100%;margin-top:16px">Ajouter à une ordonnance Prescri’Dent</button>
    <p class="demo">Sources : base de données publique des médicaments et RCP (ANSM), HAS 2026 (antibiotiques en pratique bucco-dentaire). Vérifie toujours la dose avant de prescrire.</p>`;
}
/* Remplace un morceau de la fiche sans faire sauter l'écran : l'élément touché reste au même endroit */
function majMorceauMX(sel, html, ancre) {
  const vieux = app.querySelector(sel); if (!vieux) return;
  const y0 = ancre && ancre.isConnected ? ancre.getBoundingClientRect().top : null;
  const cle = ancre ? [...ancre.attributes].find(a => a.name.startsWith('data-')) : null;
  vieux.outerHTML = html;
  if (y0 != null && cle) {
    const neuf = app.querySelector(`[${cle.name}="${CSS.escape(cle.value)}"]`);
    if (neuf) window.scrollBy(0, neuf.getBoundingClientRect().top - y0);
  }
}
function brancherFicheMX(m) {
  $('#mxRet').onclick = () => { MX.cle = null; vMedoc(); };
  brancherCalcMX(m); brancherFormesMX(m); chargerMonoMX(m); majVidalMX(m);
  $('#mxPrescri').onclick = () => {
    const e = etatFicheMX(m);
    versPrescriMX({ x: { nom: m.nom, subs: m.cle.split(' + '), cis: e.cis, pres: e.formes, classe: MX.mono[e.cis]?.classe ? majMX(MX.mono[e.cis].classe) : '', type: 'dci' } });
  };
}
function majCalcMX(m, ancre) { majMorceauMX('#mxCalc', calcHTML(etatFicheMX(m)), ancre); brancherCalcMX(m); }
function majFormesMX(m, ancre) {
  const e = etatFicheMX(m);
  majMorceauMX('#mxFormes', formesHTML(e), ancre); brancherFormesMX(m);
  const z = app.querySelector('#mxRub'); if (z) z.style.minHeight = z.offsetHeight + 'px';   // pas de trou pendant la lecture du RCP
  majMorceauMX('#mxRub', rubHTML(e)); $('#mxClasse').innerHTML = classeHTML(e);
  chargerMonoMX(m); majVidalMX(m);
}
function brancherFormesMX(m) {
  app.querySelectorAll('[data-forme]').forEach(b => b.onclick = () => {
    MX.forme = b.dataset.forme;
    const c = concentrationsMX([MX.forme])[0];
    const changeCalc = c && c.lib !== MX.conc;
    if (c) MX.conc = c.lib;   // une suspension choisie ici est aussi celle du calcul
    majFormesMX(m, b);
    if (changeCalc && app.querySelector('#mxCalc')) { const ancre = app.querySelector(`[data-forme="${CSS.escape(MX.forme)}"]`); majCalcMX(m, ancre); }
  });
}
function brancherCalcMX(m) {
  const e0 = etatFicheMX(m);
  app.querySelectorAll('[data-conc]').forEach(b => b.onclick = () => {
    MX.conc = b.dataset.conc;
    const c = concentrationsMX(e0.formes).find(x => x.lib === MX.conc);
    majCalcMX(m, b);
    if (c && m.formes.has(c.pres) && MX.forme !== c.pres) { MX.forme = c.pres; majFormesMX(m, app.querySelector(`[data-conc="${CSS.escape(MX.conc)}"]`)); }
  });
  app.querySelectorAll('[data-mxk="qui"] button').forEach(b => b.onclick = () => { MX.qui = b.dataset.v; majCalcMX(m, b); });
  const kgI = $('#mxKg');
  if (kgI) {
    // seul le bloc des doses est redessiné : le clavier reste ouvert
    kgI.oninput = () => {
      const v = kgI.value.replace(/[^\d.,]/g, ''); if (v !== kgI.value) kgI.value = v;
      if (parseFloat(v.replace(',', '.')) > 150) { kgI.value = MX.kg; toast('150 kg au maximum'); return; }
      MX.kg = v;
      const e = etatFicheMX(m), z = app.querySelector('.mx-schemas'); if (!z) return;
      z.innerHTML = schemasHTML(e.schemas, 'enfant', e.kg, e.conc);
      brancherAjoutsMX(m);
    };
    kgI.onkeydown = ev => { if (ev.key === 'Enter') kgI.blur(); };
  }
  brancherAjoutsMX(m);
}
function brancherAjoutsMX(m) {
  const ligne = i => { const e = etatFicheMX(m), s = e.schemas[+i]; return ordoMX(m, s, e.kg, s.qui === 'enfant' ? e.conc : null); };
  app.querySelectorAll('[data-mxaj]').forEach(b => b.onclick = () => {
    const o = ligne(b.dataset.mxaj); if (!o) return;
    const e = etatFicheMX(m);
    versPrescriMX({ titre: o.titre, pos: o.pos, classe: MX.mono[e.cis]?.classe ? majMX(MX.mono[e.cis].classe) : '' });
  });
  app.querySelectorAll('[data-mxcp]').forEach(b => b.onclick = async () => {
    const o = ligne(b.dataset.mxcp); if (!o) return;
    const ok = await copierTexte(o.texte);
    if (!ok) { toast('Copie impossible sur ce navigateur'); return; }
    toast('Copié : colle-le sur ton ordonnance');
    const lib = b.querySelector('span'); if (lib) { lib.textContent = 'Copié'; b.classList.add('ok'); setTimeout(() => { if (b.isConnected) { lib.textContent = 'Copier'; b.classList.remove('ok'); } }, 1600); }
  });
}
/* RCP de la forme choisie : seule la zone du RCP est redessinée à l'arrivée */
function chargerMonoMX(m) {
  const { cis } = etatFicheMX(m);
  if (!cis || MX.mono[cis] || MX.monoEtat[cis] === 'charge') return;
  MX.monoEtat[cis] = 'charge';
  const t = app.querySelector('#mxRub'); if (t && !t.querySelector('.roue')) t.insertAdjacentHTML('afterbegin', '<p class="sous" style="margin-top:10px"><span class="roue sombre"></span>Lecture du RCP officiel…</p>');
  fetch(IA_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'monographie', cis }) })
    .then(r => r.json()).then(j => { if (j.erreur) throw new Error(j.erreur); MX.mono[cis] = j; MX.monoEtat[cis] = 'ok'; })
    .catch(() => { MX.monoEtat[cis] = 'erreur'; })
    .finally(() => {
      if (vue !== 'medoc' || MX.cle !== m.cle) return;
      const e = etatFicheMX(m); if (e.cis !== cis) return;   // une autre forme a été choisie entre-temps
      majMorceauMX('#mxRub', rubHTML(e)); const c = $('#mxClasse'); if (c) c.innerHTML = classeHTML(e);
    });
}

/* ---------- Assistant : « posologie de l'amoxicilline pour un enfant de 11 kg » ---------- */
function reponsePosologieMX(texte) {
  const t = nMX(texte);
  if (!/posolog|\bdose|combien|mg\/kg|quelle quantite|\bml\b|par kilo|au poids|kg\b/.test(t)) return null;
  let cle = null;
  if (/amoxi/.test(t) && /clavulan|augmentin/.test(t)) cle = 'amoxicilline + clavulanique';
  else { for (const [mq, c] of Object.entries(MARQUES_MX)) if (t.includes(mq)) { cle = c; break; }
    if (!cle) cle = Object.keys(POSO_MX).find(k => !k.includes('+') && t.includes(k)) || null; }
  if (!cle) return null;
  const kgM = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilo)/), ageM = t.match(/(\d+)\s*(ans?|mois)\b/);
  const kg = kgM ? parseFloat(kgM[1].replace(',', '.')) : NaN;
  const enfant = (kg > 0 && kg < 40) || /enfant|bebe|nourrisson|fille|garcon|pediatr/.test(t) || (ageM && (ageM[2] === 'mois' || Number(ageM[1]) < 15));
  const qui = enfant ? 'enfant' : 'adulte';
  const schemas = (POSO_MX[cle] || []).filter(s => s.qui === qui);
  if (!schemas.length) return null;
  const m = MXI ? MXI.mol.get(cle) : null;
  if (!MXI) indexMX().catch(() => {});
  const concs = m ? concentrationsMX([...m.formes.keys()]) : [];
  const conc = enfant ? (concs.find(c => c.v >= 40) || concs[concs.length - 1] || null) : null;
  const nom = m ? m.nom : majMX(cle);
  const titre = enfant ? `${nom}, enfant${kg > 0 ? ` de ${String(kg).replace('.', ',')} kg` : ''}${ageM ? ` (${ageM[1]} ${ageM[2]})` : ''}` : `${nom}, adulte`;
  const lignes = schemas.map(s => { const r = calculMX(s, kg, conc); return `<li><b>${esc(s.t)}</b> : ${esc(r.ligne)} <span class="src">${esc(s.src)}</span></li>`; }).join('');
  const html = `<p><b>${esc(titre)}</b> : voici les posologies existantes, sans avoir besoin de l’infection.</p><ul class="rx">${lignes}</ul>`
    + (enfant && !(kg > 0) ? '<p class="sous" style="font-size:.86rem">Donne-moi le poids pour que je calcule les doses en mg et en mL.</p>' : '')
    + (enfant && kg > 0 && !conc ? '<p class="sous" style="font-size:.86rem">Les volumes en mL pour chaque suspension sont dans la fiche.</p>' : '')
    + `<button class="btn sec" data-mx="${esc(nom)}" style="margin-top:10px;width:100%">Ouvrir la fiche Médicodex</button>`;
  return { html, suite: '', brut: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), ia: false, requete: null };
}
