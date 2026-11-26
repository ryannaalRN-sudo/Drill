const { animate } = Motion;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const B = 60 / 128, BAR = 4 * B;
const T = (bar, beat = 1) => (bar - 1) * BAR + (beat - 1) * B;
const DUREE = 15;
const EXPO = [0.16, 1, 0.3, 1], DOUX = [0.65, 0, 0.35, 1], ENTREE = [0.7, 0, 0.84, 0], REBOND = [0.34, 1.56, 0.64, 1];
const RES = (b = 0.25, v = 0.5) => ({ type: 'spring', bounce: b, visualDuration: v });

/* Indices sonores pour la bande-son */
window.CUES = [];
const cue = (t, k, v = 1) => CUES.push({ t: +t.toFixed(4), k, v });

/* ---------- décor généré ---------- */
const DENT = 'M7 2.5c-2.6 0-4.3 2-4.3 4.8 0 2.4 1 3.8 1.6 6 .6 2.3.8 7.8 2.6 7.8 1.6 0 1.6-5.2 3.1-5.2s1.5 5.2 3.1 5.2c1.8 0 2-5.5 2.6-7.8.6-2.2 1.6-3.6 1.6-6 0-2.8-1.7-4.8-4.3-4.8-1.4 0-2 .8-3 .8s-1.6-.8-3-.8z';
$('#arcade').innerHTML = Array.from({ length: 14 }, (_, k) => `<svg viewBox="0 0 18 22" class="${k < 11 ? 'on' : ''}"><path d="${DENT}"/></svg>`).join('');
$$('#arcade svg').slice(11).forEach(s => { s.innerHTML += `<path class="lum" d="${DENT}" fill="#0E9384" opacity="0"/>`; });

(function () {
  const px = t => 40 + t / (2 * BAR) * 1000;
  let d = 'M -20 100 ';
  for (const t of [0, 2 * B, BAR, BAR + 2 * B]) {
    const x = px(t) + 40;
    d += `L ${x - 30} 100 L ${x - 18} 88 L ${x - 8} 100 L ${x} 100 L ${x + 8} 20 L ${x + 18} 170 L ${x + 28} 100 L ${x + 44} 100 L ${x + 62} 80 L ${x + 82} 100 `;
  }
  d += 'L 1100 100';
  $('#ecg-path').setAttribute('d', d);
})();

(function () {
  const formes = ['plus', 'rond', 'anneau', 'dent', 'plus', 'rond', 'dent', 'anneau', 'plus', 'rond', 'dent', 'plus', 'rond', 'anneau', 'plus', 'dent'];
  $('#parts').innerHTML = formes.map(f => {
    const inner = f === 'plus' ? '<svg width="28" height="28" viewBox="0 0 28 28"><path d="M14 3v22M3 14h22" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>'
      : f === 'dent' ? `<svg width="30" height="34" viewBox="0 0 18 22"><path d="${DENT}" fill="#E6FFFA"/></svg>` : '';
    return `<div class="part"><b class="${f === 'rond' ? 'rond' : f === 'anneau' ? 'anneau' : ''}">${inner}</b></div>`;
  }).join('');
})();

(function () {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d'), im = x.createImageData(256, 256);
  let s = 1234567; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < im.data.length; i += 4) { const v = r() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0);
  $('#grain').style.background = `url(${c.toDataURL()})`;
})();

/* ---------- constructeur de timeline ----------
   Chaque segment est éclaté par élément et par propriété.
   Motion interpole entre deux segments d'une même propriété : quand la valeur
   de départ diffère de la valeur d'arrivée précédente, on insère un saut net. */
