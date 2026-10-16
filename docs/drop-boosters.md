# Drop : choisir et préparer un booster — D-129

Lot D-129 livré le 16 octobre 2026 depuis `codex/collaboration` sur `main`, commit `8d99eabd7d016e5a68ba7dbe1510ae5b10e2946b`, base `88daf0cd4d7a08f4e27aa2f910b8d60a8ff7ddab`. Push normal vérifié sur GitHub. Vercel Production `READY`, déploiement `dpl_7w6o3KvQA9fhqJvk7hK5ojWZebff`, alias `creator-deckk.vercel.app`. Aucun changement SQL.

## Évolution D-132 — sélection simplifiée et rituel prioritaire

La mise à jour D-132 garde les pills Live Drop/MEMES comme seule façon de
changer de booster. Le swipe, les flèches et le clic sur le pack voisin sont
retirés ; le voisin reste une illustration décorative atténuée. Le booster
actif est le seul pack dominant et le seul bouton de préparation. « Plus
d’infos » est plus discret. Dans la scène scellée, « Ouvrir sans déchirer »
reste un lien de secours visuellement secondaire avec sa cible tactile
accessible ; « TIRE » / « RELÂCHE », les protections anti-saut et
`PACK_TEAR_MS` (1 200 ms) restent inchangés. La validation physique reste
ouverte.

## Parcours livré localement

Drop démarre sur Live Drop. Le sachet Mèmes peut rester une illustration secondaire en bordure ou sortir du premier regard sur les écrans étroits. Seules les pills changent le choix ; le scroll vertical ne change pas le booster et ne l’ouvre pas.

Le sachet actif et le bouton d’ouverture affichent ensuite la présentation scellée. Retour et Échap ferment cette préparation ; le hook existant inscrit aussi cette fermeture dans la pile de retour natif. Aucun appel de tirage, aucune clé Mèmes et aucune dépense avant le geste validé. La déchirure achevée au relâchement ou « Ouvrir sans déchirer » engage le tirage une seule fois. La présentation reste montée jusqu’aux cartes. Après engagement, quitter une attente lente laisse le tirage vivre.

Mèmes affiche sa propre réserve et sa recharge, ses règles existantes et un lien vers son classeur. Une connexion est nécessaire pour ses tirages. Les étapes de révélation, les crédits et le classement du catalogue restent ceux de /memes. Les règles Twitch, Mèmes, Paquet Scène et leurs ressources ne sont pas mélangées. Le Binder unifié et le prototype fictif ne font pas partie de ce lot.

## Changements à relire

- `booster-carousel.tsx/.css` : sélection par pills uniquement, voisin décoratif discret, petits écrans et mouvement réduit.
- `drop-view.tsx` : carrousel et panneau de l’univers sélectionné, réserve Mèmes, accès au compte et au classeur.
- `creator-deck-app.tsx` : préparation Live distincte du tirage, focus initial conservé jusqu’à la révélation.
- `pack-tear.tsx` : Retour avant engagement, Échap et ordre des callbacks compatible avec le mouvement réduit. Les seuils de peel sont conservés.
- `use-meme-booster.ts` et `meme-booster-opening.tsx` : contrôleur commun à Drop et /memes. Clé idempotente conservée après réponse perdue ; résultat disponible même si la lecture de réserve suivante échoue ; réponses d’un ancien compte ou d’une lecture antérieure au tirage écartées. Le changement de compte ferme sa présentation.
- `meme-deck.tsx` : reprend ce contrôleur, conserve sa recherche, pagination, fiche et collection.
- Note joueur `2026-10-16-choix-boosters`, décision D-129, défaut de lecture après tirage dans `known-issues.md`, roadmap et passation.

## Captures contrôlées

Captures Chromium/Edge avec RPC factices, pas téléphone physique. L’indicateur de développement Next a été masqué pour ces images uniquement.

- [Live Drop, 320 × 568](captures/d129/drop-live-320.png).
- [Mèmes, 390 × 844](captures/d129/drop-memes-390.png).
- [Préparation Live avec Retour](captures/d129/preparation-live.png).
- [Préparation Mèmes avec Retour](captures/d129/preparation-memes.png).

Le premier contrôle visuel a révélé un libellé trop haut et le CTA trop bas à 320 px. Les sélecteurs CSS et la taille du sachet aux faibles hauteurs ont été corrigés. Les tests vérifient le centrage, le voisin visible, l’absence de débordement et le CTA au-dessus de la barre du bas à 320/390/1024 px. Aucun changement du dessin du sachet.

## Vérifications exécutées

Tous les runs ont utilisé la base ci-dessus avec le diff D-129 local ; le code du commit final correspond à ce diff. Dépendances du worktree installées par `npm ci`, lockfile inchangé. Aucun outil supplémentaire installé. Le navigateur est Edge installé, piloté par Playwright ; configuration temporaire hors dépôt, serveur du worktree sur le port 3100. Les variables publiques factices reprennent le workflow Vérification, et les RPC sont interceptées dans les tests. Aucune opération en production.

