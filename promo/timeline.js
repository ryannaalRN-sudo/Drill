/* Drill — pub 30 s. Timeline Motion pilotée image par image (seek), 13 mesures à 104 BPM. */
const { animate } = Motion;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const B = 60 / 104, BAR = 4 * B;
const T = (bar, beat = 1) => (bar - 1) * BAR + (beat - 1) * B;
const DUREE = 30;
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
        for (const m of morceaux) { const s = document.createElement('span'); s.className = mode === 'c' ? 'c' : 'm'; s.textContent = m; frag.appendChild(s); }
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && c.tagName !== 'BR') parcours(c);
    }
  };
  parcours(el);
}

/* ---------------- constructeur de timeline (sauts nets entre segments) ---------------- */
let S = [];
const pistes = new Map();
const dureeRessort = (o, kf) => {
  const num = kf.every(v => typeof v === 'number');
  const obj = { v: num ? kf[0] : 0 };
  const { at: _a, ...oo } = o;
  const a = animate([[obj, { v: num ? kf : [0, 100] }, oo]], { autoplay: false });
  const d = a.duration; a.stop && a.stop();
  return d;
};
const elements = s => typeof s === 'string' ? $$(s) : Array.isArray(s) ? s.flatMap(elements) : (s instanceof NodeList ? [...s] : [s]);
const nomEl = el => el.id ? '#' + el.id : (typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : el.tagName);
function A(sujet, kfs, o = {}) {
  const liste = elements(sujet);
  if (!liste.length) console.warn('aucun élément', String(sujet));
  const pas = o.stagger || 0;
  liste.forEach((el, i) => {
    const at = (o.at || 0) + (o.depuisFin ? (liste.length - 1 - i) : i) * pas;
    for (const [prop, kf0] of Object.entries(kfs)) {
      const kf = Array.isArray(kf0) ? kf0 : [kf0];
      const base = {};
      for (const [k, v] of Object.entries(o)) if (!(k in kfs) && !['stagger', 'at', 'depuisFin'].includes(k)) base[k] = v;
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
    c.textContent = (t >= t0 && t < fixe) ? jeu[Math.floor(hasard(Math.floor(t * 38) * 13 + k * 7) * jeu.length)] : texte[k];
  }));
}
function curseur(sel, a, b) {
  const el = $(sel);
  parImage.push(t => { el.style.opacity = (t >= a && t < b) ? 1 : (Math.floor(t * 3.4) % 2 ? 0 : 1); });
}

