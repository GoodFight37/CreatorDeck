# Note de passation Claude — refonte UI + point de départ de l'étape 2

Branche : `etape-1-mes-chaines` (HEAD 1f1c0c6). Rédigée le 17/10/2026.

## Fait
- **Étape 1** (cercle de 5–15 chaînes, premier booster biaisé, accueil épuré, migration 0054) : terminée, testée, APK installé par Malik.
- **Refonte visuelle** (présentation seule, aucune règle de jeu touchée), commit 1f1c0c6 :
  - `src/app/stage.css` (importé en dernier dans `layout.tsx`) : halo du pack, bouton pilule, dock flottant, Binder/Craft, zones ≥ 44 px, `.sr-only`, `prefers-reduced-motion`. Tout l'accueil est scopé sous `.home-view.is-lean`.
  - `src/components/circle-strip.tsx` : rangée « Ton cercle » (en direct = anneau tournant + lien Twitch, obtenue = anneau de rareté, manquante = grisée). Utilisée sur l'accueil (lean) et en tête du Binder.
  - `drop-view.tsx` : halo = portrait de la 1re chaîne du cercle, `<h1 class="sr-only">`, rangée du cercle avant les trouvailles.
  - `binder-view.tsx` : `<CircleStrip>` si un cercle existe.
- Vérifié automatiquement : captures 360/390/768/1280, aucun débordement horizontal, 0 erreur JS, 1213 tests unitaires + 192 tests d'écrans, jargon, tsc, eslint.
- Non vérifié (appareil réel) : fluidité tactile, encoche/barre de gestes autour du dock, flou du verre dans le WebView Android. Playwright e2e jamais lancé.

## Restes connus
- Écran Toi non retouché (résumés de 24–37 px).
- Sur 360×740 la rangée « Ton cercle » passe en partie sous le dock au 1er écran.
- Joueurs sans cercle : ancien accueil, pas de bouton « Définir mes chaînes ».
- « Page 21 / 9 » dans le Binder = nom de collection « … · Page 21 » + 9 cartes, pas un bug.
- Les e2e cherchent encore le titre « Mon classeur » (conservé).
- Le dépôt GitHub a déménagé : `GoodFight37/CreatorDeck` (le push passe via redirection).

## Pièges d'environnement
- Fichiers en CRLF (drop-view.tsx, reveal-overlay.tsx, game-engine.ts…) : éditer en conservant les fins de ligne.
- APK : `npm run android:sync` puis `node scripts/android-gradle.mjs assembleDebug --max-workers=2` (ANDROID_HOME=/opt/android-sdk, `.env.local` requis). Il se télécharge en `.apk.zip` : renommer en `.apk`.
- Le hook « commits non poussés » est périmé : vérifier avec `git ls-remote`.

## Étape 2 (à faire)
Second verbe : « qui est en direct dans mon cercle ». La rangée existe déjà visuellement ; il reste à en faire un vrai geste de jeu (voir le prompt dans la conversation de passation).
