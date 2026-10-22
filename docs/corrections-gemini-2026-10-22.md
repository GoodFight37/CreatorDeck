# Corrections après contre-expertise Gemini — 22 octobre 2026

État : corrections locales, sans commit ni publication. Base locale `c60a8ca500ff7ccb4af5d2a80b4e26963f372686` ; main distant avancé à `3647867bee92a80e97ff80f2316ab5a38de049e9` (archivage Upscayl/prototypes par Claude). Commit distant examiné sans basculer le checkout ni modifier l'index préexistant. Les travaux locaux Imgflip restent distincts.

## Changements effectués

| Constat de l'audit | Correction et limites |
|---|---|
| 1.1 Sessions | Un seul refresh par session/jeton ; HTTP 429/5xx conserve la session ; résultats périmés ignorés après logout ou changement de compte. Contrôles du compte et du jeton avant toute écriture. |
| 1.2 refresh-live | Rejet des bearers inconnus ; clés publiques/service legacy et nouvelles nomenclatures reconnues ; diagnostic/push toujours réservés au service. Réservation atomique de 90 s conservée. Contrat du client actuel confirmé : il envoie la clé publique. La vérification d'une clé publique n'est pas une protection complète contre les abus. |
| 1.3 Export Android local | Décodage base64 en flux vers un fichier temporaire privé ; suppression du gros paramètre avant SAF ; options persistées réduites au nom temporaire ; copie en flux après le choix de destination ; suppression du temporaire après succès, refus ou annulation. Limites et contrôles de format conservés. |
| 2.1 Portraits | Le script existant de post-build exclut de out/ les 454 originaux masqués, seulement après contrôle de présence de leur remplacement manuel. Sources conservées dans public/ ; mapping/crédits conservés. Gain mesuré : 7 539 940 octets bruts. Archives Upscayl déjà traitées par le commit distant de Claude. |
| 2.3 Dépendances | Renderer Three non appelé supprimé ; three et @types/three retirés de main avec mise à jour ciblée du lockfile. googleapis était seulement un ajout local non publié : retiré localement, il était déjà absent du main de référence. La dépendance locale gifenc est préservée dans le travail Imgflip, mais exclue du lot publié. |
| 3.1 Champs tactiles | Les cinq catégories de champs repérées passent à 16 px sous pointer:coarse ; pincement/zoom conservés. Mesure Chromium tactile : 16 px, pas de débordement global à 390 px ; Safari réel non testé. |
| 3.2 Horloges | Objectifs passe à une vérification par minute : retard maximal accepté d'une minute au changement de jour, toujours défini à 6 h UTC. Compteur Mèmes isolé pour ne plus rafraîchir toute la collection chaque seconde. |
| 3.4 Focus | Hook existant étendu : tous les contrôles focusables utiles, Échap facultatif, priorité à la modale visible au-dessus, isolation des frères plutôt que des ancêtres. Compte, Marché et Arène raccordés ; retour du focus et restauration du fond. Éditeur dans dialog natif inchangé. |

Note joueur ajoutée : `2026-10-22-session-feuilles`. Pas de changement des règles de tirage, dépenses, données serveur ou logique de sauvegarde.

## Défaut Android supplémentaire prouvé pendant la correction

Premier essai volumineux : crash `TransactionTooLargeException`, parcel **114 272 520 octets**, dont `capacitorLastPluginCallOptions` et `capacitorLastPluginCallBundle` d'environ 57 Mo chacun. Cause : Capacitor sérialise les options de l'appel pendant l'ouverture de DocumentsUI ; le base64 y figurait. Le décodage en flux seul ne corrigeait pas ce crash. Le passage par cache privé et le retrait de `base64` du PluginCall avant SAF le corrigent.

Essai final API 36, paquet isolé `com.creatordeck.app.memeeditor` : PNG valide aléatoire **21 096 236 octets**, enregistrement SAF réel, comparaison intégrale des octets réussie ; SHA-256 `6f00845d9a3c835b6bba2e5dbc8f4d0a0d2ba158a931772f6dd596f893c75859`. Annulation respectée, mauvais format refusé, cache temporaire nettoyé. Commande reproductible : `node scripts/test-meme-export-stream-android.mjs`. Aucun compte réel ni remplacement du paquet officiel.

Limite : le bridge transporte toujours une chaîne base64 ; ce test ne prouve pas une immunité OOM sur tout matériel. Un kill pendant SAF peut laisser un temporaire dans le cache privé, nettoyable par Android. L'éditeur et son plugin sont du travail local non publié ; cette validation n'autorise pas la publication du reste du chantier Imgflip.

## Vérifications exécutées

