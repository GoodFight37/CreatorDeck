# Passation CreatorDeck — Kyara

## Checkpoint local — 27 octobre 2026 : Anime intégré au jeu

### Transmission demandée sur main

Malik autorise explicitement le commit et le push sur `main` pour permettre la reprise par une autre IA. Le visuel actuel du booster est **refusé**, il doit être remplacé ; l’intégration reste limitée à vingt cartes par erreur de reprise de l’échantillon. Le catalogue importateur indiqué par cette passation contient 1 020 cartes (Malik évoque 1 200 : vérifier la source avant raccordement). La réserve et les possessions serveur Anime restent à réaliser. Ne pas annoncer l’intégration comme un univers serveur achevé.

Malik précise que la contrainte d’illustration de son brief concernait le booster : un packaging original sans personnages/logos de licences ; elle ne devait pas servir à réduire le nombre de cartes intégrées. Il exclut toute APK locale et demande une transmission rapide avec les vérifications utiles, sans refaire les contrôles déjà verts.

Fichiers du visuel à reprendre : `public/packs/anime-opening.svg` (source), `public/packs/anime-opening.webp` (rendu), `scripts/build-pack-webp.mjs` (génération), `src/components/anime-opening.css` (habillage Anime), `src/app/booster-continuity.css` et `src/components/booster-carousel.css` (matière, forme et position), `src/components/pack-tear.tsx` (découpe physique). Les deux branchements du média sont `booster-carousel.tsx` et `anime-booster-opening.tsx`. Cibler Anime dans les styles pour préserver les autres sachets.

Malik a demandé l’intégration dans CreatorDeck et un booster Anime dédié, puis explicitement exclu toute construction d’APK locale. Travail local non commité, non poussé, non déployé ; base du code `2b821b3d28152b05f3d6fd9cab55e8399b2ce0d1`.

- Le carrousel Drop propose désormais Anime comme quatrième univers. `AnimeBoosterOpening` utilise les composants partagés `MemeBoosterOpening`, `PackTear` et `MemeReveal` ; les comportements MEMES/Imgflip par défaut sont conservés.
- Cartes à grandes illustrations intégrales, nom et série dans un cartouche compact, finitions par rareté ; récapitulatif horizontal et inspection dans `/anime`. Booster abstrait original, SVG source et WebP pour le carrousel.
- Catalogue intégré : **20 cartes de la sélection locale**, pas les 1 020 du catalogue importateur. Médias sous `public/anime/`. Provenance et statut `licenseStatus: unknown` conservés dans `src/data/kyara-preview.json`.
- `useAnimeBooster` conserve les exemplaires dans `creatordeck.anime.collection.v1`. Ce lot est une intégration locale : ouverture libre, cinq cartes distinctes par mélange uniforme de la sélection, aucune réserve ou probabilité serveur Anime, aucune synchronisation des possessions avec Supabase. Ce n’est pas un univers serveur prêt à publier.
- Vérifié en navigateur : ouverture complète depuis le vrai Drop, cinq révélations, récapitulatif, retour/focus, collection `5 / 20`, inspection et fermeture Échap. Captures `.codex-attachments/anime-game-{drop,sealed,reveal,recap,collection}-390.png` et `anime-game-drop-929.png`.
- Tests : `typecheck` réussi ; test unitaire Anime 1/1 ; suite écran `ecrans-meme-reveal` 4/4 ; E2E téléphone « Anime ouvre cinq cartes… » réussi (23,5 s). Non-régression téléphone du sélecteur : 3/3 réussis, dont responsive 320/390/1024 et opacité pendant la bascule.
- L’export `out/anime.html`, le sachet et 20 médias ont été constatés après compilation ; l’ancien `/kyara-preview` reste exclu par le script existant. Aucun test natif ni APK construit/installé ; les tentatives `android:sync` ont été interrompues. Préserver les changements Android préexistants.
- Avant une publication : définir les règles serveur Anime, intégrer le catalogue retenu et établir les droits des illustrations. Aucun droit n’est déduit de leur disponibilité publique.

Les sections ci-dessous décrivent la passation initiale et restent historiques.

> Préparée le 24 octobre 2026. Destinataire : agent qui reprend CreatorDeck.
> Objet : raccorder le travail réel de CreatorDeck-Importer au jeu, sans refaire l'analyse ni annoncer une intégration déjà livrée.

