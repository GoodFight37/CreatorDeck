# Drop : choisir et préparer un booster — D-129

Lot local du 16 octobre 2026, branche `codex/collaboration`, base vérifiée `88daf0cd4d7a08f4e27aa2f910b8d60a8ff7ddab`. Le commit du lot se retrouve par `git log -1 --format=%H -- src/components/booster-carousel.tsx`. Aucun push, merge, déploiement ou changement SQL effectué. Validation de Malik requise avant publication.

## Parcours livré localement

Drop démarre sur Live Drop. Le sachet Mèmes dépasse sur le côté ; un glissement horizontal, un appui sur le voisin, les boutons d’univers ou les flèches du clavier changent le choix. Le scroll vertical ne change pas le booster et ne l’ouvre pas.

Le sachet actif et le bouton d’ouverture affichent ensuite la présentation scellée. Retour et Échap ferment cette préparation ; le hook existant inscrit aussi cette fermeture dans la pile de retour natif. Aucun appel de tirage, aucune clé Mèmes et aucune dépense avant le geste validé. La déchirure achevée au relâchement ou « Ouvrir sans déchirer » engage le tirage une seule fois. La présentation reste montée jusqu’aux cartes. Après engagement, quitter une attente lente laisse le tirage vivre.

Mèmes affiche sa propre réserve et sa recharge, ses règles existantes et un lien vers son classeur. Une connexion est nécessaire pour ses tirages. Les étapes de révélation, les crédits et le classement du catalogue restent ceux de /memes. Les règles Twitch, Mèmes, Paquet Scène et leurs ressources ne sont pas mélangées. Le Binder unifié et le prototype fictif ne font pas partie de ce lot.

## Changements à relire

- `booster-carousel.tsx/.css` : sélection, voisin partiellement visible, glissement, clavier, blocage du clic après déplacement, petits écrans et mouvement réduit.
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

## Revue indépendante suivante

Dans son worktree propre, Claude peut se placer en HEAD détaché sur le commit Codex : les objets Git sont déjà partagés, sans fetch ni push. Vérifier d’abord son statut et préserver tout travail concurrent. Relire le diff à partir de la base indiquée, notamment le moment du tirage, Retour/focus, reprise idempotente, changement de compte et concurrence des lectures. Tester seulement un constat nouveau ou un risque insuffisamment couvert.

Le ressenti du carrousel, du sachet, des vibrations et des sons sur téléphone réel reste à juger par Malik. Aucune CI GitHub ni Vercel ne peut être annoncée pour le nouveau lot avant publication autorisée.
