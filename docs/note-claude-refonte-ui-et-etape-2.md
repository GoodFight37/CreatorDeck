# Note de passation Claude — refonte UI, étapes 2 et 3

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

## Étape 2 — faite le 17/10/2026 (commit 6c85336, D-138)
- Encadré « En direct dans ton cercle » sous le bouton (lean) : `src/components/circle-live-moment.tsx`, logique pure `src/lib/circle-live.ts`.
- Bénéfice = bonus Direct existant (lu dans `DIRECT_BONUS`) ; réserve vide → prochaine recharge + raccourci sablier existant. Aucune règle, migration ni notification.
- `circle-strip.tsx` : états personne / périmé / hors ligne (Réessayer → `liveStore.refresh({ force: true })`) / version sans suivi ; correction du défilement qui cachait les chaînes en direct.
- Vérifié automatiquement : `npm test` 1227/1227, `npm run ecrans` 200/200, check-jargon, tsc, eslint ; captures `docs/captures/etape-2/` (direct simulé, compte invité : la ligne « C’est le moment d’ouvrir » et le sablier ne sont visibles qu’avec un compte, couverts par les tests d’écran).
- Non vérifié : téléphone réel (lien Twitch qui ouvre l’app Twitch ou le navigateur, rendu de l’encadré au-dessus du dock, données live réelles).

### APK de cette session
- Construit dans un environnement cloud neuf : SDK Android installé dans `/opt/android-sdk`, `.env.local` recréé (non commité) avec l’URL et la clé publique déjà servies par le site Vercel.
- Le dépôt ne fixe **aucune clé de signature debug** : chaque machine signe avec la sienne. Si Android refuse la mise à jour (« Application non installée »), il faut désinstaller l’ancienne version d’abord ; les données de l’appareil (cercle, partie invitée) sont alors perdues, celles du compte en ligne restent. Piste à décider : committer une clé debug dédiée.
- Maven Central a renvoyé des 429 : relancer Gradle avec `--max-workers=1` suffit.

## Clé de signature (D-139, commit 8f2cb54)
`android/app/creatordeck-debug.keystore` signe tous les APK debug (SHA-256 `aa0b0f24…3e75`, celle de l'APK étape 2). Plus de désinstallation entre deux versions.

## Étape 3 — faite le 17/10/2026 (commit d6f9d9e, D-140)
- Binder : vue par défaut « Mon cercle », objectif « Ton cercle à compléter », cible d'artisanat (`src/lib/circle-goal.ts`, sans nouvelle règle).
- « Définir mes chaînes » (accueil sans cercle) et « Modifier » (rangée) → `CircleOnboarding mode="edit"` ouvert par `creator-deck-app.tsx` (`circleEditOpen`).
- Jetons aplatis dans le panneau Réserve de l'accueil épuré.
- Vérifié : 1233 unitaires, 208 écrans, jargon, tsc, eslint (`--ignore-pattern 'android/**/build/**' --ignore-pattern 'android/app/src/main/assets/**'` : fichiers générés). APK construit et vérifié. Non vérifié sur téléphone.

## Choix délégués par Malik (17/10/2026, soir)
- Seuil MEMES : 10 boosters ouverts pour un joueur avec cercle (D-141), fait.
- Garantie du cercle : « le Légendaire garanti vient du cercle » (D-142), choisie, **pas active** tant que le cercle n'est pas en ligne.

## Fait ensuite (feu vert de Malik, 17/10 soir)
- Cercle en ligne (D-143) : `circle-sync.ts`, `cloudStore.pushCircle` / `syncCircle`, `api.circle()`.
- Garantie du cercle (D-142) : migration `0055_garantie_cercle.sql` (manuelle, **à appliquer par Malik après 0054**), miroir `circlePityPool()`, annonces accueil + taux, scénarios dans `verify-supabase-migrations.mjs`.

## Proposé, non fait (accord de Malik requis)
- Notification push « X vient de lancer son direct ».
- Étapes 4 et 5 du plan.