## Goal — résultat attendu

Réutiliser les **1 020 cartes réelles de Kyara et leurs images locales** ainsi que le prototype original de booster. Préparer d'abord une intégration locale isolée dans CreatorDeck, compatible avec ses conventions actuelles. Cette passation n'autorise ni une nouvelle collecte, ni une migration Supabase, ni une publication.

## Current State — faits vérifiés

**Fonctionne :**
- Import terminé : 20 cartes initiales + 1 000 supplémentaires, 1 020 identifiants distincts, `synthetic: false`, `status: completed`.
- Le 24 octobre, les 1 020 fichiers ont été relus et leurs SHA-256 comparés au catalogue : tous concordent ; 30 925 914 octets. WebP de largeur 345 px, hauteurs variables de 492 à 580 px ; décodage vérifié lors de l'import du 23 octobre.
- Exemples : `kyara:127691` Satoru Gojou, JUJUTSU KAISEN, mythic ; `kyara:45627` Levi ; dernière carte `kyara:124546` Shirase Kobuchizawa, A Place Further Than the Universe, epic.
- Répartition de cet échantillon classé par popularité : 203 mythic, 471 legendary, 346 epic. **Ce ne sont pas des probabilités de booster.**
- Dernière suite complète importateur exécutée le 23 octobre : **90 tests réussis, aucun ignoré**. Elle n'a pas été relancée pour cette passation documentaire.
- Démo originale : cinq révélations progressives, effets par rareté, récapitulatif et meilleure carte, clavier, petit écran et mouvement réduit. Parcours navigateur vérifié avec les 20 premières vraies cartes et images locales.
- REA MCP **6.7.0** a réellement fonctionné après redémarrage de Codex : 207 outils, version alignée, scénario wiki terminé. L'ancien exécutable global `rea` reste en 3.2.1 : utiliser le MCP, pas ce raccourci obsolète.

**Pas encore livré / non vérifié :**
- Aucun adaptateur Kyara ni catalogue Kyara raccordé au jeu principal. L'export porte encore `compatibility: proposal-not-validated-against-main`.
- Aucune validation Android native de cette démo ; les tests PC/mobile sont des tests navigateur.
- La vraie ouverture Kyara a été observée pendant une action manuelle de l'utilisateur. Chrome avait `prefers-reduced-motion: reduce` : les durées et effets complets en mouvement normal ne sont pas mesurés.
- Le wiki affichait 6 736 cartes, le booster standard 6 457 : périmètres distincts, catalogue intégral non importé.

## Files in Play — chemins et contrats

Racine importateur : `D:\Coding\CreatorDeck-Importer-main`.

| Chemin relatif à l'importateur | Rôle |
|---|---|
| `data/kyara-real/catalog.json` | **Catalogue complet à utiliser : 1 020 cartes.** Schéma `creatordeck.cards/1`. |
| `data/kyara-real/images/` | 1 020 WebP locaux rangés par SHA-256. |
| `data/kyara-real/catalog.sqlite3` | Base persistante ; run initial 1, lots supplémentaires 2 à 21. |
| `data/kyara-real/verification-1020.json` | Vérification complète datée du 23 octobre. |
| `data/kyara-real/index.html` | Aperçu hors ligne et liens vers les 20 galeries de 50. |
| `data/kyara-real/lot-01.json` à `lot-20.json` | Lots réels de 50, utilisables dans la démo. |
| `data/kyara-real/cards.json` | **Ancien lot de 20**, conservé ; ne pas le prendre pour le catalogue complet. |
| `creatordeck_importer/kyara.py` | Validation, provenance, import/reprise, images publiques, export, galerie ; limite de 50 conservée. |
| `creatordeck_importer/kyara_batch.py` | Orchestration reprenable de l'opération exacte « +1 000 ». |
| `demo/kyara-booster/{index.html,app.js,style.css,README.md}` | Démo indépendante, sans code ou habillage propriétaire Kyara. |
| `tests/test_kyara.py`, `tests/test_kyara_batch.py`, `tests/test_kyara_booster.py` | Tests de validation, erreurs, reprise et interface. |
| `tests/kyara_real_check.py` | Vérification navigateur du lot initial réel de 20 ; pas du catalogue complet. |
| `docs/KYARA_1000.md`, `docs/KYARA_REAL.md` | Rapports actuels ; `docs/KYARA.md` est historique. |
| `docs/observations/kyara-manual-booster-result.json` | Résultats visibles de l'ouverture manuelle ; résumé de trace voisin. |