/* ================= CONSTRUCTION ================= */
function construire() {
  $$('.sc').forEach(e => decoupe(e, 'c'));
  $$('.sm').forEach(e => decoupe(e, 'm'));

  /* décor : arcade, particules, poussière, grain */
  $('#arcade').innerHTML = Array.from({ length: 14 }, () => `<svg viewBox="0 0 18 22"><path class="base" d="${DENT}"/><path class="lum-d" d="${DENT}" opacity="0"/></svg>`).join('');
  const formes = ['plus', 'rond', 'anneau2', 'dent', 'plus', 'rond', 'dent', 'anneau2', 'plus', 'rond', 'dent', 'plus', 'rond', 'anneau2', 'plus', 'dent', 'rond', 'plus', 'rond', 'dent'];
  $('#parts').innerHTML = formes.map(f => {
    const inner = f === 'plus' ? '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 3v22M3 14h22" stroke="#E6FFFA" stroke-width="5" stroke-linecap="round"/></svg>'
      : f === 'dent' ? `<svg width="30" height="34" viewBox="0 0 18 22"><path d="${DENT}" fill="#E6FFFA"/></svg>` : '';
    return `<div class="part"><b class="${f === 'rond' || f === 'anneau2' ? f : ''}">${inner}</b></div>`;
  }).join('');
  $('#etincelles').innerHTML = Array.from({ length: 7 }, () => '<div class="etincelle"><i></i><i></i></div>').join('');
  $('#orbs').innerHTML = Array.from({ length: 9 }, () => '<div class="orb"></div>').join('');
  $('#orbes').innerHTML = ['#2BD0B0', '#4FD8F0', '#7FE3D3', '#8F86FF'].map(c => `<div class="orbe" style="background:radial-gradient(circle,#fff 0%,${c} 45%,transparent 72%);box-shadow:0 0 60px 20px ${c}"></div>`).join('');
  $('#poussiere').innerHTML = Array.from({ length: 54 }, () => '<i></i>').join('');
  (function () {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const x = c.getContext('2d'), im = x.createImageData(256, 256);
    let s = 1234567; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    x.putImageData(im, 0, 0); $('#grain').style.background = `url(${c.toDataURL()})`;
  })();
  // compteur à rouleaux « 96,14 € »
  $('#odo').innerHTML = [...'96,14 €'].map(ch => /\d/.test(ch)
    ? `<span class="col"><span class="bande">${Array.from({ length: 20 }, (_, k) => `<span>${k % 10}</span>`).join('')}</span></span>`
    : `<span class="fixe">${ch === ' ' ? '&nbsp;' : ch}</span>`).join('');

  /* tracé ECG : un battement sur les temps 1 et 3 des mesures 1-2 */
  const X = t => 80 + 940 * t / 4.4;
  const battements = [0, 2 * B, BAR, BAR + 2 * B];
  let d = 'M -40 100 ';
  for (const tb of battements) {
    const x = X(tb);
    d += `L ${x - 34} 100 L ${x - 22} 86 L ${x - 10} 100 L ${x - 2} 100 L ${x + 7} 12 L ${x + 17} 176 L ${x + 27} 100 L ${x + 46} 100 L ${x + 66} 78 L ${x + 88} 100 `;
  }
  d += 'L 1120 100';
  const chemin = $('#ecg-path'); chemin.setAttribute('d', d);
  const L = chemin.getTotalLength(), table = [];
  for (let k = 0; k <= 2400; k++) { const l = L * k / 2400; table.push([chemin.getPointAtLength(l).x, l]); }
  const longueurA = x => { let i = table.findIndex(e => e[0] >= x); if (i < 0) i = table.length - 1; return table[i][1]; };
  const tete = $('#tete-ecg');
  parImage.push(t => {
    const x = X(Math.min(t, 4.4)), l = longueurA(x), p = chemin.getPointAtLength(l);
    chemin.setAttribute('stroke-dashoffset', String(1 - l / L));
    tete.style.transform = `translate(${p.x}px,${p.y}px)`;
  });

  /* poussière en suspension */
  const grains = $$('#poussiere i').map((el, k) => ({ el, x: hasard(k + 1) * 1080, y: hasard(k + 101) * 1920, v: 14 + hasard(k + 201) * 40, a: hasard(k + 301) * 6.28, t: 2 + hasard(k + 401) * 6, o: 0.12 + hasard(k + 501) * 0.45 }));
  grains.forEach(g => { g.el.style.width = g.el.style.height = g.t + 'px'; g.el.style.opacity = g.o; if (g.t > 5) g.el.style.filter = 'blur(2px)'; });
  parImage.push(t => grains.forEach(g => {
    const y = ((g.y - g.v * t) % 1920 + 1920) % 1920, x = g.x + Math.sin(t * 0.6 + g.a) * 30;
    g.el.style.transform = `translate(${x}px,${y}px)`;
  }));

  /* ============ état initial ============ */
  ['#s2', '#s3', '#s4', '#s5', '#s6', '#s7', '#couche-feuille', '#marque', '#flare', '#flash', '#noir', '#f2', '#f3', '#f4', '#f5', '#f6', '#f7', '#orbes'].forEach(s => cache(s));
  A('#cam', { scale: [1, 1] }, { duration: 0.001, at: 0 });
  A('#tampon', { rotate: [-9, -9] }, { duration: 0.001, at: 0 });
  A(['#ray1', '#ray2', '#ray3'], { rotate: [18, 18] }, { duration: 0.001, at: 0 });
  A('#ray1', { x: [0, 320] }, { duration: DUREE, at: 0, ease: 'linear' });
  A('#ray2', { x: [0, -260] }, { duration: DUREE, at: 0, ease: 'linear' });
  A('#ray3', { x: [0, 240] }, { duration: DUREE, at: 0, ease: 'linear' });
  A('#lum1', { x: [0, 300], y: [0, 260] }, { duration: DUREE, at: 0, ease: 'linear' });
  A('#lum2', { x: [0, -320], y: [0, -340] }, { duration: DUREE, at: 0, ease: 'linear' });
  let c1 = '#0E9384', c2 = '#0A5E7A', o1 = .35, o2 = .3;
  const lum = (t, n1, n2, p1 = .35, p2 = .3) => { A('#lum1', { backgroundColor: [c1, n1], opacity: [o1, p1] }, { duration: .6, at: t, ease: 'easeInOut' }); A('#lum2', { backgroundColor: [c2, n2], opacity: [o2, p2] }, { duration: .6, at: t, ease: 'easeInOut' }); c1 = n1; c2 = n2; o1 = p1; o2 = p2; };
  const fondVers = (ancien, nouveau, t, d = 0.6) => { A(nouveau, { opacity: [0, 1] }, { duration: d, at: t, ease: 'easeInOut' }); if (ancien) A(ancien, { opacity: [1, 0] }, { duration: 0.001, at: t + d + 0.01 }); };
  const choc = (t, f = 1.03, d = 0.45) => A('#cam', { scale: [f, 1] }, { duration: d, at: t, ease: EXPO });

  /* ============ 1. ACCROCHE ============ */
  A('#legende', { opacity: [0, 1], y: [20, 0] }, { duration: 0.6, at: 0.25, ease: EXPO });
  efface('#legende', T(3) - 0.5, 0.3);
  const phrases = ['#p1', '#p2', '#p3', '#p4'];
  const tPhr = [0.0, T(1, 3), T(2, 1), T(2, 3)];
  phrases.forEach((p, k) => {
    const t0 = tPhr[k];
    A(`${p} .c`, { y: ['110%', '0%'], rotateX: k === 3 ? [-85, 0] : [0, 0], transformPerspective: [700, 700] }, { duration: 0.6, at: t0 + 0.02, stagger: k === 3 ? 0.03 : 0.016, ease: EXPO });
    cue(t0, 'phrase', k === 3 ? 1 : 0.8);
    // les phrases précédentes reculent dans la profondeur
    for (let j = 0; j < k; j++) {
      const n = k - j, n0 = n - 1;
      const op = [1, 0.34, 0.14, 0.06];
      A(phrases[j], { z: [-520 * n0, -520 * n], y: [-380 * n0, -380 * n], opacity: [op[n0], op[n]], filter: [`blur(${3 * n0}px)`, `blur(${3 * n}px)`] }, { duration: 0.6, at: t0 - 0.06, ease: DOUX });
    }
    if (k) cue(t0 - 0.06, 'recul', 0.6);
  });
  const qm = $$('#p4 .c').filter(c => c.textContent === '?');
  A(qm, { scale: [1, 1.35, 1], rotate: [0, -12, 0] }, { duration: 0.45, at: T(2, 4) - 0.05, ease: 'easeInOut' });
  cue(T(2, 4) - 0.05, 'tic', 1);
  A('#s1', { z: [0, 160] }, { duration: T(3) - 0.2 - T(2, 4), at: T(2, 4), ease: 'easeIn' });
  A('#s1', { x: [0, -7, 6, -5, 7, -4, 5, 0] }, { duration: 0.5, at: T(3) - 0.7, ease: 'linear' });
  A('#s1', { z: [160, 1500], filter: ['blur(0px)', 'blur(22px)'] }, { duration: 0.2, at: T(3) - 0.2, ease: ENTREE });
  efface('#s1', T(3) - 0.12, 0.1);
  A('#noir', { opacity: [0, 1] }, { duration: 0.1, at: T(3) - 0.12, ease: 'easeIn' });
  A('#noir', { opacity: [1, 0] }, { duration: 0.02, at: T(3) - 0.01 });

  /* ============ 2. LOGO ============ */
  const t3 = T(3);
  cue(t3, 'impact', 1);
  montre('#s2', t3 - 0.01);
  A('#f2', { opacity: [0, 1] }, { duration: 0.001, at: t3 - 0.01 });
  A('#flash', { opacity: [0.85, 0] }, { duration: 0.26, at: t3, ease: [0.1, 0.7, 0.3, 1] });
  A('#flare', { opacity: [0, 1, 0], scaleX: [0.2, 1.3, 1.8] }, { duration: 0.8, at: t3, ease: 'easeOut' });
  lum(t3, '#2BD0B0', '#0E9384', 0.45, 0.35);
  choc(t3, 1.045, 0.6);
  ['#an1', '#an2', '#an3'].forEach((a, k) => A(a, { scale: [0.3, 2.8 + k * 0.6], opacity: [0.9 - k * 0.2, 0] }, { duration: 1.1, at: t3 + k * 0.08, ease: EXPO }));
  $$('.part').forEach((p, i, arr) => {
    const a = (i / arr.length) * Math.PI * 2 + (i % 2 ? 0.2 : -0.12), r = 300 + (i % 5) * 80;
    A(p, { x: [0, Math.cos(a) * r], y: [0, Math.sin(a) * r * 0.9], rotate: [0, (i % 2 ? 1 : -1) * (120 + i * 12)] }, { duration: 1.6, at: t3 + 0.02, ease: EXPO });
    A(p, { opacity: [0, 1, 1, 0], scale: [0.4, 1.3, 1, 0.5] }, { duration: 1.7, at: t3 + 0.02, times: [0, 0.06, 0.7, 1] });
  });
  A('#trace-path', { strokeDashoffset: [1, 0] }, { duration: 0.65, at: t3 + 0.04, ease: EXPO });
  cue(t3 + 0.04, 'trace', 1);
  A('#ic-fond', { opacity: [0, 1] }, { duration: 0.15, at: t3 + 0.3 });
  A('#ic-fond', { scale: [0, 1] }, { ...RES(0.45, 0.55), at: t3 + 0.3 });
  A('#ic', { rotateY: [-70, 0], rotateZ: [-12, 0] }, { ...RES(0.35, 0.7), at: t3 + 0.25 });
  A('#ic-img', { opacity: [0, 1] }, { duration: 0.3, at: t3 + 0.6 });
  A('#ic-trace', { opacity: [1, 0] }, { duration: 0.3, at: t3 + 0.85 });
  A('#mot .c', { y: ['110%', '0%'], rotateX: [75, 0], transformPerspective: [900, 900] }, { duration: 0.7, at: T(3, 2) - 0.12, stagger: 0.05, ease: EXPO });
  cue(T(3, 2) - 0.12, 'lettres', 1);
  A('#brille1', { x: [-760, 760] }, { duration: 0.7, at: T(3, 3) + 0.1, ease: 'easeInOut' });
  cue(T(3, 3) + 0.1, 'brillance', 0.8);
  A('#signature .m', { opacity: [0, 1], y: [34, 0], filter: ['blur(8px)', 'blur(0px)'] }, { duration: 0.5, at: T(3, 3), stagger: 0.035, ease: EXPO });
  // le logo se range en haut à gauche
  const tR = T(4) - 0.56;
  efface('#signature', tR - 0.08, 0.2);
  A('#logo-g', { x: [0, -443], y: [0, -573], scale: [1, 0.19] }, { duration: 0.38, at: tR, ease: DOUX });
  efface('#mot', tR + 0.05, 0.2);
  efface('#logo-g', tR + 0.3, 0.08, 'linear');
  montre('#marque', tR + 0.3, 0.08);
  cue(tR, 'range', 0.7);
  efface('#s2', T(4) + 0.3, 0.2);

  /* ============ 3. PRESCRI'DENT ============ */
  const t4 = T(4);
  fondVers('#f2', '#f3', t4 - 0.35);
  lum(t4 - 0.35, '#0E9384', '#0A5E7A', 0.38, 0.3);
  montre('#s3', t4 - 0.4);
  const entete = (s, t) => {
    A(`${s} .num`, { x: [-260, 0], opacity: [0, 1] }, { duration: 0.9, at: t - 0.15, ease: EXPO });
    A(`${s} .titre-f .c`, { y: ['110%', '0%'], rotateX: [80, 0], transformPerspective: [700, 700] }, { duration: 0.65, at: t - 0.1, stagger: 0.022, ease: EXPO });
    A(`${s} .sous-f .m`, { opacity: [0, 1], y: [30, 0], filter: ['blur(8px)', 'blur(0px)'] }, { duration: 0.5, at: t + 0.2, stagger: 0.04, ease: EXPO });
    cue(t - 0.1, 'titre', 1);
  };
  const sortieEntete = (s, t) => {
    A(`${s} .titre-f .c`, { y: ['0%', '-110%'] }, { duration: 0.32, at: t, stagger: 0.012, ease: ENTREE });
    efface(`${s} .sous-f`, t, 0.25);
    A(`${s} .num`, { x: [0, 260], opacity: [1, 0] }, { duration: 0.4, at: t, ease: ENTREE });
  };
  entete('#s3', t4 - 0.12);
  choc(t4, 1.015, 0.3);
  A('#arcade svg', { scale: [0.3, 1], opacity: [0, 1] }, { duration: 0.4, at: t4 + 0.05, stagger: 0.022, ease: REBOND });
  // les cartes questions
  A('#c2', { z: [-170, -170], y: [-64, -64] }, { duration: 0.001, at: 0 });
  A('#c3', { z: [-340, -340], y: [-128, -128] }, { duration: 0.001, at: 0 });
  A('#cartes', { y: [1350, 0], rotateX: [45, 0] }, { ...RES(0.2, 0.6), at: t4 - 0.2 });
  cue(t4 - 0.2, 'cartes', 1);
  const dents = $$('#arcade .lum-d'), dentsSvg = $$('#arcade svg');
  const groupes = [[0, 5], [5, 10], [10, 14]];
  ['#c1', '#c2', '#c3'].forEach((c, k) => {
    const ta = T(4, 2 + k);
    A(`${c} .q-opt`, { scale: [1, 0.96, 1] }, { duration: 0.24, at: ta + 0.06, ease: 'easeInOut' });
    A(`${c} .sel`, { opacity: [0, 1] }, { duration: 0.18, at: ta + 0.12 });
    A(`${c} .ok`, { opacity: [0, 1], scale: [0.4, 1] }, { duration: 0.28, at: ta + 0.12, ease: REBOND });
    A(`${c} .boite path`, { strokeDashoffset: [1, 0] }, { duration: 0.26, at: ta + 0.16, ease: EXPO });
    cue(ta + 0.12, 'coche', 1);
    const [a, b] = groupes[k];
    for (let i = a; i < b; i++) {
      const td = ta + 0.2 + (i - a) * 0.04;
      A(dents[i], { opacity: [0, 1] }, { duration: 0.1, at: td });
      A(dentsSvg[i], { y: [0, -12, 0] }, { duration: 0.3, at: td, ease: 'easeOut' });
      cue(td, 'dent', i / 13);
    }
    if (k < 2) {
      const ts = T(4, 3 + k) - 0.14;
      A(c, { x: [0, -1250], rotateY: [0, -38], rotateZ: [0, -10] }, { duration: 0.34, at: ts, ease: ENTREE });
      cue(ts, 'balaye', 0.8);
      const suivantes = ['#c1', '#c2', '#c3'].slice(k + 1);
      suivantes.forEach((s2, j) => A(s2, { z: [-170 * (j + 1), -170 * j], y: [-64 * (j + 1), -64 * j] }, { duration: 0.34, at: ts + 0.02, ease: DOUX }));
    }
  });
  A(dentsSvg, { scale: [1, 1.18, 1] }, { duration: 0.32, at: T(4, 4) + 0.55, stagger: 0.015, ease: 'easeOut' });
  // l'ordonnance se dresse
  const t5 = T(5);
  A('#c3', { y: [0, -260], z: [0, 260], opacity: [1, 0] }, { duration: 0.3, at: t5 - 0.16, ease: ENTREE });
  efface('#arcade', t5 - 0.12, 0.3);
  montre('#couche-feuille', t5 - 0.16, 0.15);
  A('#feuille', { rotateX: [78, 6], y: [520, 0], z: [-200, 0] }, { ...RES(0.16, 0.7), at: t5 - 0.16 });
  cue(t5 - 0.16, 'feuille', 1);
  choc(t5, 1.012, 0.3);
  [['#ol1', t5 + 0.12], ['#ol2', T(5, 2) - 0.05], ['#ol3', T(5, 2) + 0.25], ['#ol4', T(5, 3) - 0.08]].forEach(([s, t]) => {
    A(s, { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'] }, { duration: 0.5, at: t, ease: EXPO });
    cue(t, 'ligne', 0.9);
  });
  A('#tampon', { scale: [2.8, 1], rotate: [-24, -9], opacity: [0, 1] }, { duration: 0.17, at: t5 + 0.52, ease: ENTREE });
  A('#feuille', { x: [0, -14, 10, -6, 3, 0] }, { duration: 0.3, at: t5 + 0.69, ease: 'linear' });
  cue(t5 + 0.69, 'tampon', 1);
  A('#rature', { scaleX: [0, 1] }, { duration: 0.3, at: T(5, 3) + 0.32, ease: EXPO });
  cue(T(5, 3) + 0.32, 'rature', 1);
  A('#ecarte', { scale: [0.5, 1], opacity: [0, 1] }, { duration: 0.35, at: T(5, 3) + 0.5, ease: REBOND });
  A('#rappel', { x: [-760, 0], rotateY: [40, 0], opacity: [0, 1] }, { duration: 0.6, at: T(5, 2) + 0.4, ease: EXPO });
  cue(T(5, 2) + 0.4, 'carte', 0.8);
  A('#src-has', { x: [220, 0], opacity: [0, 1], scale: [0.7, 1] }, { duration: 0.42, at: T(5, 4) - 0.3, ease: REBOND });
  cue(T(5, 4) - 0.3, 'ding', 0.8);
  // retournement : l'ordonnance devient celle du patient
  const t6 = T(6);
  sortieEntete('#s3', t6 - 0.48);
  efface(['#rappel', '#src-has'], t6 - 0.36, 0.22);
  A('#feuille', { rotateY: [0, 180], z: [0, 280, 0] }, { duration: 0.55, at: t6 - 0.42, ease: DOUX });
  cue(t6 - 0.42, 'flip', 1);
  efface('#s3', t6 + 0.1, 0.1);
  A('#feuille', { rotateX: [6, 40], y: [0, 230] }, { ...RES(0.12, 0.55), at: t6 + 0.14 });

  /* ============ 4. SCANNER ============ */
  fondVers('#f3', '#f4', t6 - 0.35);
  lum(t6 - 0.35, '#1B8FD0', '#0C4F8A', 0.4, 0.32);
  montre('#s4', t6 - 0.2);
  entete('#s4', t6 + 0.05);
  choc(t6, 1.015, 0.3);
  A('#coins', { scale: [1.3, 1], opacity: [0, 1] }, { duration: 0.4, at: t6 + 0.55, ease: REBOND });
  cue(t6 + 0.55, 'verrou', 1);
  A('#laser', { opacity: [0, 0] }, { duration: 0.001, at: 0 });
  A('#laser', { y: [0, 930] }, { duration: 1.25, at: T(6, 2) + 0.05, ease: 'easeInOut' });
  A('#laser', { opacity: [0, 1, 1, 0] }, { duration: 1.25, at: T(6, 2) + 0.05, times: [0, 0.08, 0.9, 1] });
  cue(T(6, 2) + 0.05, 'laser', 1);
  const tB1 = T(6, 3) - 0.12, tB2 = T(6, 3) + 0.14;
  A('#hw1 .boite-hw', { opacity: [0, 1], scaleX: [0.2, 1] }, { duration: 0.22, at: tB1, ease: EXPO });
  A('#hw2 .boite-hw', { opacity: [0, 1], scaleX: [0.2, 1] }, { duration: 0.22, at: tB2, ease: EXPO });
  cue(tB1, 'detect', 0.9); cue(tB2, 'detect', 1.1);
  [['#med1', tB1 - 0.04], ['#med2', tB2 - 0.04]].forEach(([carte, t]) => {
    A(carte, { clipPath: ['inset(0 100% 0 0 round 32px)', 'inset(0 0% 0 0 round 32px)'], opacity: [0, 1] }, { duration: 0.55, at: t + 0.62, ease: EXPO });
    cue(t + 0.62, 'carte', 0.7);
  });
  // (les envols sont ajoutés après mesure, voir plus bas)
  const t7 = T(7);
  A('#feuille', { y: [230, 1500], rotateX: [40, 78] }, { duration: 0.55, at: t7 - 0.05, ease: ENTREE });
  efface('#couche-feuille', t7 + 0.25, 0.2);
  cue(t7 - 0.05, 'whoosh', 0.7);
  choc(t7, 1.012, 0.3);
  A('#eb1', { opacity: [0, 1], x: [-40, 0] }, { duration: 0.4, at: t7 + 0.05, ease: EXPO });
  ['#rx1', '#rx2', '#rx3'].forEach((r, k) => {
    const t = t7 + 0.15 + k * 0.14;
    A(r, { x: [420, 0], rotateY: [-28, 0], opacity: [0, 1] }, { duration: 0.55, at: t, ease: EXPO });
    A(`${r} .etat`, { scale: [0.4, 1], opacity: [0, 1] }, { duration: 0.35, at: t + 0.25, ease: REBOND });
    cue(t + 0.25, k === 0 ? 'alerte' : 'tic', k === 0 ? 1 : 0.7);
  });
  A('#rx1 .etat', { scale: [1, 1.14, 1, 1.1, 1] }, { duration: 0.7, at: T(7, 2) + 0.3, ease: 'easeInOut' });
  A('#eb2', { opacity: [0, 1], x: [-40, 0] }, { duration: 0.4, at: T(7, 3) - 0.12, ease: EXPO });
  A('#av1', { x: [-520, 0], opacity: [0, 1] }, { duration: 0.5, at: T(7, 3), ease: EXPO });
  A('#av2', { x: [-520, 0], opacity: [0, 1] }, { duration: 0.5, at: T(7, 3) + 0.24, ease: EXPO });
  cue(T(7, 3), 'carte', 0.8); cue(T(7, 3) + 0.24, 'carte', 0.8);
  A('#src-ansm', { x: [220, 0], opacity: [0, 1], scale: [0.7, 1] }, { duration: 0.4, at: T(7, 4) - 0.36, ease: REBOND });
  cue(T(7, 4) - 0.36, 'ding', 0.8);
  // tout se replie en une ligne lumineuse
  const t8 = T(8);
  sortieEntete('#s4', t8 - 0.5);
  efface('#src-ansm', t8 - 0.5, 0.2);
  const pliables = ['#med1', '#med2', '#eb1', '#rx1', '#rx2', '#rx3', '#eb2', '#av1', '#av2'];
  pliables.forEach((s, k) => {
    const el = $(s), centreY = el.offsetTop + el.offsetHeight / 2;
    const t = t8 - 0.46 + (pliables.length - 1 - k) * 0.025;
    A(s, { y: [0, 534 - centreY], scaleY: [1, 0.03] }, { duration: 0.34, at: t, ease: ENTREE });
    efface(s, t + 0.26, 0.08, 'linear');
  });
  cue(t8 - 0.46, 'fusion', 1);
  efface('#s4', t8 + 0.1, 0.1);

  /* ============ 5. CODAGE ============ */
  fondVers('#f4', '#f5', t8 - 0.3);
  lum(t8 - 0.3, '#3FBFAE', '#0F4F57', 0.34, 0.28);
  montre('#s5', t8 - 0.2);
  cache(['#rech', '#revel']);
  A('#morphe', { opacity: [0, 1], scaleX: [0.1, 1] }, { duration: 0.18, at: t8 - 0.14, ease: EXPO });
  A('#morphe', { height: ['8px', '126px'], y: [0, -60], backgroundColor: ['#E9FFFB', '#FFFFFF'] }, { duration: 0.38, at: t8 + 0.06, ease: EXPO });
  cue(t8 + 0.06, 'barre', 1);
  montre('#rech', t8 + 0.3, 0.08);
  efface('#morphe', t8 + 0.36, 0.05, 'linear');
  entete('#s5', t8 + 0.05);
  choc(t8, 1.015, 0.3);
  frappe('#tape-rech', 'troisième molaire', t8 + 0.42, 0.85);
  curseur('#caret-rech', t8 + 0.3, t8 + 1.3);
  for (let k = 0; k < 17; k++) cue(t8 + 0.42 + k * 0.85 / 17, 'touche', 0.5);
  A('.res', { rotateX: [-75, 0], y: [90, 0], opacity: [0, 1] }, { duration: 0.55, at: T(8, 2) + 0.36, stagger: 0.09, ease: EXPO });
  for (let k = 0; k < 4; k++) cue(T(8, 2) + 0.36 + k * 0.09, 'cascade', 0.7 + k * 0.1);
  const plus = $('#r004 .plus'); const pc = [plus.offsetLeft + 38 + $('#resultats').offsetLeft, 180 + plus.offsetTop + 38 + $('#resultats').offsetTop];
  A('#tap5', { left: [pc[0], pc[0]], top: [pc[1], pc[1]] }, { duration: 0.001, at: 0 });
  cache('#tap5');
  A('#tap5', { scale: [0.4, 1.6], opacity: [0.9, 0] }, { duration: 0.45, at: T(8, 4) - 0.16, ease: EXPO });
  A('#r004 .v', { opacity: [0, 1], scale: [0.3, 1] }, { duration: 0.3, at: T(8, 4) - 0.14, ease: REBOND });
  A('#r004 .hl', { opacity: [0, 1] }, { duration: 0.2, at: T(8, 4) - 0.12 });
  cue(T(8, 4) - 0.16, 'tap', 1); cue(T(8, 4) - 0.12, 'coche', 0.9);
  const autres = $$('.res').filter(r => r.id !== 'r004');
  A(autres, { z: [0, -260], opacity: [1, 0.25], filter: ['blur(0px)', 'blur(5px)'] }, { duration: 0.4, at: T(8, 4) + 0.1, ease: DOUX });
  A('#r004', { z: [0, 140] }, { duration: 0.2, at: T(8, 4) + 0.1, ease: DOUX });
  // révélation du code
  const t9 = T(9);
  A('#r004', { z: [140, 900], opacity: [1, 0] }, { duration: 0.24, at: t9 - 0.26, ease: ENTREE });
  A(['#rech', '#resultats'], { y: [0, -260], opacity: [1, 0], filter: ['blur(0px)', 'blur(10px)'] }, { duration: 0.22, at: t9 - 0.26, ease: ENTREE });
  cue(t9 - 0.26, 'whoosh', 0.8);
  montre('#revel', t9 - 0.02, 0.06);
  rouleau('#gros-code', 'HBGD004', t9 - 0.02, t9 + 0.22, 0.075);
  A('#gros-code', { scale: [1.25, 1], filter: ['blur(10px)', 'blur(0px)'] }, { duration: 0.5, at: t9 - 0.02, ease: EXPO });
  A('#gros-code .c', { y: [0, -24, 0] }, { duration: 0.22, at: t9 + 0.22, stagger: 0.075, ease: 'easeOut' });
  cue(t9 - 0.02, 'roulette', 1);
  for (let k = 0; k < 7; k++) cue(t9 + 0.22 + k * 0.075, 'cran', 0.6 + k * 0.08);
  A('#souligne', { scaleX: [0, 1], opacity: [0, 1] }, { duration: 0.5, at: t9 + 0.72, ease: EXPO });
  choc(t9, 1.02, 0.35);
  const chiffres = [9, 6, 1, 4];
  $$('#odo .bande').forEach((bd, k) => A(bd, { y: ['0%', `-${(10 + chiffres[k]) * 5}%`] }, { duration: 1.1, at: T(9, 2) - 0.05 + k * 0.09, ease: SORTIE }));
  A('#odo', { opacity: [0, 1], y: [40, 0] }, { duration: 0.35, at: T(9, 2) - 0.08, ease: EXPO });
  cue(T(9, 2) - 0.05, 'odometre', 1);
  A('#lib-code .m', { opacity: [0, 1], y: [20, 0] }, { duration: 0.4, at: T(9, 3) + 0.1, stagger: 0.025, ease: EXPO });
  A('#seance', { opacity: [0, 1], y: [60, 0], scale: [0.85, 1] }, { duration: 0.5, at: T(9, 4) - 0.1, ease: REBOND });
  cue(T(9, 4) - 0.1, 'caisse', 1);
  A('#src-ccam', { x: [-220, 0], opacity: [0, 1], scale: [0.7, 1] }, { duration: 0.45, at: T(9, 4) + 0.15, ease: REBOND });
  cue(T(9, 4) + 0.15, 'ding', 0.8);
  // panoramique filé vers l'assistant
  const t10 = T(10);
  A('#s5', { x: [0, -1150], filter: ['blur(0px)', 'blur(30px)'] }, { duration: 0.34, at: t10 - 0.32, ease: ENTREE });
  efface('#s5', t10 + 0.02, 0.02, 'linear');
  cue(t10 - 0.32, 'whip', 1);

  /* ============ 6. ASSISTANT ============ */
  fondVers('#f5', '#f6', t10 - 0.28, 0.3);
  lum(t10 - 0.28, '#6A5BFF', '#3A2FA8', 0.42, 0.34);
  montre('#s6', t10 - 0.26);
  A('#s6', { x: [1150, 0], filter: ['blur(30px)', 'blur(0px)'] }, { duration: 0.4, at: t10 - 0.26, ease: SORTIE });
  entete('#s6', t10 + 0.05);
  choc(t10, 1.015, 0.3);
  cache(['#bmoi', '#avatar', '#brep', '#toast', '#orbs', '#etincelles', '#tap6']);
  const demande = 'Dent de sagesse du bas, incluse';
  frappe('#tape-ia', demande, t10 + 0.3, 0.95, T(10, 3) + 0.02);
  curseur('#caret-ia', t10, t10 + 1.3);
  for (let k = 0; k < demande.length; k += 2) cue(t10 + 0.3 + k * 0.95 / demande.length, 'touche', 0.45);
  A('#envoyer', { scale: [1, 0.82, 1] }, { duration: 0.24, at: T(10, 3) - 0.08, ease: 'easeInOut' });
  A('#tap6', { left: [948, 948], top: [1623, 1623] }, { duration: 0.001, at: 0 });
  A('#tap6', { scale: [0.4, 1.6], opacity: [0.9, 0] }, { duration: 0.45, at: T(10, 3) - 0.08, ease: EXPO });
  cue(T(10, 3) - 0.08, 'envoi', 1);
  A('#bmoi', { opacity: [0, 1] }, { duration: 0.12, at: T(10, 3) });
  A('#bmoi', { y: [1040, 0], scale: [0.6, 1] }, { ...RES(0.22, 0.5), at: T(10, 3) });
  A('#avatar', { scale: [0, 1], opacity: [0, 1] }, { duration: 0.4, at: T(10, 3) + 0.3, ease: REBOND });
  montre('#orbs', T(10, 3) + 0.3, 0.2);
  cue(T(10, 3) + 0.3, 'reflexion', 1);
  const orbes = $$('#orbs .orb');
  parImage.push(t => {
    const a = T(10, 3) + 0.3, b = T(11) + 0.15;
    const k = lisse(a, a + 0.3, t) * (1 - lisse(b - 0.25, b, t));
    orbes.forEach((o, i) => {
      const ang = t * (3.2 + (i % 3) * 0.7) + i * 0.7, r = 92 + 26 * Math.sin(t * 5 + i);
      o.style.transform = `translate(${125 + Math.cos(ang) * r}px,${775 + Math.sin(ang) * r * 0.85}px) scale(${0.5 + 0.5 * k})`;
      o.style.opacity = k * (0.5 + 0.5 * Math.sin(t * 9 + i));
    });
  });
  const t11 = T(11);
  efface('#orbs', t11 + 0.1, 0.1);
  A('#brep', { opacity: [0, 1] }, { duration: 0.15, at: t11 });
  A('#brep', { y: [90, 0], scale: [0.9, 1] }, { ...RES(0.2, 0.5), at: t11 });
  A('#brep .cr', { opacity: [0, 1], y: [26, 0] }, { duration: 0.45, at: t11 + 0.06, stagger: 0.1, ease: EXPO });
  rouleau('#code-ia', 'HBGD004', t11 + 0.12, t11 + 0.3, 0.05);
  cue(t11, 'magie', 1);
  choc(t11, 1.012, 0.3);
  $$('.etincelle').forEach((e, k) => {
    const x = 160 + k * 120 + (k % 2) * 30, y = 1080 + (k % 3 - 1) * 70;
    A(e, { left: [x, x], top: [y, y] }, { duration: 0.001, at: 0 });
    A(e, { scale: [0, 1.3, 0], rotate: [0, 90] }, { duration: 0.55, at: t11 + 0.42 + k * 0.05, ease: 'easeOut' });
  });
  montre('#etincelles', t11 + 0.4);
  const bouton = $('#btn-ajout'), brep = $('#brep');
  const bc = [brep.offsetLeft + bouton.offsetLeft + bouton.offsetWidth / 2, brep.offsetTop + bouton.offsetTop + bouton.offsetHeight / 2];
  A('#tap6', { left: [948, bc[0]], top: [1623, bc[1]] }, { duration: 0.001, at: T(11, 3) - 0.01 });
  A('#tap6', { scale: [0.4, 1.8], opacity: [0.9, 0] }, { duration: 0.45, at: T(11, 3) + 0.05, ease: EXPO });
  A('#btn-ajout', { scale: [1, 0.95, 1] }, { duration: 0.22, at: T(11, 3) + 0.02, ease: 'easeInOut' });
  cue(T(11, 3) + 0.05, 'tap', 1);
  A('#toast', { opacity: [0, 1], y: [50, 0] }, { duration: 0.45, at: T(11, 3) + 0.2, ease: REBOND });
  cue(T(11, 3) + 0.2, 'pop', 0.9);
  // implosion vers le final
  const t12 = T(12);
  A('#s6', { scale: [1, 0.04], filter: ['blur(0px)', 'blur(14px)'] }, { duration: 0.45, at: t12 - 0.47, ease: ENTREE });
  efface('#s6', t12 - 0.06, 0.05, 'linear');
  efface('#marque', t12 - 0.47, 0.25);
  cue(t12 - 0.5, 'implosion', 1);

  /* ============ 7. FIN ============ */
  montre('#orbes', t12 - 0.6, 0.15);
  const orbF = $$('#orbes .orbe');
  parImage.push(t => {
    const a = t12 - 0.6, b = t12;
    if (t < a || t > b + 0.05) return;
    const k = borne(a, b, t), e = k * k;
    orbF.forEach((o, i) => {
      const ang = i * Math.PI / 2 + e * Math.PI * 3, r = 760 * (1 - e);
      o.style.transform = `translate(${540 + Math.cos(ang) * r}px,${570 + Math.sin(ang) * r * 0.8}px) scale(${1.2 - 0.6 * e})`;
    });
  });
  efface('#orbes', t12, 0.05, 'linear');
  cue(t12, 'final', 1);
  montre('#s7', t12 - 0.01);
  A('#f7', { opacity: [1, 1] }, { duration: 0.001, at: t12 - 0.003 });
  A('#f7', { clipPath: ['circle(0% at 50% 30%)', 'circle(150% at 50% 30%)'] }, { duration: 0.8, at: t12, ease: EXPO });
  A('#flash', { opacity: [0.8, 0] }, { duration: 0.26, at: t12, ease: [0.1, 0.7, 0.3, 1] });
  A('#flare', { opacity: [0, 1, 0], scaleX: [0.2, 1.3, 1.8], y: [0, -90] }, { duration: 0.8, at: t12, ease: 'easeOut' });
  lum(t12, '#7FF5DD', '#0E9384', 0.3, 0.3);
  choc(t12, 1.04, 0.6);
  A('#an4', { scale: [0.4, 3.4], opacity: [0.9, 0] }, { duration: 1.0, at: t12, ease: EXPO });
  A('#fin-ic', { opacity: [0, 1] }, { duration: 0.12, at: t12 + 0.03 });
  A('#fin-ic', { scale: [0.2, 1], rotate: [25, 0] }, { ...RES(0.45, 0.6), at: t12 + 0.03 });
  A('#fin-mot .c', { y: ['110%', '0%'], rotateX: [75, 0], transformPerspective: [900, 900] }, { duration: 0.7, at: T(12, 2) - 0.15, stagger: 0.05, ease: EXPO });
  cue(T(12, 2) - 0.15, 'lettres', 0.9);
  A('#fin-slogan .ln>.in', { y: ['110%', '0%'] }, { duration: 0.7, at: T(12, 3) - 0.1, stagger: 0.1, ease: EXPO });
  cue(T(12, 3) - 0.1, 'phrase', 0.6);
  A('#fin-cta', { opacity: [0, 1] }, { duration: 0.2, at: T(12, 4) - 0.1 });
  A('#fin-cta', { y: [60, 0], scale: [0.8, 1] }, { ...RES(0.35, 0.5), at: T(12, 4) - 0.1 });
  cue(T(12, 4) - 0.1, 'pop', 1);
  A('#fin-plus', { opacity: [0, 1], y: [24, 0] }, { duration: 0.5, at: T(13) - 0.2, ease: EXPO });
  A('#fin-src', { opacity: [0, 1] }, { duration: 0.6, at: T(13) + 0.2, ease: 'easeOut' });
  A('#brille2', { x: [-760, 760] }, { duration: 0.8, at: T(13, 2), ease: 'easeInOut' });
  cue(T(13, 2), 'brillance', 0.7);
  A('#s7', { scale: [1, 1.04] }, { duration: DUREE - t12, at: t12, ease: 'linear' });
  A('#cam', { opacity: [1, 1] }, { duration: 0.001, at: DUREE });
}

/* les mots détectés s'envolent du papier vers leurs cartes : on mesure leur position réelle */
function envols() {
  const tA = T(6, 3) - 0.16, tB = T(6, 3) + 0.1;
  const mesure = (sel, t) => { tl.seek(t); const r = $(sel).getBoundingClientRect(); return [r.left + 10, r.top + r.height * 0.1]; };
  const p1 = mesure('#hw1', tA), p2 = mesure('#hw2', tB);
  tl.cancel ? tl.cancel() : tl.stop();
  [['#lev1', p1, tA, '#med1'], ['#lev2', p2, tB, '#med2']].forEach(([s, p, t, carte]) => {
    const cible = $(carte), cx = cible.offsetLeft + 150, cy = cible.offsetTop + 12;
    A(s, { left: [p[0], p[0]], top: [p[1], p[1]], opacity: [0, 0] }, { duration: 0.001, at: 0 });
    A(s, { opacity: [0, 1], scale: [0.7, 1.15] }, { duration: 0.18, at: t, ease: EXPO });
    A(s, { left: [p[0], cx], top: [p[1], cy], scale: [1.15, 0.9] }, { duration: 0.55, at: t + 0.2, ease: DOUX });
    efface(s, t + 0.72, 0.12, 'linear');
    cue(t, 'envol', 1);
  });
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
  envols();
  tl = animate(S, { autoplay: false });
  return allerA(0);
}).then(() => ({ duree: tl.duration, segments: S.length }));
