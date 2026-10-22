# Vérification de la navigation — 22 octobre 2026

## Périmètre et provenance

Reprise demandée par Malik après la passation Claude : revue du commit publié,
rendu à 1024 px, sachet MEMES et Android. HEAD local et `origin/main` vérifiés :
`42df5b47906a30aa1409e0b9c699001b7506545e`, branche locale
`codex/phase2-completion`. Le distant de cette branche est plus ancien ; aucune
bascule, réinitialisation Git, publication ou modification Supabase.

Malik a ensuite autorisé explicitement les deux corrections d’interface
confirmées, avec tests, toujours sans commit ni push. Le chantier Imgflip et
les autres changements préexistants sont conservés.

## Revue et corrections locales

- `src/components/settings-sheet.tsx` : le focus initial existait, mais
  Maj+Tab sortait de la feuille. Échap ne la fermait alors plus. La feuille
  conserve désormais les déplacements Tab/Maj+Tab, ignore les contrôles cachés
  d’Avancé, laisse les dialogues supérieurs recevoir le clavier et rend le
  focus à l’engrenage à sa fermeture. Le compte peut être ouvert et fermé
  sans perdre le parcours clavier des Réglages. Pas de changement aux autres
  systèmes de focus.
- `src/components/tribunal-view.tsx` : le bouton du bilan disait « Retour au
  Drop », alors que sa fermeture conserve désormais l’onglet d’origine.
  Libellé remplacé par « Fermer le bilan », sans changer le comportement.
- Régression reproduite avant correction par un nouveau scénario dans
  `e2e/navigation.spec.ts` et par l’assertion ajustée de
  `src/ecrans-tribunal.test.tsx`. Aucun test supprimé dans cette reprise.
- Note joueur ajoutée en tête de `src/lib/release-notes.ts`, identifiant
  `2026-10-22-reglages-clavier-retour-tribunal`, en préservant la note locale
  préexistante du chantier Imgflip. Ces corrections ne sont pas publiées.

## Preuves du commit publié