const S = [];
const pistes = new Map();
const dureeRessort = (o, kf) => {
  const num = kf.every(v => typeof v === 'number');
  const obj = { v: num ? kf[0] : 0 };
  const { at: _at, ...oo } = o;
  const a = animate([[obj, { v: num ? kf : [0, 100] }, oo]], { autoplay: false });
  const d = a.duration; a.stop && a.stop();
  return d;
};
const elements = s => typeof s === 'string' ? $$(s) : Array.isArray(s) ? s.flatMap(elements) : [s];
const nomEl = el => el.id ? '#' + el.id : (el.className && el.className.baseVal === undefined ? '.' + el.className : el.tagName);
function A(sujet, kfs, o = {}) {
  const liste = elements(sujet);
  if (!liste.length) console.warn('aucun élément', sujet);
  const pas = o.stagger || 0;
  liste.forEach((el, i) => {
    const at = (o.at || 0) + i * pas;
    for (const [prop, kf0] of Object.entries(kfs)) {
      const kf = Array.isArray(kf0) ? kf0 : [kf0];
      const base = {};
      for (const [k, v] of Object.entries(o)) if (!(k in kfs) && k !== 'stagger' && k !== 'at') base[k] = v;
      const spe = (o[prop] && typeof o[prop] === 'object' && !Array.isArray(o[prop])) ? o[prop] : {};
      const opts = { ...base, ...spe, at };
      const dur = opts.type === 'spring' ? dureeRessort(opts, kf) : (opts.duration ?? 0.3);
      if (!pistes.has(el)) pistes.set(el, {});
      const p = pistes.get(el), prev = p[prop];
      if (prev) {
        if (at < prev.fin - 1e-4) console.warn(`chevauchement ${nomEl(el)} ${prop} : début ${at.toFixed(3)} < fin ${prev.fin.toFixed(3)}`);
        if (String(prev.val) !== String(kf[0])) {
          const tj = Math.max(prev.fin, at - 0.002);
          S.push([el, { [prop]: [prev.val, kf[0]] }, { duration: 0.001, at: tj, ease: 'linear' }]);
        }
      }
      S.push([el, { [prop]: kf }, opts]);
      p[prop] = { fin: at + dur, val: kf[kf.length - 1] };
    }
  });
}

/* ---------- valeurs calculées à chaque image (texte, compteurs, grain) ---------- */
const PISTES_TEXTE = [];
const texte = (sel, chaine, t0, dur) => PISTES_TEXTE.push({ el: $(sel), chaine, t0, dur });
let compteur = null;
window.surImage = (t) => {
  for (const p of PISTES_TEXTE) {
    const k = Math.max(0, Math.min(1, (t - p.t0) / p.dur));
    p.el.textContent = p.chaine.slice(0, Math.round(k * p.chaine.length));
  }
  if (compteur) {
    const k = Math.max(0, Math.min(1, (t - compteur.t0) / compteur.dur));
    $('#total').textContent = (compteur.val * Motion.easeOut(k)).toFixed(2).replace('.', ',') + ' €';
  }
  const f = Math.floor(t * 30), a = (f * 7919) % 256, b = (f * 104729) % 256;
  $('#grain').style.transform = `translate(${a - 128}px,${b - 128}px)`;
  $('#tape-ia').style.display = t > T(7, 2) + 0.27 ? 'none' : '';
  $('#caret-code').style.opacity = (Math.floor(t * 3.2) % 2 === 0 || (t > T(6) && t < T(6) + 0.5)) ? 1 : 0;
  $('#caret-ia').style.opacity = (Math.floor(t * 3.2) % 2 === 0 || (t > T(7) && t < T(7, 2) + .3)) ? 1 : 0;
};

/* ================= LA TIMELINE ================= */
// état initial : tout ce qui apparaît plus tard part caché
['#logo', '#tete', '#scene3d', '#fin', '.etiq', '.titre', '.source', '#f-lagon', '#f-scan', '#f-code', '#f-ia', '#f-fin', '#flash', '#vague', '#vague2', '#noir', '.cas .puce', '#doigt']
  .forEach(s => A(s, { opacity: [0, 0] }, { duration: 0.001, at: 0 }));
A('#cam', { scale: [1, 1] }, { duration: 0.001, at: 0 });
A('#papier', { rotate: [-3, -3] }, { duration: 0.001, at: 0 });