- `npx tsc --noEmit` : code 0. Build statique ci-dessous comprend aussi le typecheck final.
- `npx vitest run --maxWorkers=2` : **1 343/1 343**, 98 fichiers, code 0 hors blocage sandbox des dépôts Git jetables. Premier run sandbox : 11 échecs de permission, 1 332 réussis ; relance complète hors sandbox verte.
- `npx vitest run --config vitest.ecrans.config.mts --maxWorkers=2` : **240/240**, 36 fichiers, code 0. Puis deux cas Marché ajoutés : suite ciblée `src/ecrans-social-sync.test.tsx` **11/11**, code 0 (soit deux scénarios supplémentaires au total). Avertissements act/createRoot préexistants.
- `npx playwright test e2e/navigation.spec.ts --reporter=line`, variables cloud neutralisées : **16/16**, code 0, dont clavier compte imbriqué dans Réglages et Arène, bureau/téléphone.
- `npx playwright test e2e/pack-tear.spec.ts e2e/memes.spec.ts e2e/meme-editor.spec.ts e2e/profile-complete.spec.ts e2e/release-notes.spec.ts --reporter=line`, même configuration : **79 réussis, 9 ignorés, zéro échec**, code 0. Scénarios cloud/conditionnels ignorés non revendiqués comme validés. Pas une suite E2E intégrale.
- ESLint ciblé des composants/hooks/API/tests puis scripts : code 0 ; `git diff --check` : code 0.
- `npm run build -- --webpack` : code 0, six pages générées. Attention : le script build actuel possède plusieurs commandes ; cet argument est arrivé au post-build, **le build réel était Turbopack**, comme son journal le confirme. Aucun build Webpack final n'est revendiqué.
- `node scripts/prune-prototypes.mjs` après build : 454 fichiers masqués exclus, 7 539 940 octets ; second passage 0 fichier (idempotence). Vérification avec la fonction réelle creatorPortraitUrl : **1 000 chemins exportés présents**, 454 doublons absents de out/, 454 sources toujours présentes.
- Gradle `assembleDebug -I ../scripts/meme-editor-test.gradle -PcdVersionName=gemini-corrections-local --max-workers=2 --console=plain` : code 0, 156 tâches. Build Java final après correction du parcel : 10 exécutées, 146 à jour. Premier lancement sandbox interrompu après blocage cache, relance hors sandbox réussie.
- Captures Chromium 390 px examinées : `reports/gemini-binder-mobile.png`, `reports/gemini-compte-mobile.png` ; champ 16 px, pas de débordement global. Capture native `reports/gemini-export-native.png`. L'APK isolée vérifie le plugin Java corrigé ; ses assets web n'ont pas été resynchronisés après les corrections frontend, lesquelles sont vérifiées dans le navigateur local.

## Recommandations non appliquées aveuglément

- 2.2 : retrait client streamer encore à réaliser comme lot de migration de sauvegarde distinct ; aucune purge des migrations/tests serveur historiques.
- 2.4 et 2.5 : pas de debounce des sauvegardes ni de réécriture du peel sans profilage ; risques de perte de progression ou de changement des gestes supérieurs au gain non mesuré.
- 3.3 et 3.6 : code splitting et décalage audio restent des optimisations à mesurer, pas des corrections de panne démontrée. Préchargement audio préservé pour la première action sonore.
- 3.5 : aucune configuration lucide ajoutée, optimisation déjà active.

## Publication

Malik a explicitement autorisé la publication Auth/Edge le 22 octobre 2026. Le lot est préparé sur main `3647867bee92a80e97ff80f2316ab5a38de049e9`, en copie isolée et index temporaire : l'index partagé (699 renommages déjà publiés) et les travaux Imgflip restent intacts. Le plugin Android corrigé et son test restent locaux avec l'éditeur non publié ; ils ne sont pas ajoutés seuls à l'application officielle.

Validation du contenu exact destiné à main : tsc/lint/build statique verts, **1 340 unitaires** (les trois tests de l'éditeur local sont exclus), **242 écrans**. Les quatre références de captures Windows déjà présentes localement sont utilisées uniquement dans la copie de test et ne sont pas publiées. La suite E2E complète tourne sur un serveur dédié 3100. L'accès CLI Supabase fonctionne, cible CreatorDeck `yzxchpybqrfegvecihxf` confirmée contre l'URL publique ; refresh-live est en version 9, ACTIVE, verify_jwt=false avant déploiement. Pas de changement de données/migration ni de déploiement notify-live prévu.

Sources officielles consultées pour les nouvelles variables Edge : [environnement des fonctions](https://supabase.com/docs/guides/functions/secrets), [migration des clés](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys). Outils : RTK, Beads, lecture locale, Vitest, Chromium Playwright, émulateur API 36, Gradle et skill mobile-native. Aucun appel de modèle tiers.

Déploiement Edge effectivement réalisé après l'accord : refresh-live **v10 ACTIVE**, verify_jwt=false, projet CreatorDeck confirmé. notify-live reste v5. Essais réels : bearer invalide → 401 ; clé publique sur ?check=1 → 403 ; rafraîchissement public → 200 et ok=true. Source déployé SHA-256 `14da07fefe57f8673c475c7eaa6127c5e29a2434091c5731d9e0bead73d9f168`. Pas de migration ni de modification de données de joueur.

Validation finale de publication : suite E2E intégrale de la copie propre **199 réussis, 23 ignorés cloud/conditionnels, zéro échec**, code 0, 222 scénarios, 17,2 minutes. Les deux tests Node du commit distant `0b9a7d05` passent également ; ce commit devient le parent sans aucun chevauchement applicatif. Compteurs propres du lot : 1 340 unitaires et 242 écrans, tous verts. Aucun test ignoré n'est compté comme réussi.