- [CI Vérification réussie](https://github.com/GoodFight37/CreatorDeck/actions/runs/39688366925),
  [APK réussie](https://github.com/GoodFight37/CreatorDeck/actions/runs/39688971426),
  [déploiement Supabase réussi](https://github.com/GoodFight37/CreatorDeck/actions/runs/39688971430).
  Ces états concernent `42df5b4`, pas les corrections locales ci-dessus.
- Statut GitHub Vercel `success` pour le même SHA ;
  [déploiement signalé](https://vercel.com/hafsi37-2386/creator-deckk/Gzwxhtqgf8VURJGowFAVmkTGoG27).
- [APK publique v877048](https://github.com/GoodFight37/creatordeck-apk/releases/tag/v877048)
  téléchargée avec son manifeste : `versionName=42df5b4`, 110 648 278 octets,
  SHA-256 vérifié `ceb038853b4882dea89a2666303e826b910513082bc5ec665e6e07f2fec75286`.
- Installation par `adb install -r` sur `CreatorDeck_API36`, GPU matériel,
  Android API 36, paquet `com.creatordeck.app`, sans effacement. La navigation,
  l’Atelier dans le Binder, le profil, les Réglages et Retour Android depuis le
  Tribunal ont été réellement parcourus dans la WebView native.
- MEMES sur cette APK : ouverture avec un glissement Android natif
  (`AndroidInput.swipe`), cinq cartes révélées, récapitulatif, retour à la
  collection. **Un tirage factice, cinq cartes, aucune exception JS**. Tous les
  RPC de ce parcours sont simulés, jamais des écritures en production. Le
  stockage de l’émulateur est sauvegardé en mémoire puis restauré ; aucune
  session n’est enregistrée dans les preuves.
- Calibration native mesurée dans `dumpsys window displays` : écran 1080 ×
  2400, barre supérieure 128 px, début de barre inférieure 2337 px ; WebView
  412 × 842 CSS. Le premier geste sans compensation n’ouvrait pas le sachet ;
  le geste recalé passe. Les captures du récap sont prises après rafraîchissement
  du compositeur, car une capture native immédiate pouvait montrer la carte
  précédente.
- Captures examinées dans `reports/navigation-42df5b4/` : Drop, Binder,
  Atelier, Objectifs, profil, Réglages à 1024 px ; MEMES à 1024 et 390 px ;
  APK, cartes MEMES et récapitulatif. Pas de débordement horizontal constaté.
  La capture du récap montre les cinq cartes et leurs noms complets sous les
  miniatures. Ces artefacts restent locaux, hors suivi Git.

## Vérifications exécutées

- `npx tsc --noEmit` : code 0 avant correction et sur la correction finale ;
  le build de la correction finale inclut également TypeScript.
- `npx vitest run --config vitest.ecrans.config.mts` : 240/240 avant correction.
  Après correction : les six fichiers d’écrans concernés passent, 39/39.
  Relance finale de la suite complète avec `--maxWorkers=2` : **240/240**, 36
  fichiers, code 0. Deux avertissements React préexistants (`act` et remontage
  d’une racine) restent visibles ; aucun test ignoré.
- `npx vitest run` : 1 306 réussis, 11 échecs dans
  `src/lib/push-essai.test.ts` car le bac à sable interdit la création des
  dépôts Git temporaires. Relance de ce fichier avec permissions adaptées :
  11/11 réussis. `circle.test.ts` est passé dans ce run. **Relance finale
  complète hors blocage sandbox : 1 317/1 317, 97 fichiers, code 0**, sans
  relance du test aléatoire et sans test ignoré.
- Après correction : `npx vitest run src/lib/release-notes.test.ts src/lib/jargon.test.ts`
  passe, 14/14. ESLint ciblé passe, code 0.
- La sélection Playwright initiale des dix fichiers donne 54 réussites et
  quatre échecs cloud. Cause établie : sous Windows PowerShell, affecter une
  chaîne vide aux variables d’environnement les supprime ; `loadEnvConfig`
  recharge alors `.env.local`, tandis que le serveur utilisé est sans cloud.
  Avec une espace dans les deux variables, leur lecture après `trim()` est
  bien vide : les quatre scénarios réservés au cloud sont ignorés comme prévu.
  Aucun `.env.local` n’a été modifié.
- Sur la correction finale, le nouveau scénario clavier passe sur bureau et
  téléphone (2/2). La sélection complète est relancée avec la configuration
  sans cloud cohérente : **56 réussis, 4 ignorés, zéro échec, code 0** (60
  scénarios découverts ; dix fichiers, bureau et téléphone). Les quatre
  ignorés sont les parcours « avec le serveur » de `product-audit` et
  `scene-profile` sur les deux profils : aucun succès cloud n’est revendiqué.
  Commande : `npx playwright test e2e/navigation.spec.ts e2e/profile-complete.spec.ts e2e/scene-profile.spec.ts e2e/release-notes.spec.ts e2e/atelier-ritual.spec.ts e2e/craft-preview.spec.ts e2e/drop-craft-priorites.spec.ts e2e/finition.spec.ts e2e/portrait-credits.spec.ts e2e/product-audit.spec.ts --reporter=line`,
  avec `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` contenant
  chacun une espace pour conserver leur présence sous PowerShell tout en
  obtenant la configuration vide après `trim()`.
- `npm run build -- --webpack` sans cloud : code 0, six pages statiques.
  `npx cap copy android` : code 0. `node scripts/android-gradle.mjs assembleDebug -I ../scripts/meme-editor-test.gradle -PcdVersionName=42df5b4-navigation-local --max-workers=2 --console=plain` :
  **BUILD SUCCESSFUL**, 156 tâches (15 exécutées, 141 à jour), code 0.
  Signature APK v2 vérifiée par `apksigner verify --verbose`, code 0.
- APK locale corrigée : `android/app/build/outputs/apk/debug/app-debug.apk`,
  paquet **`com.creatordeck.app.memeeditor`**, version
  `42df5b4-navigation-local`, code 877105, 110 775 632 octets, SHA-256
  `721762b525688e0151d342b295340d2c9bea35eaaf77e4f74f40a3eea549c005`.
  Elle contient aussi le chantier Imgflip déjà présent dans le checkout ;
  c’est un artefact local sans cloud, **pas une nouvelle APK publique**.
- Cette APK isolée est installée par `adb install -r`. Dans sa WebView Android,
  six vérifications réussissent : Tab/Maj+Tab, Échap, restitution du focus,
  Retour Android natif, bouton « Fermer le bilan », conservation d’Objectifs
  après fermeture. Cinq verdicts de test ont réellement mené au bilan ;
  capture examinée `reports/navigation-42df5b4/android/correction-bilan.png`.
  Stockage restauré après l’essai. L’APK officielle `com.creatordeck.app`
  reste distincte et n’a pas été remplacée par cet artefact.
- `git diff --check` sur les fichiers du lot : code 0. Un scénario E2E ajouté
  et une assertion d’écran renforcée ; aucun test supprimé dans cette reprise.

## Limites et suites distinctes

Après ces vérifications, Malik a autorisé le retrait complet du reset et le
push ciblé sur main. Les exports clients inutilisés sont retirés et la migration
`0061_retrait_reinitialisation.sql` supprime uniquement la fonction SQL, sans
`CASCADE` ni effacement de données. Elle sera appliquée par le workflow existant
après CI verte ; son contrôle final exige aussi l’absence réelle de la fonction.
Le contrôle général cloud Imgflip
`CreatorDeck-Codex-xxo` est un autre chantier et n’est pas déclaré résolu.
Aucun essai sur téléphone physique, aucune écoute matérielle et aucun test de
connexion réelle ne sont revendiqués.
