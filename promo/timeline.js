/* Drill — pub 35 s. Timeline Motion pilotée image par image (seek), 17 mesures à 90 BPM. */
const { animate } = Motion;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const B = 60 / 90, BAR = 4 * B;
const T = (bar, beat = 1) => (bar - 1) * BAR + (beat - 1) * B;
const DUREE = T(18);
const EXPO = [0.16, 1, 0.3, 1], DOUX = [0.65, 0, 0.35, 1], ENTREE = [0.7, 0, 0.84, 0], REBOND = [0.34, 1.56, 0.64, 1], SORTIE = [0.22, 1, 0.36, 1];
const RES = (b = 0.25, v = 0.5) => ({ type: 'spring', bounce: b, visualDuration: v });
const DENT = 'M7 2.5c-2.6 0-4.3 2-4.3 4.8 0 2.4 1 3.8 1.6 6 .6 2.3.8 7.8 2.6 7.8 1.6 0 1.6-5.2 3.1-5.2s1.5 5.2 3.1 5.2c1.8 0 2-5.5 2.6-7.8.6-2.2 1.6-3.6 1.6-6 0-2.8-1.7-4.8-4.3-4.8-1.4 0-2 .8-3 .8s-1.6-.8-3-.8z';

window.CUES = [];
const cue = (t, k, v = 1) => CUES.push({ t: +t.toFixed(4), k, v });