Chaque carte conserve `id`, `name`, `series`, `rarity`, `catalog_rank`, `detail_locked`, `provenance` et `image` (`url`, `local_path`, `sha256`, `mime_type`, `byte_length`, statut). Provenance = page observée, date, source exacte et périmètre d'expérimentation. Statuts de licence enregistrés `unknown`, sans inventer d'autorisation éditeur.

**Transport vers le jeu :** `image.local_path` est un chemin Windows absolu de cette machine, pas une URL utilisable par Next.js/Android. Copier seulement les médias nécessaires à un essai isolé et produire des URL locales relatives ; vérifier les hashes et conserver la provenance dans le manifeste. Les données et images locales sont ignorées par Git : un clone seul ne les contient pas.

## Contexte CreatorDeck retrouvé

- Dépôt principal : `C:\Users\Administrator\Desktop\CreatorDeck`. Le 24 octobre, HEAD local **et main distant** vérifiés à `4737dad5f2eda0c6e99f1523f23061788fe98597`.
- `C:\Users\Administrator\Desktop\CreatorDeck-Codex` est sur `codex/phase2-completion`, annoncé **78 commits derrière** le suivi distant, avec beaucoup de changements locaux et renommages indexés. Ne pas y basculer, nettoyer ou synchroniser aveuglément.
- Le principal contient aussi des changements locaux, notamment quatre captures de déchirure : les préserver. Aucun index, branche ou code du jeu n'a été modifié pour cette passation.
- Lire `AGENTS.md`, `docs/README.md`, le premier checkpoint de `docs/agent-handoff.md`, `docs/roadmap.md`, `docs/perimetre.md` avant l'implémentation.
- Notes retrouvées : `C:\Users\Administrator\Desktop\Rapport-CreatorDeck.md` (audit externe du 22 octobre). Certaines recommandations ont déjà été corrigées ou infirmées dans les passations plus récentes : ce rapport n'est pas une liste de défauts encore ouverts. Ne pas relancer cet audit.
- Points de réutilisation repérés en lecture seule dans le principal : `src/lib/memes.ts` (six valeurs de rareté identiques, mais `MemeCard` n'est pas le contrat Kyara), `src/lib/imgflip-booster.ts`, `src/hooks/use-imgflip-booster.ts`, `src/components/meme-booster-opening.tsx`, `src/hooks/use-pack-opening.ts`, `src/components/pack-tear.tsx`.
- Le type actuel `MemeCard.sourceName` n'accepte que `"Imgflip"` et ce modèle comporte des légendes de mèmes. Ne pas injecter silencieusement les cartes Kyara dans `MEME_CARDS` ou les identifiants Twitch. Prévoir un univers/local preview explicite en réutilisant la présentation adaptée.
- Tirage, réserve et possessions en ligne restent décidés par le serveur. Le hook Imgflip actuel utilise déjà une API cloud ; d'anciennes notes parlant de tirage uniquement local sont dépassées.

## What Has Been Tried (and Why It Failed)

- Le prototype initial de 24 cartes fictives ne répondait pas à la demande : il est remplacé pour toute preuve d'import par les vrais exports ci-dessus. Ne pas réutiliser `data/kyara-prototype.json` comme résultat Kyara.
- L'interpréteur Python système n'avait pas `httpx` ; utiliser `.venv\Scripts\python.exe`, qui a les dépendances.
- Une erreur de DNS dans le bac à sable (`getaddrinfo failed`) n'était pas une restriction Kyara ; l'import borné a ensuite abouti avec l'accès réseau autorisé.
- Le Chromium Playwright téléchargé était absent ; les tests utilisent le Chrome installé (`channel="chrome"`). Ne pas réinstaller des navigateurs pour rien.
- Les fiches détaillées sont verrouillées et `/api/` est exclu par robots. La collecte réussie repose sur les lignes réellement affichées du wiki public via « Afficher plus » et les URL d'images observées, sans contournement.

## Current Best Theory — approche à reprendre

Une prévisualisation locale alimentée par un adaptateur explicite du véritable export est faisable : les identités, métadonnées et fichiers sont déjà disponibles. Réutiliser les composants de révélation du jeu et la progression originale du prototype ; ne pas remplacer toute l'ouverture existante. Séparer rareté source, choix visuels et éventuelles règles futures de tirage. Aucun taux ne se déduit des 1 020 cartes sélectionnées par popularité.

La démo importateur accepte **5 à 50 cartes**, choisit les cinq premières de manière déterministe et charge les images sélectionnées par correspondance SHA-256 ; elle ne lit pas les chemins absolus et n'effectue aucune requête distante. Pour essayer : utiliser `lot-01.json` et ses 50 images locales. Ne pas lui donner directement les 1 020 cartes et ne pas présenter son choix déterministe comme un tirage de production.

## Next Steps — reprise concrète

1. Revérifier branche, HEAD et travail local du checkout CreatorDeck choisi ; lire son checkpoint récent. Les SHA ci-dessus sont des observations datées.
2. Ouvrir l'aperçu existant : depuis `D:\Coding\CreatorDeck-Importer-main`, lancer `rtk proxy .venv\Scripts\python.exe -m http.server 8767 --bind 127.0.0.1`, puis visiter `http://127.0.0.1:8767/data/kyara-real/index.html` et `/demo/kyara-booster/`. Vérifier si le port est déjà utilisé ; ne pas tuer un serveur inconnu.
3. Pour le premier raccordement, partir d'un lot réel de 20 à 50. Définir l'adaptateur et tester identifiants uniques, raretés, résolution locale des images et préservation de provenance. Préserver le catalogue complet en entrée ; aucun nouveau téléchargement nécessaire.
4. Brancher une prévisualisation isolée aux composants existants : ouverture, cinq révélations, verrouillage des actions pendant les transitions, meilleure carte, récapitulatif, retour et mouvement réduit. Aucune écriture dans les possessions ou la réserve du joueur.
5. Tester le parcours visible PC/mobile, clavier et mouvement réduit ; pour toute revendication Android, lancer réellement l'APK sur émulateur conformément à `AGENTS.md`. Les tests précédents de l'importateur ne valident pas ce nouveau raccordement.
6. Ensuite seulement, proposer le contrat de catalogue et le plan de règles serveur pour un univers jouable. Garder les changements Supabase, les taux et la publication dans un lot explicitement autorisé.
7. Si une nouvelle extension est demandée : dédupliquer contre **tous les IDs de `catalog.json` (1 020)**. `kyara_batch.py` rejoue l'opération +1 000 initiale ; le relancer ne collecte pas 1 000 nouvelles cartes. Garder les lots de 50, reprises, temporisation et arrêts 401/403/429.

## Key Constraints

- L'utilisateur demande des résultats réels et réutilisables, pas des fixtures fictives ni un nouvel audit juridique générique. L'incertitude de licence seule n'empêche pas l'analyse technique publique locale.
- Ne contourner ni authentification, CAPTCHA, verrouillage de fiche ni restriction explicite ; ne pas automatiser le jeu. L'utilisateur opère lui-même tout booster Kyara nécessaire à l'observation.
- Pas de copie du code ou des éléments graphiques propriétaires de Kyara dans CreatorDeck ; conserver une implémentation originale.
- Pas de nouvel import massif, achat ou publication implicite. Aucun média Kyara n'a été publié par ce chantier.
- Préserver tous les changements préexistants de l'importateur, notamment les travaux MyMemeCards/Imgflip, ainsi que ceux des worktrees du jeu. Pas de reset, nettoyage global, commit ou push pour cette passation.
- Ce fichier est une note locale de reprise : ne pas le committer automatiquement. La copie documentaire côté jeu est `docs/passation-kyara.md`.

## Memory Pointers

Projet mémoire : `CreatorDeck-Importer-main`. Utiliser recherche → timeline → observations sélectionnées.
- **#1217** : import +1 000 terminé, images et tailles vérifiées.
- **#1216** : suite de 90 tests réussie le 23 octobre.
- **#1222** : prochain incrément à dédupliquer contre le catalogue complet, pas l'ancien lot de 20.
- Recherches utiles : `Kyara 1020 catalog` ; `Kyara native REA manual booster`.