/* ===== 1. ACCROCHE (mesures 1-2) ===== */
A('#blob1', { x: [0, 260], y: [0, 180], scale: [1, 1.25] }, { duration: DUREE, at: 0, ease: 'linear' });
A('#blob2', { x: [0, -300], y: [0, -260], scale: [1.1, 0.9] }, { duration: DUREE, at: 0, ease: 'linear' });
A('#ecg', { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'] }, { duration: 2 * BAR, at: 0, ease: 'linear' });
A('#leg', { opacity: [0, 1], y: [20, 0] }, { duration: 0.5, at: 0.1, ease: EXPO });

const phrase = (id, tIn, tOut, chip) => {
  const mots = $$(`${id} .m, ${id} .qm`);
  A(mots, { opacity: [0, 1], y: [90, 0], filter: ['blur(14px)', 'blur(0px)'] }, { duration: 0.42, at: tIn, stagger: 0.045, ease: EXPO });
  cue(tIn, 'mot');
  if (tOut != null) {
    A(mots, { opacity: [1, 0], y: [0, -70], filter: ['blur(0px)', 'blur(10px)'] }, { duration: 0.2, at: tOut, stagger: 0.02, ease: ENTREE });
    A(chip, { opacity: [0, 1] }, { duration: 0.15, at: tOut + 0.12 });
    A(chip, { x: [-40, 0], scale: [0.85, 1] }, { ...RES(0.35, 0.35), at: tOut + 0.12 });
    cue(tOut + 0.12, 'pop', 0.45);
  }
};
phrase('#q1', 0.02, T(1, 3) - 0.2, '#p1');
phrase('#q2', T(1, 3), T(2, 1) - 0.2, '#p2');
phrase('#q3', T(2, 1), T(2, 3) - 0.2, '#p3');
phrase('#q4', T(2, 3), null);
A('#q4 .qm', { rotate: [0, -14, 10, -6, 0], scale: [1, 1.25, 1, 1, 1] }, { duration: 0.5, at: T(2, 3) + 0.42, ease: 'easeInOut' });
A('#accroche', { scale: [1, 1.08] }, { duration: 2 * B - 0.26, at: T(2, 3), ease: 'easeIn' });
A('#accroche', { scale: [1.08, 1.6], opacity: [1, 0], filter: ['blur(0px)', 'blur(18px)'] }, { duration: 0.22, at: T(3) - 0.26, ease: ENTREE });
A('#noir', { opacity: [0, 1] }, { duration: 0.12, at: T(3) - 0.2, ease: 'easeIn' });
A('#noir', { opacity: [1, 0] }, { duration: 0.05, at: T(3) });

/* ===== 2. LOGO (mesure 3) ===== */
const tL = T(3);
cue(tL, 'impact');
A('#f-lagon', { opacity: [1, 1] }, { duration: 0.001, at: tL - 0.003 });
A('#f-lagon', { clipPath: ['circle(0% at 50% 38%)', 'circle(150% at 50% 38%)'] }, { duration: 0.7, at: tL, ease: EXPO });
A('#flash', { opacity: [0.85, 0] }, { duration: 0.35, at: tL, ease: 'easeOut' });
A('#logo', { opacity: [1, 1] }, { duration: 0.001, at: tL - 0.003 });
A('#icone-in', { scale: [0.15, 1], rotate: [-28, 0] }, { ...RES(0.5, 0.6), at: tL + 0.02 });
A('#icone', { opacity: [0, 1] }, { duration: 0.1, at: tL + 0.02 });
A('#onde1', { scale: [0.3, 2.6], opacity: [0.9, 0] }, { duration: 0.8, at: tL, ease: EXPO });
A('#onde2', { scale: [0.3, 3.6], opacity: [0.6, 0] }, { duration: 1.0, at: tL + 0.1, ease: EXPO });
$$('.part').forEach((p, i, arr) => {
  const a = (i / arr.length) * Math.PI * 2 + (i % 2 ? 0.18 : -0.1);
  const r = 330 + (i % 4) * 95;
  A(p, { x: [0, Math.cos(a) * r], y: [0, Math.sin(a) * r * 0.95], rotate: [0, (i % 2 ? 1 : -1) * (120 + i * 15)] }, { duration: 1.4, at: tL + 0.03, ease: EXPO });
  A(p, { opacity: [0, 1, 1, 0], scale: [0.4, 1.2, 1, 0.6] }, { duration: 1.5, at: tL + 0.03, times: [0, 0.08, 0.7, 1] });
});
A('#mot span', { y: [120, 0], scale: [0.8, 1] }, { ...RES(0.4, 0.45), at: T(3, 2) - 0.08, stagger: 0.045 });
A('#mot span', { opacity: [0, 1], filter: ['blur(16px)', 'blur(0px)'] }, { duration: 0.3, at: T(3, 2) - 0.08, stagger: 0.045, ease: EXPO });
cue(T(3, 2) - 0.08, 'mot');
A('#signature span', { opacity: [0, 1], y: [30, 0] }, { duration: 0.4, at: T(3, 3), stagger: 0.04, ease: EXPO });
A('#icone-img', { scale: [1, 1.06, 1] }, { duration: 0.3, at: T(3, 3), ease: 'easeOut' });
A('#icone-img', { scale: [1, 1.06, 1] }, { duration: 0.3, at: T(3, 4), ease: 'easeOut' });
const tS = T(4) - 0.4;
A('#signature', { opacity: [1, 0], y: [0, -40] }, { duration: 0.2, at: tS - 0.04, ease: 'easeIn' });
A('#icone', { y: [0, -560], scale: [1, 0.22], opacity: [1, 0] }, { duration: 0.34, at: tS, ease: DOUX });
A('#mot', { y: [0, -860], scale: [1, 0.24], opacity: [1, 0] }, { duration: 0.34, at: tS, ease: DOUX });
cue(tS, 'whoosh');

/* ===== 3. FONCTIONNALITÉS (mesures 4-7) ===== */
A('#tete', { opacity: [0, 1] }, { duration: 0.2, at: T(4) - 0.14 });
A('#tete', { y: [30, 0], scale: [0.9, 1] }, { ...RES(0.2, 0.4), at: T(4) - 0.14 });
A('#scene3d', { opacity: [1, 1] }, { duration: 0.001, at: T(4) - 0.34 });
A('#tel', { y: [1500, 0], rotateX: [38, 0], rotateY: [-10, 0], scale: [0.9, 1] }, { ...RES(0.22, 0.7), at: T(4) - 0.33 });
A('#tel-flot', { rotateY: [0, -5, 4, -3, 5, 0], rotateZ: [0, -1, 1, -0.6, 0.8, 0] }, { duration: T(8) - T(4) + 0.2, at: T(4) + 0.5, ease: 'easeInOut' });

['#s-ordo', '#s-cam', '#s-res', '#s-code', '#s-ia'].forEach(s => A(s, { x: [420, 420] }, { duration: 0.001, at: 0 }));
const glisse = (sortant, entrant, t, dur = 0.48) => {
  A(sortant, { x: [0, -420], filter: ['blur(0px)', 'blur(6px)'] }, { duration: dur, at: t, ease: DOUX });
  A(entrant, { x: [420, 0], filter: ['blur(6px)', 'blur(0px)'] }, { duration: dur, at: t, ease: DOUX });
};
const titre = (etiq, t, tIn, tOut) => {
  A(etiq, { opacity: [0, 1], y: [24, 0] }, { duration: 0.4, at: tIn, ease: EXPO });
  A(t, { opacity: [1, 1] }, { duration: 0.001, at: tIn - 0.003 });
  A(`${t} .ln>span`, { y: ['110%', '0%'], rotate: [4, 0] }, { duration: 0.55, at: tIn + 0.04, stagger: 0.07, ease: EXPO });
  if (tOut != null) {
    A(etiq, { opacity: [1, 0], y: [0, -20] }, { duration: 0.2, at: tOut, ease: 'easeIn' });
    A(`${t} .ln>span`, { y: ['0%', '-110%'] }, { duration: 0.26, at: tOut, stagger: 0.04, ease: ENTREE });
  }
};
const fondWipe = (id, t) => {
  A(id, { opacity: [1, 1] }, { duration: 0.001, at: t - 0.203 });
  A(id, { clipPath: ['inset(0 0 0 100%)', 'inset(0 0 0 0%)'] }, { duration: 0.5, at: t - 0.2, ease: DOUX });
  cue(t - 0.2, 'swoosh');
};
const whip = (t) => A('#tel-whip', { rotateY: [0, -16, 0], scale: [1, 0.95, 1] }, { duration: 0.55, at: t - 0.2, ease: DOUX });
const GRIS = '#4A6470', LAGON = '#0E9384', VIOLET = '#5B4FD9';
A('#indic', { x: ['100%', '100%'] }, { duration: 0.001, at: 0 });
A('.tab[data-t="1"]', { color: [LAGON, LAGON] }, { duration: 0.001, at: 0 });
const onglet = (i, t) => {
  A('#indic', { x: [`${(i - 1) * 100}%`, `${i * 100}%`] }, { ...RES(0.2, 0.4), at: t });
  A(`.tab[data-t="${i - 1}"]`, { color: [LAGON, GRIS] }, { duration: 0.2, at: t });
  A(`.tab[data-t="${i}"]`, { color: [GRIS, i === 4 ? VIOLET : LAGON] }, { duration: 0.2, at: t + 0.08 });
};
const centre = (sel) => { let el = $(sel), x = el.offsetWidth / 2, y = el.offsetHeight / 2; while (el && el.id !== 'ui') { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return [x, y]; };
let nVague = 0;
const doigt = (pts, tFin) => { // [[t, x, y, appui?]]
  const [t0, x0, y0] = pts[0];
  A('#doigt', { left: [x0, x0], top: [y0, y0] }, { duration: 0.001, at: t0 - 0.01 });
  A('#doigt', { opacity: [0, 1], scale: [1.6, 1] }, { duration: 0.16, at: t0, ease: EXPO });
  for (let k = 1; k < pts.length; k++) {
    const [t, x, y, appui] = pts[k], [tp, xp, yp] = pts[k - 1];
    const dep = Math.max(tp + 0.17, t - 0.22);
    A('#doigt', { left: [xp, x], top: [yp, y] }, { duration: t - dep, at: dep, ease: DOUX });
    if (appui) {
      A('#doigt', { scale: [1, 0.78, 1] }, { duration: 0.2, at: t, ease: 'easeInOut' });
      const v = (nVague++ % 2) ? '#vague2' : '#vague';
      A(v, { left: [x, x], top: [y, y] }, { duration: 0.001, at: t + 0.04 });
      A(v, { scale: [0.6, 2.6], opacity: [0.9, 0] }, { duration: 0.45, at: t + 0.05, ease: EXPO });
      cue(t + 0.05, 'tap');
    }
  }
  A('#doigt', { opacity: [1, 0] }, { duration: 0.15, at: tFin });
};
const source = (id, t, dx) => {
  A(id, { opacity: [0, 1] }, { duration: 0.15, at: t });
  A(id, { scale: [0.5, 1], x: [dx, 0] }, { duration: 0.32, at: t, ease: REBOND });
  cue(t, 'ding', 0.8);
};
const sourceOut = (ids, t) => A(ids, { opacity: [1, 0], scale: [1, 0.8] }, { duration: 0.18, at: t, ease: 'easeIn' });

// --- Prescri'Dent (mesure 4)
const t4 = T(4);
titre('#e1', '#t-pres', t4 - 0.05, T(5) - 0.24);
const cA = centre('#opt-aap'), cV = centre('#voir');
doigt([[T(4, 2) - 0.14, cA[0] + 40, cA[1] + 60], [T(4, 2) + 0.1, cA[0], cA[1], true], [T(4, 3) - 0.12, cV[0], cV[1], true]], T(4, 3) + 0.1);
A('#opt-aap .sel', { opacity: [0, 1] }, { duration: 0.15, at: T(4, 2) + 0.12 });
A('#opt-aap .ok', { opacity: [0, 1] }, { duration: 0.1, at: T(4, 2) + 0.12 });
A('#opt-aap .ok', { scale: [0.4, 1] }, { ...RES(0.5, 0.25), at: T(4, 2) + 0.12 });
A('#opt-aap', { scale: [1, 0.97, 1] }, { duration: 0.22, at: T(4, 2) + 0.08, ease: 'easeInOut' });
A('#arcade .lum', { opacity: [0, 1] }, { duration: 0.12, at: T(4, 2) + 0.22, stagger: 0.06 });
A($$('#arcade svg').slice(11), { y: [0, -5, 0] }, { duration: 0.28, at: T(4, 2) + 0.22, stagger: 0.06, ease: 'easeOut' });
[0, 1, 2].forEach(k => cue(T(4, 2) + 0.22 + k * 0.06, 'tic', 0.5));
A('#voir', { opacity: [0.35, 1] }, { duration: 0.15, at: T(4, 2) + 0.2 });
A('#voir', { scale: [1, 0.96, 1] }, { duration: 0.2, at: T(4, 3) - 0.1, ease: 'easeInOut' });
glisse('#s-q', '#s-ordo', T(4, 3) + 0.02, 0.42);
A('#s-ordo .c-o', { opacity: [0, 1], y: [40, 0] }, { duration: 0.4, at: T(4, 3) + 0.18, stagger: 0.09, ease: EXPO });
A('#s-ordo .c-l', { opacity: [0, 1], x: [-18, 0] }, { duration: 0.3, at: T(4, 4) - 0.02, stagger: 0.08, ease: EXPO });
[0, 1, 2, 3].forEach(k => cue(T(4, 3) + 0.18 + k * 0.09, 'pop', 0.5));
[0, 1, 2].forEach(k => cue(T(4, 4) - 0.02 + k * 0.08, 'tic', 0.6));
source('#src1', T(4, 3) + 0.22, 60);
source('#src2', T(4, 3) + 0.5, -60);
sourceOut(['#src1', '#src2'], T(5) - 0.1);

// --- Scanner (mesure 5)
const t5 = T(5);
fondWipe('#f-scan', t5);
whip(t5);
titre('#e2', '#t-scan', t5 - 0.02, T(6) - 0.24);
onglet(2, t5 - 0.1);
glisse('#s-ordo', '#s-cam', t5 - 0.2);
A('#coins', { opacity: [0, 1] }, { duration: 0.12, at: t5 + 0.05 });
A('#coins', { scale: [1.25, 1] }, { ...RES(0.3, 0.35), at: t5 + 0.05 });
A('#balai', { opacity: [0, 0] }, { duration: 0.001, at: 0 });
A('#balai', { y: [0, 400] }, { duration: 0.62, at: t5 + 0.18, ease: 'easeInOut' });
A('#balai', { opacity: [0, 1, 1, 0] }, { duration: 0.62, at: t5 + 0.18, times: [0, 0.1, 0.85, 1] });
cue(t5 + 0.18, 'scan');
[['#l-kard', 0.33], ['#l-metf', 0.46], ['#l-rami', 0.58]].forEach(([s, d], k) => {
  A(`${s} .boite`, { opacity: [0, 1], scaleX: [0.3, 1] }, { duration: 0.18, at: t5 + d, ease: EXPO });
  cue(t5 + d, 'bip', 0.6 + k * 0.1);
});
A('#papier', { scale: [1, 1.04] }, { duration: 0.7, at: t5 + 0.1, ease: 'easeOut' });
A('#s-res', { x: [420, 0] }, { duration: 0.001, at: T(5, 3) - 0.03 });
A('#s-res', { y: [700, 0] }, { ...RES(0.15, 0.42), at: T(5, 3) - 0.02 });
A('#s-res', { opacity: [0, 1] }, { duration: 0.2, at: T(5, 3) - 0.02 });
A('#s-cam', { opacity: [1, 0] }, { duration: 0.25, at: T(5, 3) + 0.05 });
cue(T(5, 3) - 0.02, 'whoosh', 0.5);
A('#s-res .c-r', { opacity: [0, 1], y: [30, 0] }, { duration: 0.35, at: T(5, 3) + 0.12, stagger: 0.055, ease: EXPO });
for (let k = 0; k < 8; k++) cue(T(5, 3) + 0.12 + k * 0.055, 'tic', 0.4);
source('#src3', T(5, 4) - 0.05, -60);
sourceOut('#src3', T(6) - 0.1);

// --- Codage (mesure 6)
const t6 = T(6);
fondWipe('#f-code', t6);
whip(t6);
titre('#e3', '#t-code', t6 - 0.02, T(7) - 0.24);
onglet(3, t6 - 0.1);
A('#s-res', { x: [0, -420], filter: ['blur(0px)', 'blur(6px)'] }, { duration: 0.48, at: t6 - 0.2, ease: DOUX });
A('#s-code', { x: [420, 0], filter: ['blur(6px)', 'blur(0px)'] }, { duration: 0.48, at: t6 - 0.2, ease: DOUX });
A('#s-code .c-a', { opacity: [0, 0] }, { duration: 0.001, at: 0 });
A('#panier', { y: [420, 420] }, { duration: 0.001, at: 0 });
A('#toast1', { y: [-80, -80], opacity: [0, 0] }, { duration: 0.001, at: 0 });
const req = 'troisième molaire';
texte('#tape-code', req, t6 + 0.02, 0.42);
for (let k = 0; k < req.length; k++) cue(t6 + 0.02 + k * 0.42 / req.length, 'touche', 0.35);
A('#s-code .c-a', { opacity: [0, 1], y: [26, 0] }, { duration: 0.32, at: t6 + 0.36, stagger: 0.05, ease: EXPO });
const cP = centre('#a-004 .plus');
doigt([[T(6, 2) + 0.12, cP[0] - 30, cP[1] + 70], [T(6, 3) - 0.12, cP[0], cP[1], true]], T(6, 3) + 0.1);
A('#a-004 .v', { opacity: [0, 1] }, { duration: 0.1, at: T(6, 3) - 0.08 });
A('#a-004 .v', { scale: [0.3, 1] }, { ...RES(0.5, 0.25), at: T(6, 3) - 0.08 });
A('#a-004 .hl', { opacity: [0, 1] }, { duration: 0.15, at: T(6, 3) - 0.08 });
A('#a-004', { scale: [1, 0.97, 1] }, { duration: 0.2, at: T(6, 3) - 0.12, ease: 'easeInOut' });
A('#toast1', { y: [-80, 0], opacity: [0, 1] }, { duration: 0.3, at: T(6, 3) - 0.06, ease: REBOND });
A('#toast1', { y: [0, -80], opacity: [1, 0] }, { duration: 0.2, at: T(6, 4) + 0.05, ease: 'easeIn' });
A('#panier', { y: [420, 0] }, { ...RES(0.15, 0.45), at: T(6, 3) + 0.02 });
cue(T(6, 3) + 0.02, 'whoosh', 0.35);
compteur = { val: 96.14, t0: T(6, 3) + 0.25, dur: 0.5 };
cue(T(6, 3) + 0.75, 'caisse', 0.9);
A('#total', { scale: [1, 1.18, 1] }, { duration: 0.3, at: T(6, 3) + 0.72, ease: 'easeOut' });
source('#src4', T(6, 4) + 0.05, 60);
sourceOut('#src4', T(7) - 0.08);

// --- Assistant (mesure 7)
const t7 = T(7);
fondWipe('#f-ia', t7);
whip(t7);
titre('#e4', '#t-ia', t7 - 0.02, T(8) - 0.28);
onglet(4, t7 - 0.1);
A('#indic-v', { opacity: [0, 1] }, { duration: 0.3, at: t7 - 0.1 });
A('#s-code', { x: [0, -420], filter: ['blur(0px)', 'blur(6px)'] }, { duration: 0.48, at: t7 - 0.2, ease: DOUX });
A('#s-ia', { x: [420, 0], filter: ['blur(6px)', 'blur(0px)'] }, { duration: 0.48, at: t7 - 0.2, ease: DOUX });
A(['#b-moi', '#b-pts', '#b-rep'], { opacity: [0, 0] }, { duration: 0.001, at: 0 });
const dem = 'Dent de sagesse du bas, incluse';
texte('#tape-ia', dem, t7 + 0.05, 0.55);
for (let k = 0; k < dem.length; k += 2) cue(t7 + 0.05 + k * 0.55 / dem.length, 'touche', 0.3);
const cE = centre('.saisie .env');
doigt([[T(7, 2) + 0.0, cE[0] - 20, cE[1] - 50], [T(7, 2) + 0.2, cE[0], cE[1], true]], T(7, 2) + 0.42);
A('#b-moi', { opacity: [0, 1] }, { duration: 0.12, at: T(7, 2) + 0.27 });
A('#b-moi', { y: [50, 0], scale: [0.9, 1] }, { ...RES(0.3, 0.35), at: T(7, 2) + 0.27 });
cue(T(7, 2) + 0.27, 'envoi', 0.8);
A('#b-pts', { opacity: [0, 1, 1, 0] }, { duration: 0.5, at: T(7, 2) + 0.4, times: [0, 0.15, 0.85, 1] });
A('#b-pts i', { y: [0, -5, 0], opacity: [0.4, 1, 0.4] }, { duration: 0.3, at: T(7, 2) + 0.45, stagger: 0.08, ease: 'easeInOut' });
A('#b-rep', { opacity: [0, 1] }, { duration: 0.15, at: T(7, 3) });
A('#b-rep', { y: [40, 0] }, { ...RES(0.25, 0.4), at: T(7, 3) });
A('#b-rep .c-i', { opacity: [0, 1], y: [12, 0] }, { duration: 0.3, at: T(7, 3) + 0.05, stagger: 0.08, ease: EXPO });
cue(T(7, 3), 'magie', 1);
A('#b-rep .code', { scale: [1, 1.12, 1] }, { duration: 0.35, at: T(7, 3) + 0.25, ease: 'easeOut' });
source('#src5', T(7, 4) - 0.05, -60);
sourceOut('#src5', T(8) - 0.12);

/* ===== 4. FIN (mesure 8) ===== */
const t8 = T(8);
A('#tel', { y: [0, 1700], rotateX: [0, 30], scale: [1, 0.85] }, { duration: 0.45, at: t8 - 0.3, ease: ENTREE });
A('#tete', { opacity: [1, 0], y: [0, -40] }, { duration: 0.25, at: t8 - 0.28, ease: 'easeIn' });
cue(t8 - 0.3, 'whoosh', 0.8);
A('#f-fin', { opacity: [1, 1] }, { duration: 0.001, at: t8 - 0.003 });
A('#f-fin', { clipPath: ['circle(0% at 50% 30%)', 'circle(150% at 50% 30%)'] }, { duration: 0.7, at: t8, ease: EXPO });
A('#flash', { opacity: [0.75, 0] }, { duration: 0.35, at: t8, ease: 'easeOut' });
cue(t8, 'final');
A('#fin', { opacity: [1, 1] }, { duration: 0.001, at: t8 - 0.003 });
A('#fin-icone', { opacity: [0, 1] }, { duration: 0.12, at: t8 + 0.02 });
A('#fin-icone', { scale: [0.2, 1], rotate: [24, 0] }, { ...RES(0.45, 0.55), at: t8 + 0.02 });
A('#onde3', { scale: [0.4, 3.2], opacity: [0.9, 0] }, { duration: 0.9, at: t8, ease: EXPO });
A('#fin-mot span', { y: [110, 0] }, { ...RES(0.35, 0.45), at: t8 + 0.18, stagger: 0.04 });
A('#fin-mot span', { opacity: [0, 1], filter: ['blur(14px)', 'blur(0px)'] }, { duration: 0.3, at: t8 + 0.18, stagger: 0.04, ease: EXPO });
A('#fin-slogan .ln>span', { y: ['110%', '0%'] }, { duration: 0.55, at: T(8, 2) + 0.05, stagger: 0.08, ease: EXPO });
A('#fin-cta', { opacity: [0, 1] }, { duration: 0.15, at: T(8, 3) });
A('#fin-cta', { y: [50, 0], scale: [0.85, 1] }, { ...RES(0.35, 0.45), at: T(8, 3) });
cue(T(8, 3), 'pop', 0.8);
A('#fin-plus', { opacity: [0, 1], y: [20, 0] }, { duration: 0.4, at: T(8, 3) + 0.15, ease: EXPO });
A('#fin-src', { opacity: [0, 1] }, { duration: 0.5, at: T(8, 4) - 0.1, ease: 'easeOut' });
A('#fin', { scale: [1, 1.035] }, { duration: DUREE - t8, at: t8, ease: 'linear' });

/* caméra : petite poussée sur les temps forts */
A('#cam', { scale: [1.03, 1] }, { duration: 0.45, at: T(3), ease: EXPO });
for (let bar = 4; bar <= 7; bar++) A('#cam', { scale: [1.014, 1] }, { duration: 0.28, at: T(bar), ease: 'easeOut' });
A('#cam', { scale: [1.025, 1] }, { duration: 0.45, at: T(8), ease: EXPO });
A('#cam', { opacity: [1, 1] }, { duration: 0.001, at: DUREE });

window.tl = animate(S, { autoplay: false });
window.allerA = (t) => new Promise(r => { tl.seek(t); surImage(t); requestAnimationFrame(() => requestAnimationFrame(r)); });
window.pret = document.fonts.ready.then(() => Promise.all([
  document.fonts.load('800 100px "Bricolage Grotesque"'),
  document.fonts.load('700 30px "Bricolage Grotesque"'),
  document.fonts.load('700 30px "Atkinson Hyperlegible"'),
  document.fonts.load('400 30px "Atkinson Hyperlegible"'),
  ...$$('img').map(i => i.decode().catch(() => {}))
])).then(() => allerA(0)).then(() => ({ duree: tl.duration, segments: S.length }));