/* ---------------- découpage du texte ---------------- */
function decoupe(el, mode) {
  const parcours = (n) => {
    for (const c of [...n.childNodes]) {
      if (c.nodeType === 3) {
        const morceaux = mode === 'c' ? [...c.textContent] : c.textContent.split(/(\s+)/).filter(Boolean);
        const frag = document.createDocumentFragment();
        for (const m of morceaux) { const s = document.createElement('span'); s.className = mode; s.textContent = m; frag.appendChild(s); }
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') parcours(c);
    }
  };
  parcours(el);
}

/* ---------------- constructeur de timeline (sauts nets entre segments) ---------------- */
const S = [];
const pistes = new Map();
const dureeRessort = (o, kf) => {
  const num = kf.every(v => typeof v === 'number');
  const obj = { v: num ? kf[0] : 0 };
  const { at: _a, ...oo } = o;
  const a = animate([[obj, { v: num ? kf : [0, 100] }, oo]], { autoplay: false });
  const d = a.duration; a.stop && a.stop();
  return d;
};
const elements = s => typeof s === 'string' ? $$(s) : Array.isArray(s) ? s.flatMap(elements) : [s];
const nomEl = el => el.id ? '#' + el.id : (typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName);
function A(sujet, kfs, o = {}) {
  const liste = elements(sujet);
  if (!liste.length) console.warn('aucun élément', String(sujet));
  const pas = o.stagger || 0;
  liste.forEach((el, i) => {
    const at = (o.at || 0) + i * pas;
    for (const [prop, kf0] of Object.entries(kfs)) {
      const kf = Array.isArray(kf0) ? kf0 : [kf0];
      const base = {};
      for (const [k, v] of Object.entries(o)) if (!(k in kfs) && !['stagger', 'at'].includes(k)) base[k] = v;
      const spe = (o[prop] && typeof o[prop] === 'object' && !Array.isArray(o[prop])) ? o[prop] : {};
      const opts = { ...base, ...spe, at };
      const dur = opts.type === 'spring' ? dureeRessort(opts, kf) : (opts.duration ?? 0.3);
      if (!pistes.has(el)) pistes.set(el, {});
      const p = pistes.get(el), prev = p[prop];
      if (prev) {
        if (at < prev.fin - 1e-4) console.warn(`chevauchement ${nomEl(el)} ${prop} : début ${at.toFixed(3)} < fin ${prev.fin.toFixed(3)}`);
        if (String(prev.val) !== String(kf[0])) S.push([el, { [prop]: [prev.val, kf[0]] }, { duration: 0.001, at: Math.max(prev.fin, at - 0.002), ease: 'linear' }]);
      }
      S.push([el, { [prop]: kf }, opts]);
      p[prop] = { fin: at + dur, val: kf[kf.length - 1] };
    }
  });
}
const cache = (sel, t = 0) => A(sel, { opacity: [0, 0] }, { duration: 0.001, at: t });
const montre = (sel, t, d = 0.001) => A(sel, { opacity: [0, 1] }, { duration: d, at: t });
const efface = (sel, t, d = 0.3, ease = 'easeIn') => A(sel, { opacity: [1, 0] }, { duration: d, at: t, ease });

/* ---------------- effets calculés à chaque image ---------------- */
const parImage = [];
const hasard = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lisse = (a, b, t) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const borne = (a, b, t) => Math.max(0, Math.min(1, (t - a) / (b - a)));
function frappe(sel, texte, t0, dur, tFin = Infinity) {
  const el = $(sel);
  parImage.push(t => { el.textContent = t >= tFin ? '' : texte.slice(0, Math.round(borne(t0, t0 + dur, t) * texte.length)); });
}
function rouleau(sel, texte, t0, tPremier, pas) {
  const el = $(sel);
  el.innerHTML = [...texte].map(ch => `<span class="c">${ch}</span>`).join('');
  const cs = [...el.children];
  const jeu = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  parImage.push(t => cs.forEach((c, k) => {
    const fixe = tPremier + k * pas;
    c.textContent = (t >= t0 && t < fixe) ? jeu[Math.floor(hasard(Math.floor(t * 24) * 13 + k * 7) * jeu.length)] : texte[k];
  }));
}
function curseur(sel, a, b) {
  const el = $(sel);
  parImage.push(t => { el.style.opacity = (t >= a && t < b) ? 1 : (Math.floor(t * 2.6) % 2 ? 0 : 1); });
}

/* ================= CONSTRUCTION ================= */
function construire() {
  $$('.sc').forEach(e => decoupe(e, 'c'));
  $$('.sm').forEach(e => decoupe(e, 'm'));

  // progression de Prescri'Dent : 5 étapes numérotées reliées par une barre, comme dans l'appli
  $('#prog ol').innerHTML = Array.from({ length: 5 }, (_, k) => `<li><span class="num">${k + 1}</span><span class="cours"></span><span class="fait"><svg viewBox="0 0 24 24"><path pathLength="1" stroke-dasharray="1 1" stroke-dashoffset="1" d="m5 12.5 4.5 4.5L19 7"/></svg></span></li>`).join('');
  $('#parts').innerHTML = Array.from({ length: 14 }, () => '<div class="part"><b></b></div>').join('');
  $('#orbs').innerHTML = Array.from({ length: 8 }, () => '<div class="orb"></div>').join('');
  $('#orbes').innerHTML = ['#2BD0B0', '#4FD8F0', '#8F86FF'].map(c => `<div class="orbe" style="background:radial-gradient(circle,#fff 0%,${c} 45%,transparent 72%);box-shadow:0 0 60px 20px ${c}"></div>`).join('');
  $('#poussiere').innerHTML = Array.from({ length: 48 }, () => '<i></i>').join('');
  (function () {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), im = x.createImageData(256, 256);
    let s = 1234567; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); $('#grain').style.background = `url(${c.toDataURL()})`;
  })();
  $('#odo').innerHTML = [...'96,14 €'].map(ch => /\d/.test(ch)
    ? `<span class="col"><span class="bande">${Array.from({ length: 20 }, (_, k) => `<span>${k % 10}</span>`).join('')}</span></span>`
    : `<span class="fixe">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');

  const grains = $$('#poussiere i').map((el, k) => ({ el, x: hasard(k + 1) * 1080, y: hasard(k + 101) * 1920, v: 10 + hasard(k + 201) * 28, a: hasard(k + 301) * 6.28, t: 2 + hasard(k + 401) * 6, o: 0.1 + hasard(k + 501) * 0.4 }));
  grains.forEach(g => { g.el.style.width = g.el.style.height = g.t + 'px'; g.el.style.opacity = g.o; if (g.t > 5) g.el.style.filter = 'blur(2px)'; });
  parImage.push(t => grains.forEach(g => {
    const y = ((g.y - g.v * t) % 1920 + 1920) % 1920, x = g.x + Math.sin(t * 0.5 + g.a) * 30;
    g.el.style.transform = `translate(${x}px,${y}px)`;
  }));

  /* ============ état initial ============ */
  ['#s2', '#s3', '#s4', '#s5', '#s6', '#couche-feuille', '#marque', '#flare', '#flash', '#f2', '#f3', '#f4', '#f5', '#f6', '#orbes'].forEach(s => cache(s));
  A('#cam', { scale: [1, 1] }, { duration: 0.001, at: 0 });
  A(['#ray1', '#ray2', '#ray3'], { rotate: [18, 18] }, { duration: 0.001, at: 0 });
  A('#ray1', { x: [0, 300] }, { duration: DUREE, at: 0, ease: 'linear' });
  A('#ray2', { x: [0, -240] }, { duration: DUREE, at: 0, ease: 'linear' });
  A('#ray3', { x: [0, 220] }, { duration: DUREE, at: 0, ease: 'linear' });
  A('#lum1', { x: [0, 280], y: [0, 240] }, { duration: DUREE, at: 0, ease: 'linear' });
  A('#lum2', { x: [0, -300], y: [0, -320] }, { duration: DUREE, at: 0, ease: 'linear' });
  let c1 = '#0E9384', c2 = '#0A5E7A', o1 = .35, o2 = .3;
  const lum = (t, n1, n2, p1 = .35, p2 = .3) => { A('#lum1', { backgroundColor: [c1, n1], opacity: [o1, p1] }, { duration: .8, at: t, ease: 'easeInOut' }); A('#lum2', { backgroundColor: [c2, n2], opacity: [o2, p2] }, { duration: .8, at: t, ease: 'easeInOut' }); c1 = n1; c2 = n2; o1 = p1; o2 = p2; };
  const fondVers = (ancien, nouveau, t, d = 0.8) => { A(nouveau, { opacity: [0, 1] }, { duration: d, at: t, ease: 'easeInOut' }); if (ancien) A(ancien, { opacity: [1, 0] }, { duration: 0.001, at: t + d + 0.01 }); };
  const choc = (t, f = 1.02, d = 0.6) => A('#cam', { scale: [f, 1] }, { duration: d, at: t, ease: EXPO });
  const entete = (s, t) => {
    A(`${s} .titre-f .c`, { y: ['110%', '0%'], rotateX: [80, 0], transformPerspective: [700, 700] }, { duration: 0.8, at: t, stagger: 0.03, ease: EXPO });
    A(`${s} .sous-f .m`, { opacity: [0, 1], y: [30, 0], filter: ['blur(8px)', 'blur(0px)'] }, { duration: 0.7, at: t + 0.35, stagger: 0.06, ease: EXPO });
    cue(t, 'titre', 1);
  };
  const sortieEntete = (s, t) => {
    A(`${s} .titre-f .c`, { y: ['0%', '-110%'] }, { duration: 0.4, at: t, stagger: 0.015, ease: ENTREE });
    efface(`${s} .sous-f`, t, 0.35);
  };

  /* ============ 1. ACCROCHE (mesures 1-2) : trois faits, puis la question ============ */
  const faits = ['#fa1', '#fa2', '#fa3'];
  [0, T(1, 3), T(2, 1)].forEach((t0, k) => {
    A(`${faits[k]} .c`, { y: ['110%', '0%'] }, { duration: 0.8, at: t0 + 0.05, stagger: 0.022, ease: EXPO });
    cue(t0 + 0.05, 'fait', 1);
  });
  // les faits précédents restent, un peu atténués
  A('#fa1', { opacity: [1, 0.55] }, { duration: 0.6, at: T(1, 3), ease: 'easeInOut' });
  A('#fa2', { opacity: [1, 0.55] }, { duration: 0.6, at: T(2, 1), ease: 'easeInOut' });
  A('#fa1', { opacity: [0.55, 0.35] }, { duration: 0.6, at: T(2, 1), ease: 'easeInOut' });
  // ils s'effacent avant la question
  const tQ = T(2, 3);
  faits.forEach((f, k) => A(f, { y: [0, -90], filter: ['blur(0px)', 'blur(10px)'] }, { duration: 0.45, at: tQ - 0.35 + k * 0.06, ease: ENTREE }));
  A('#fa1', { opacity: [0.35, 0] }, { duration: 0.4, at: tQ - 0.35, ease: 'easeIn' });
  A('#fa2', { opacity: [0.55, 0] }, { duration: 0.4, at: tQ - 0.29, ease: 'easeIn' });
  A('#fa3', { opacity: [1, 0] }, { duration: 0.4, at: tQ - 0.23, ease: 'easeIn' });
  cue(tQ - 0.35, 'efface', 0.8);
  A('#q .c', { y: ['110%', '0%'], rotateX: [-80, 0], transformPerspective: [800, 800] }, { duration: 0.9, at: tQ + 0.12, stagger: 0.035, ease: EXPO });
  cue(tQ + 0.12, 'question', 1);
  // la question grossit puis traverse la caméra
  A('#q', { scale: [1, 1.06] }, { duration: T(3) - 0.3 - tQ, at: tQ, ease: 'easeIn' });
  A('#s1', { z: [0, 1400], filter: ['blur(0px)', 'blur(20px)'] }, { duration: 0.3, at: T(3) - 0.3, ease: ENTREE });
  efface('#s1', T(3) - 0.16, 0.15);
  cue(T(3) - 0.3, 'aspire', 1);

  /* ============ 2. LOGO (mesure 3) ============ */
  const t3 = T(3);
  montre('#s2', t3 - 0.02);
  A('#f2', { opacity: [0, 1] }, { duration: 0.25, at: t3 - 0.2 });
  A('#flash', { opacity: [0.6, 0] }, { duration: 0.3, at: t3, ease: [0.1, 0.7, 0.3, 1] });
  A('#flare', { opacity: [0, 0.9, 0], scaleX: [0.2, 1.2, 1.6] }, { duration: 1.0, at: t3, ease: 'easeOut' });
  lum(t3, '#2BD0B0', '#0E9384', 0.42, 0.32);
  choc(t3, 1.03, 0.8);
  cue(t3, 'logo', 1);
  ['#an1', '#an2'].forEach((a, k) => A(a, { scale: [0.3, 2.6 + k * 0.8], opacity: [0.8 - k * 0.25, 0] }, { duration: 1.4, at: t3 + k * 0.12, ease: EXPO }));
  $$('.part').forEach((p, i, arr) => {
    const a = (i / arr.length) * Math.PI * 2 + 0.2, r = 300 + (i % 4) * 70;
    A(p, { x: [0, Math.cos(a) * r], y: [0, Math.sin(a) * r * 0.9] }, { duration: 2.0, at: t3 + 0.02, ease: EXPO });
    A(p, { opacity: [0, 1, 1, 0], scale: [0.4, 1.2, 1, 0.4] }, { duration: 2.1, at: t3 + 0.02, times: [0, 0.06, 0.65, 1] });
  });
  A('#trace-path', { strokeDashoffset: [1, 0] }, { duration: 0.9, at: t3 + 0.05, ease: EXPO });
  A('#ic-fond', { opacity: [0, 1] }, { duration: 0.2, at: t3 + 0.45 });
  A('#ic-fond', { scale: [0, 1] }, { ...RES(0.35, 0.6), at: t3 + 0.45 });
  A('#ic', { rotateY: [-60, 0] }, { ...RES(0.3, 0.8), at: t3 + 0.4 });
  A('#ic-img', { opacity: [0, 1] }, { duration: 0.4, at: t3 + 0.8 });
  A('#ic-trace', { opacity: [1, 0] }, { duration: 0.4, at: t3 + 1.0 });
  A('#mot .c', { y: ['110%', '0%'], rotateX: [75, 0], transformPerspective: [900, 900] }, { duration: 0.9, at: T(3, 2) + 0.05, stagger: 0.07, ease: EXPO });
  cue(T(3, 2) + 0.05, 'lettres', 1);
  A('#signature .m', { opacity: [0, 1], y: [34, 0], filter: ['blur(8px)', 'blur(0px)'] }, { duration: 0.7, at: T(3, 3) + 0.1, stagger: 0.05, ease: EXPO });
  A('#brille1', { x: [-760, 760] }, { duration: 0.9, at: T(3, 4) - 0.1, ease: 'easeInOut' });
  cue(T(3, 4) - 0.1, 'brillance', 0.7);
  // le logo se range en haut à gauche, puis le titre suivant apparaît
  const tR = T(4) - 0.4;
  efface('#signature', tR - 0.1, 0.3);
  A('#logo-g', { x: [0, -443], y: [0, -573], scale: [1, 0.19] }, { duration: 0.5, at: tR, ease: DOUX });
  efface('#mot', tR, 0.25);
  efface('#logo-g', tR + 0.42, 0.08, 'linear');
  montre('#marque', tR + 0.42, 0.08);
  cue(tR, 'range', 0.7);
  efface('#s2', T(4) + 0.3, 0.2);

  /* ============ 3. PRESCRI'DENT : les questions (mesures 4-6) ============ */
  const t4 = T(4);
  fondVers('#f2', '#f3', t4 - 0.3);
  lum(t4 - 0.3, '#0E9384', '#0A5E7A', 0.36, 0.3);
  montre('#s3', t4 + 0.05);
  entete('#s3', t4 + 0.12);
  cache('#prog .cours'); cache('#prog .fait'); A('#prog .rail i', { scaleX: [0, 0] }, { duration: 0.001, at: 0 });
  A('#prog .rail', { scaleX: [0, 1] }, { duration: 0.7, at: t4 + 0.45, ease: EXPO });
  A('#prog li', { scale: [0.3, 1], opacity: [0, 1] }, { duration: 0.5, at: t4 + 0.5, stagger: 0.07, ease: REBOND });
  const lis = $$('#prog li'), cours = $$('#prog .cours'), pleins = $$('#prog .fait'), coches = $$('#prog .fait path');
  A(cours[0], { opacity: [0, 1], scale: [0.7, 1] }, { duration: 0.3, at: t4 + 0.5, ease: REBOND });
  // une étape cochée : la pastille se remplit, la coche se trace, la barre avance, l'étape suivante s'allume
  const valider = (i, td) => {
    A(cours[i], { opacity: [1, 0] }, { duration: 0.12, at: td });
    A(pleins[i], { opacity: [0, 1] }, { duration: 0.12, at: td });
    A(pleins[i], { scale: [0.5, 1.18, 1] }, { duration: 0.42, at: td, ease: 'easeOut' });
    A(coches[i], { strokeDashoffset: [1, 0] }, { duration: 0.3, at: td + 0.08, ease: EXPO });
    A(lis[i], { y: [0, -14, 0] }, { duration: 0.38, at: td, ease: 'easeOut' });
    if (i < 4) {
      A('#prog .rail i', { scaleX: [i / 4, (i + 1) / 4] }, { duration: 0.35, at: td + 0.05, ease: EXPO });
      A(cours[i + 1], { opacity: [0, 1], scale: [0.7, 1] }, { duration: 0.3, at: td + 0.3, ease: REBOND });
    }
    cue(td, 'dent', i / 4);
  };
  const cartes = ['#c1', '#c2', '#c3'];
  cartes.forEach((c, k) => {
    const te = k === 0 ? T(4) + 0.45 : T(4 + k) - 0.1;
    const ta = T(4 + k, 2) + 0.15;
    A(c, { opacity: [0, 1] }, { duration: 0.3, at: te });
    A(c, k === 0 ? { y: [500, 0], rotateX: [35, 0] } : { x: [700, 0], rotateY: [35, 0] }, { duration: 0.7, at: te, ease: EXPO });
    cue(te, 'carte', 0.8);
    A(`${c} .q-opt`, { scale: [1, 0.96, 1] }, { duration: 0.3, at: ta - 0.05, ease: 'easeInOut' });
    A(`${c} .sel`, { opacity: [0, 1] }, { duration: 0.22, at: ta });
    A(`${c} .ok`, { opacity: [0, 1], scale: [0.4, 1] }, { duration: 0.35, at: ta, ease: REBOND });
    A(`${c} .boite path`, { strokeDashoffset: [1, 0] }, { duration: 0.35, at: ta + 0.05, ease: EXPO });
    cue(ta, 'coche', 1);
    // la carte « Question 3 » arrive : la question 2 est déjà passée ; idem pour la 4 avant la 5
    if (k > 0) valider(2 * k - 1, te + 0.25);
    valider(2 * k, ta + 0.2);
    // la carte sort avant que la suivante n'entre : jamais deux textes l'un sur l'autre
    const ts = T(5 + k) - 0.55;
    A(c, k < 2 ? { x: [0, -900], rotateY: [0, -30] } : { y: [0, -200] }, { duration: 0.38, at: ts, ease: ENTREE });
    A(c, { opacity: [1, 0] }, { duration: 0.25, at: ts + 0.1 });
  });

  /* ============ 3 bis. L'ORDONNANCE (mesures 7-9) ============ */
  const t7 = T(7);
  sortieEntete('#s3', t7 - 0.5);
  efface('#prog', t7 - 0.5, 0.35);
  montre('#couche-feuille', t7 - 0.3, 0.2);
  A('#feuille', { rotateX: [70, 4], y: [600, 0] }, { ...RES(0.14, 0.8), at: t7 - 0.3 });
  cue(t7 - 0.3, 'feuille', 1);
  [['#ol1', T(7, 2)], ['#ol2', T(7, 4)], ['#ol3', T(8, 2)]].forEach(([s, t]) => {
    A(s, { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'] }, { duration: 0.7, at: t, ease: EXPO });
    cue(t, 'ligne', 0.9);
  });
  A('#tampon', { scale: [2.4, 1], rotate: [-18, -7], opacity: [0, 1] }, { duration: 0.22, at: T(8, 3) + 0.2, ease: ENTREE });
  A('#feuille', { x: [0, -10, 7, -4, 0] }, { duration: 0.3, at: T(8, 3) + 0.42, ease: 'linear' });
  cue(T(8, 3) + 0.42, 'tampon', 1);
  A('#rappel', { y: [100, 0], opacity: [0, 1] }, { duration: 0.7, at: T(8, 4) + 0.25, ease: EXPO });
  cue(T(8, 4) + 0.25, 'carte', 0.8);
  A('#sources-p', { y: [60, 0], opacity: [0, 1] }, { duration: 0.7, at: T(9) + 0.15, ease: EXPO });
  A('#sources-p .sl', { opacity: [0, 1], x: [-30, 0] }, { duration: 0.5, at: T(9) + 0.45, stagger: 0.3, ease: EXPO });
  cue(T(9) + 0.15, 'sources', 1);
  // retournement : l'ordonnance devient celle du patient
  const t10 = T(10);
  efface(['#rappel', '#sources-p'], t10 - 0.55, 0.3);
  A('#feuille', { rotateY: [0, 180], z: [0, 260, 0], y: [0, 260] }, { duration: 0.75, at: t10 - 0.45, ease: DOUX });
  cue(t10 - 0.45, 'flip', 1);
  efface('#s3', t10 + 0.1, 0.1);
  A('#feuille', { rotateX: [4, 22] }, { ...RES(0.12, 0.6), at: t10 + 0.3 });

  /* ============ 4. SCANNER (mesures 10-12) ============ */
  fondVers('#f3', '#f4', t10 - 0.4);
  lum(t10 - 0.4, '#1B8FD0', '#0C4F8A', 0.4, 0.32);
  montre('#s4', t10 - 0.05);
  entete('#s4', t10 + 0.1);
  A('#coins', { scale: [1.3, 1], opacity: [0, 1] }, { duration: 0.45, at: t10 + 0.65, ease: REBOND });
  cue(t10 + 0.65, 'verrou', 1);
  A('#laser', { opacity: [0, 0] }, { duration: 0.001, at: 0 });
  A('#laser', { y: [0, 740] }, { duration: 1.7, at: T(10, 2) + 0.25, ease: 'easeInOut' });
  A('#laser', { opacity: [0, 1, 1, 0] }, { duration: 1.7, at: T(10, 2) + 0.25, times: [0, 0.08, 0.9, 1] });
  cue(T(10, 2) + 0.25, 'laser', 1);
  const tB1 = T(10, 3) + 0.1, tB2 = T(10, 3) + 0.55;
  A('#hw1 .boite-hw', { opacity: [0, 1], scaleX: [0.2, 1] }, { duration: 0.3, at: tB1, ease: EXPO });
  A('#hw2 .boite-hw', { opacity: [0, 1], scaleX: [0.2, 1] }, { duration: 0.3, at: tB2, ease: EXPO });
  cue(tB1, 'detect', 0.9); cue(tB2, 'detect', 1.1);
  const t11 = T(11);
  A('#feuille', { y: [260, 1700], rotateX: [22, 60] }, { duration: 0.65, at: t11 - 0.35, ease: ENTREE });
  efface('#couche-feuille', t11 + 0.1, 0.2);
  cue(t11 - 0.35, 'whoosh', 0.7);
  [['#med1', t11 + 0.15], ['#med2', t11 + 0.6]].forEach(([s, t]) => {
    A(s, { clipPath: ['inset(0 100% 0 0 round 32px)', 'inset(0 0% 0 0 round 32px)'], opacity: [0, 1] }, { duration: 0.8, at: t, ease: EXPO });
    cue(t, 'carte', 0.8);
  });
  A('#eb1', { opacity: [0, 1], x: [-40, 0] }, { duration: 0.5, at: T(11, 3) - 0.1, ease: EXPO });
  ['#rx1', '#rx2', '#rx3'].forEach((r, k) => {
    const t = T(11, 3) + 0.15 + k * 0.55;
    A(r, { x: [300, 0], opacity: [0, 1] }, { duration: 0.65, at: t, ease: EXPO });
    A(`${r} .etat`, { scale: [0.5, 1], opacity: [0, 1] }, { duration: 0.45, at: t + 0.3, ease: REBOND });
    cue(t + 0.3, k === 0 ? 'alerte' : 'ok', 1);
  });
  A('#sources-s', { y: [60, 0], opacity: [0, 1] }, { duration: 0.7, at: T(12, 2) - 0.1, ease: EXPO });
  A('#sources-s .sl', { opacity: [0, 1], x: [-30, 0] }, { duration: 0.5, at: T(12, 2) + 0.2, stagger: 0.3, ease: EXPO });
  cue(T(12, 2) - 0.1, 'sources', 1);
  // tout se replie en une ligne qui devient le champ de saisie
  const t13 = T(13);
  sortieEntete('#s4', t13 - 0.6);
  const pliables = ['#med1', '#med2', '#eb1', '#rx1', '#rx2', '#rx3', '#sources-s'];
  pliables.forEach((s, k) => {
    const el = $(s), cy = el.offsetTop + el.offsetHeight / 2;
    const t = t13 - 0.58 + (pliables.length - 1 - k) * 0.03;
    A(s, { y: [0, 540 - cy], scaleY: [1, 0.03] }, { duration: 0.4, at: t, ease: ENTREE });
    efface(s, t + 0.3, 0.08, 'linear');
  });
  cue(t13 - 0.58, 'replie', 1);
  efface('#s4', t13 + 0.1, 0.1);

  /* ============ 5. CODAGE CCAM (mesures 13-15) ============ */
  fondVers('#f4', '#f5', t13 - 0.4);
  lum(t13 - 0.4, '#6A5BFF', '#3A2FA8', 0.42, 0.34);
  montre('#s5', t13 - 0.2);
  cache(['#saisie', '#envoyer', '#rep', '#orbs', '#tap']);
  A('#morphe', { opacity: [0, 1], scaleX: [0.1, 1] }, { duration: 0.2, at: t13 - 0.18, ease: EXPO });
  A('#morphe', { height: ['8px', '126px'], y: [0, -56], backgroundColor: ['#F1EEFF', '#FFFFFF'] }, { duration: 0.45, at: t13 + 0.05, ease: EXPO });
  cue(t13 + 0.05, 'ouvre', 1);
  montre(['#saisie', '#envoyer'], t13 + 0.42, 0.1);
  efface('#morphe', t13 + 0.5, 0.05, 'linear');
  entete('#s5', t13 + 0.1);
  const demande = 'Dent de sagesse du bas, incluse';
  frappe('#tape', demande, t13 + 0.7, 1.4);
  curseur('#caret', t13 + 0.5, t13 + 2.2);
  for (let k = 0; k < demande.length; k += 2) cue(t13 + 0.7 + k * 1.4 / demande.length, 'touche', 0.45);
  const tEnv = T(13, 4);
  A('#envoyer', { scale: [1, 0.82, 1] }, { duration: 0.26, at: tEnv - 0.05, ease: 'easeInOut' });
  A('#tap', { scale: [0.4, 1.6], opacity: [0.9, 0] }, { duration: 0.5, at: tEnv - 0.05, ease: EXPO });
  cue(tEnv - 0.05, 'envoi', 1);
  montre('#orbs', tEnv + 0.1, 0.2);
  cue(tEnv + 0.1, 'reflexion', 1);
  const orbes = $$('#orbs .orb');
  const t14 = T(14);
  parImage.push(t => {
    const a = tEnv + 0.1, b = t14 + 0.1;
    const k = lisse(a, a + 0.3, t) * (1 - lisse(b - 0.3, b, t));
    orbes.forEach((o, i) => {
      const ang = t * (2.6 + (i % 3) * 0.5) + i * 0.8, r = 110 + 30 * Math.sin(t * 4 + i);
      o.style.transform = `translate(${540 + Math.cos(ang) * r}px,${900 + Math.sin(ang) * r * 0.7}px) scale(${0.5 + 0.5 * k})`;
      o.style.opacity = k * (0.55 + 0.45 * Math.sin(t * 7 + i));
    });
  });
  efface('#orbs', t14 + 0.1, 0.1);
  A('#rep', { opacity: [0, 1] }, { duration: 0.25, at: t14 });
  A('#rep', { y: [120, 0], scale: [0.92, 1] }, { ...RES(0.18, 0.6), at: t14 });
  cue(t14, 'reponse', 1);
  choc(t14, 1.015, 0.5);
  A('#rep .intro', { opacity: [0, 1], y: [20, 0] }, { duration: 0.5, at: t14 + 0.1, ease: EXPO });
  rouleau('#code', 'HBGD004', t14 + 0.2, t14 + 0.55, 0.1);
  A('#code', { opacity: [0, 1] }, { duration: 0.15, at: t14 + 0.2 });
  A('#code .c', { y: [0, -18, 0] }, { duration: 0.25, at: t14 + 0.55, stagger: 0.1, ease: 'easeOut' });
  cue(t14 + 0.2, 'roulette', 1);
  for (let k = 0; k < 7; k++) cue(t14 + 0.55 + k * 0.1, 'cran', 0.6 + k * 0.08);
  A('#trait-code', { scaleX: [0, 1], opacity: [0, 1] }, { duration: 0.6, at: t14 + 1.25, ease: EXPO });
  const chiffres = [9, 6, 1, 4];
  A('#odo', { opacity: [0, 1] }, { duration: 0.3, at: T(14, 3) - 0.1 });
  $$('#odo .bande').forEach((bd, k) => A(bd, { y: ['0%', `-${(10 + chiffres[k]) * 5}%`] }, { duration: 1.3, at: T(14, 3) - 0.1 + k * 0.1, ease: SORTIE }));
  cue(T(14, 3) - 0.1, 'odometre', 1);
  A('#rep .lib', { opacity: [0, 1], y: [20, 0] }, { duration: 0.6, at: T(14, 4) - 0.1, ease: EXPO });
  A('#rep .base', { opacity: [0, 1], scale: [0.8, 1] }, { duration: 0.45, at: T(14, 4) + 0.25, ease: REBOND });
  cue(T(14, 4) + 0.25, 'ding', 0.8);
  A('#code', { scale: [1, 1.05, 1] }, { duration: 0.5, at: T(15) + 0.05, ease: 'easeInOut' });
  cue(T(15) + 0.05, 'valide', 1);

  /* ============ 6. FIN (mesures 16-17) ============ */
  const t16 = T(16);
  A('#s5', { scale: [1, 0.05], filter: ['blur(0px)', 'blur(14px)'] }, { duration: 0.5, at: t16 - 0.5, ease: ENTREE });
  efface('#s5', t16 - 0.08, 0.06, 'linear');
  efface('#marque', t16 - 0.5, 0.3);
  cue(t16 - 0.55, 'implosion', 1);
  montre('#orbes', t16 - 0.6, 0.15);
  const orbF = $$('#orbes .orbe');
  parImage.push(t => {
    const a = t16 - 0.6, b = t16;
    if (t < a || t > b + 0.05) return;
    const k = borne(a, b, t), e = k * k;
    orbF.forEach((o, i) => {
      const ang = i * Math.PI * 2 / 3 + e * Math.PI * 2.5, r = 700 * (1 - e);
      o.style.transform = `translate(${540 + Math.cos(ang) * r}px,${570 + Math.sin(ang) * r * 0.8}px) scale(${1.2 - 0.6 * e})`;
    });
  });
  efface('#orbes', t16, 0.05, 'linear');
  cue(t16, 'final', 1);
  montre('#s6', t16 - 0.01);
  A('#f6', { opacity: [1, 1] }, { duration: 0.001, at: t16 - 0.003 });
  A('#f6', { clipPath: ['circle(0% at 50% 30%)', 'circle(150% at 50% 30%)'] }, { duration: 1.0, at: t16, ease: EXPO });
  A('#flash', { opacity: [0.55, 0] }, { duration: 0.3, at: t16, ease: [0.1, 0.7, 0.3, 1] });
  A('#flare', { opacity: [0, 0.9, 0], scaleX: [0.2, 1.2, 1.6], y: [0, -90] }, { duration: 1.0, at: t16, ease: 'easeOut' });
  lum(t16, '#7FF5DD', '#0E9384', 0.3, 0.3);
  choc(t16, 1.03, 0.8);
  A('#an3', { scale: [0.4, 3.2], opacity: [0.8, 0] }, { duration: 1.3, at: t16, ease: EXPO });
  A('#fin-ic', { opacity: [0, 1] }, { duration: 0.2, at: t16 + 0.05 });
  A('#fin-ic', { scale: [0.2, 1], rotate: [20, 0] }, { ...RES(0.35, 0.7), at: t16 + 0.05 });
  A('#fin-mot .c', { y: ['110%', '0%'], rotateX: [75, 0], transformPerspective: [900, 900] }, { duration: 0.9, at: T(16, 2) - 0.1, stagger: 0.07, ease: EXPO });
  cue(T(16, 2) - 0.1, 'lettres', 0.9);
  A('#fin-slogan .ln>.in', { y: ['110%', '0%'] }, { duration: 0.9, at: T(16, 3) - 0.1, stagger: 0.14, ease: EXPO });
  A('#fin-cta', { opacity: [0, 1] }, { duration: 0.25, at: T(16, 4) + 0.05 });
  A('#fin-cta', { y: [60, 0], scale: [0.85, 1] }, { ...RES(0.3, 0.55), at: T(16, 4) + 0.05 });
  cue(T(16, 4) + 0.05, 'pop', 1);
  A('#fin-plus', { opacity: [0, 1], y: [24, 0] }, { duration: 0.6, at: T(17) + 0.1, ease: EXPO });
  A('#fin-src', { opacity: [0, 1] }, { duration: 0.8, at: T(17, 2), ease: 'easeOut' });
  A('#brille2', { x: [-760, 760] }, { duration: 1.0, at: T(17, 3), ease: 'easeInOut' });
  cue(T(17, 3), 'brillance', 0.6);
  A('#s6', { scale: [1, 1.035] }, { duration: DUREE - t16, at: t16, ease: 'linear' });
  A('#cam', { opacity: [1, 1] }, { duration: 0.001, at: DUREE });
}

window.surImage = (t) => {
  for (const f of parImage) f(t);
  const f = Math.floor(t * 24), a = (f * 7919) % 256, b = (f * 104729) % 256;
  $('#grain').style.transform = `translate(${a - 128}px,${b - 128}px)`;
};
let tl;
window.allerA = (t) => new Promise(r => { tl.seek(t); surImage(t); requestAnimationFrame(() => requestAnimationFrame(r)); });
window.pret = document.fonts.ready.then(() => Promise.all([
  document.fonts.load('800 100px "Bricolage Grotesque"'), document.fonts.load('700 30px "Bricolage Grotesque"'),
  document.fonts.load('700 30px "Atkinson Hyperlegible"'), document.fonts.load('400 30px "Atkinson Hyperlegible"'),
  document.fonts.load('600 60px "Caveat"'), ...$$('img').map(i => i.decode().catch(() => {}))
])).then(() => {
  construire();
  tl = animate(S, { autoplay: false });
  return allerA(0);
}).then(() => ({ duree: tl.duration, segments: S.length }));
