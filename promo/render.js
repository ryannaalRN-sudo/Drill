// Rendu image par image de la timeline Motion (Chromium piloté par Playwright, encodage ffmpeg).
// usage : node render.js apercu t1,t2,...                 -> PNG dans sortie/apercu
//         node render.js video <fps> <fichier.mp4> [sous-images]  (2 sous-images = flou de mouvement)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const [mode, a1, a2, a3] = process.argv.slice(2);
fs.mkdirSync(path.join(dir, 'sortie'), { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const erreurs = [];
  p.on('pageerror', e => erreurs.push(e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') erreurs.push(m.text()); });
  await p.goto('file://' + dir + '/index.html');
  const info = await p.evaluate(() => window.pret);
  fs.writeFileSync(path.join(dir, 'sortie', 'cues.json'), JSON.stringify(await p.evaluate(() => window.CUES)));
  console.log('durée timeline', info.duree, '| erreurs', erreurs.length ? erreurs : 'aucune');
  if (mode === 'apercu') {
    const out = path.join(dir, 'sortie', 'apercu');
    fs.mkdirSync(out, { recursive: true });
    for (const t of a1.split(',').map(Number)) {
      await p.evaluate(t => allerA(t), t);
      await p.screenshot({ path: path.join(out, `t${t.toFixed(2).padStart(5, '0')}.png`) });
    }
  } else {
    const fps = Number(a1), sortie = a2, sous = Number(a3 || 1);
    const n = Math.round(17 * 4 * 60 / 90 * fps * sous);
    const vf = sous > 1 ? ['-vf', `tmix=frames=${sous}:weights=${Array(sous).fill(1).join(' ')},framestep=${sous}`] : [];
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps * sous), '-c:v', 'mjpeg', '-i', '-',
      ...vf, '-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', sortie], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      const t = i / (fps * sous);
      await p.evaluate(t => allerA(t), t);
      const img = await p.screenshot({ type: 'jpeg', quality: 95 });
      if (!ff.stdin.write(img)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log(`image ${i}/${n} — ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end();
    await new Promise(r => ff.on('close', r));
    console.log('vidéo écrite en', ((Date.now() - t0) / 1000).toFixed(0), 's');
  }
  if (erreurs.length) console.log('ERREURS', erreurs);
  await b.close();
})();
