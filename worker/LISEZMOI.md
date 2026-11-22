# Brancher l'IA de l'assistant (gratuit, environ 15 minutes)

L'assistant fonctionne déjà sans IA grâce au moteur local. Le relais ci-dessous lui permet en plus de rédiger des réponses naturelles et de comprendre des formulations libres. La clé Gemini reste cachée dans le relais, jamais dans l'app.

## 1. Clé Gemini (gratuite)
1. Va sur https://aistudio.google.com/apikey et connecte-toi avec ton compte Google.
2. Clique sur « Create API key » et copie la clé.

## 2. Relais Cloudflare (gratuit)
1. Crée un compte sur https://dash.cloudflare.com/sign-up.
2. Menu « Workers & Pages », puis « Create », puis « Create Worker ».
3. Nomme-le `drill-ia`, clique sur « Deploy ».
4. Clique sur « Edit code », remplace tout le contenu par celui de `worker/worker.js`, puis « Deploy ».
5. Retourne sur la page du worker : « Settings », puis « Variables and Secrets », « Add » :
   - Type « Secret », nom `GEMINI_API_KEY`, valeur : ta clé Gemini.
6. Note l'adresse du worker, du type `https://drill-ia.<ton-compte>.workers.dev`.

## 3. Dernière étape
Envoie l'adresse du worker à Claude : il la mettra dans l'app (constante `IA_URL`).

Optionnel : la variable `GEMINI_MODEL` permet de changer de modèle (par défaut `gemini-2.5-flash`).

## Mise à jour : scanner d'ordonnance (novembre 2026)

Le relais gère maintenant deux nouveaux usages :
- `mode: "lecture"` : lecture d'une photo recadrée d'ordonnance (Gemini vision), renvoie la liste des médicaments ;
- `mode: "ordo"` : synthèse de l'analyse d'un traitement.

Pour l'activer : Cloudflare → Workers → drill-ia → Modifier le code → coller le nouveau `worker.js` → Déployer.
Aucun réglage supplémentaire : la même clé `GEMINI_API_KEY` sert pour tout.