- `npm run ecrans -- --maxWorkers=2` : **188/188**, 30 fichiers. Deux avertissements React `act` dans un scénario de réinitialisation, sans échec. Après ajout de deux cas de course et finalisation des états, `npm run ecrans -- src/ecrans-meme-booster.test.tsx src/ecrans-pack-pending.test.tsx src/ecrans-release-notes.test.tsx --maxWorkers=2` : **13/13**, dont sept cas Mèmes. Pas de seconde suite générale.
- `npm test -- src/lib/release-notes.test.ts` : **8/8**.
- `npm run e2e -- --config <config-temporaire-Edge> e2e/booster-selector.spec.ts e2e/memes.spec.ts --project=téléphone`, cloud factice : **8 réussis, 1 ignoré** (cas réservé au tirage local). Choix, scroll tactile vertical CDP, Retour sans RPC, cinq cartes Mèmes, un seul appel et réserve à 3/4, classeur à 5/2151, page /memes et reflets.
- Contrôles Live sans cloud : six scénarios réussis (mouvement réduit du nouveau parcours, boucle BGM, gain BGM, continuité de la scène, révélation stationnaire, nom accessible). Trois contrôles historiques du Drop ont d’abord échoué sur leurs anciennes hypothèses : CTA unique malgré le panneau masqué, débordement visible hors carrousel et long glissement supposé sans sélection. Ils ont été alignés sur le choix d’univers et le panneau actif. `npm run e2e -- --config <config-temporaire-Edge> e2e/drop-craft-priorites.spec.ts --project=téléphone --grep 'Drop garde|Drop conserve|ombre suit'` : **3/3**.
- Dernier contrôle du parcours sur les deux projets : `npm run e2e -- --config <config-temporaire-Edge> e2e/booster-selector.spec.ts --project=téléphone --project=bureau --grep 'choix au doigt|Retour et Échap|Mèmes se prépare|voisin reste'`, cloud factice : **8/8**. Captures ci-dessus.
- `npm run typecheck`, `npm run lint`, `node scripts/check-jargon.mjs` et `npm run build` réussis. Build sans configuration Supabase : export statique de six pages, aucune connexion réelle revendiquée.
- `git diff --check` brut : code 0. Le fichier Drop possède déjà des fins de ligne mixtes dans la base ; celles des lignes existantes ont été préservées, les ajouts sont en LF, sans changement global de configuration.
- Aucune migration, catalogue ou règle de tirage modifiés : suites SQL et catalogue non relancées. Pas d’APK ni d’essai tactile physique.

## Revue indépendante effectuée

Claude a relu le diff au SHA `921d71752d8e824eafc9afecc09a9c9a2039b426` et n’a relevé aucune régression. Le cas M1 « retour après réponse réussie » et celui « retour avant réponse » sont couverts; Codex a exécuté le test d’écran ciblé, 8/8. Claude n’a pas relancé de tests. La décision D-129 précise la transition de musique en scène « pack » pendant l’ouverture Mèmes sur Drop et `/memes`, puis « hub » à la fermeture; aucune règle antérieure ne l’interdit.

Le ressenti du carrousel, du sachet, des vibrations et des sons sur téléphone réel reste à juger par Malik. Prochaine étape : essai sur téléphone de la Production publiée, puis corrections ciblées sur retours concrets.

## Correction du swipe après retour joueur — 16 octobre 2026

Sur la Production publiée, Malik observe que le sachet suit légèrement le doigt puis revient sans changer de booster. Reproduction avec un véritable événement tactile Playwright : la perte de capture du bouton enfant remontait jusqu'au stage et annulait le geste avant pointerup. Le seuil de sélection (45 px) rendait aussi les gestes courts muets. Le stage ignore désormais la perte de capture de ses descendants; le seuil tactile est adapté au téléphone, les deux sens de glissement alternent les deux boosters, et le visuel suit davantage le doigt. Le nom du sachet et les commandes du sélecteur sont `MEMES`, sans accent. Contrôle Playwright téléphone sous Edge, swipe gauche→droite puis droite→gauche, clavier et bouton, sans RPC d'ouverture : 1/1 réussi. Cela ne valide pas le ressenti tactile sur le téléphone de Malik.


## D-130 — focus visuel du carrousel — 16 octobre 2026

Le booster sélectionné gagne légèrement en taille ; Live Drop et MEMES restent visibles dans des boutons plus compacts, avec une cible d’au moins 44 px. Le texte « Glisse pour choisir · touche pour préparer » a été retiré parce qu’il répétait les commandes déjà présentes. Les tranches 3D et le parcours d’ouverture n’ont pas changé.

Le scénario Playwright téléphone sous Edge réussit 1/1 et vérifie le focus, la dominance du sachet sur son voisin, l’absence d’aide répétée et la place du CTA sur 320, 390 et 1024 px. Cela ne valide pas le ressenti sur téléphone physique.
