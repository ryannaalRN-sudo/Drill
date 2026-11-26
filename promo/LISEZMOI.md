# Pub Drill — 15 s

Vidéo verticale 1080×1920 à 60 images/s, animée avec Motion et accompagnée d'une bande-son synthétisée.

- `index.html` : la scène (accroche, logo, quatre fonctionnalités, écran de fin), avec les écrans de l'appli reconstitués.
- `timeline.js` : la timeline Motion, calée sur 8 mesures à 128 BPM. Elle exporte aussi les instants des bruitages (`window.CUES`).
- `render.js` : pilote la timeline image par image (`seek`) dans Chromium et encode avec ffmpeg.
- `son.py` : compose la musique et les bruitages à partir des indices, puis mixe et masterise (−13 LUFS).

## Refaire la vidéo

```bash
node render.js video 60 sortie/video.mp4 2
```

```bash
python3 son.py sortie/cues.json sortie/bande.wav 0.72
```

```bash
ffmpeg -i sortie/video.mp4 -i sortie/bande.wav -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart sortie/drill-pub.mp4
```

Pour vérifier quelques instants sans tout rendre : `node render.js apercu 1.2,4.1,8.9`.

Dépendances : Node avec Playwright (Chromium), ffmpeg, Python 3 avec numpy et scipy. Les polices sont chargées depuis Google Fonts.
