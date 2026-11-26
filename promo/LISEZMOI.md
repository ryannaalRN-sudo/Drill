# Pub Drill — 37 s

Vidéo verticale 1080×1920 à 60 images/s, animée avec Motion et accompagnée d'une bande-son synthétisée (piano feutré, marimba, groove doux).

- `index.html` : la scène en 3D (accroche, logo, Prescri'Dent, Scanner, Codage CCAM, final), sans téléphone : les éléments de l'appli flottent dans l'espace, et aucun texte n'en recouvre un autre.
- `timeline.js` : la timeline Motion, calée sur 14 mesures à 90 BPM. Elle exporte aussi les instants des bruitages (`window.CUES`).
- `render.js` : pilote la timeline image par image (`seek`) dans Chromium et encode avec ffmpeg.
- `son.py` : compose la musique (fa majeur, 90 BPM) et des bruitages discrets à partir des indices, puis mixe et masterise (−14 LUFS).

## Refaire la vidéo

```bash
node render.js video 60 sortie/video.mp4 2
```

```bash
python3 son.py sortie/cues.json sortie/bande.wav 1.5
```

```bash
ffmpeg -i sortie/video.mp4 -i sortie/bande.wav -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart sortie/drill-pub.mp4
```

Pour vérifier quelques instants sans tout rendre : `node render.js apercu 1.2,4.1,8.9`.

Dépendances : Node avec Playwright (Chromium), ffmpeg, Python 3 avec numpy et scipy. Les polices (Bricolage Grotesque, Atkinson Hyperlegible, Caveat) sont chargées depuis Google Fonts.
