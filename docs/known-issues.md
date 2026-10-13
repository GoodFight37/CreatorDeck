## Cinq échecs DOM corrigés après les changements de layout — 13 octobre 2026

## Ouverture avant relâchement / languette instable — 13 octobre 2026

Retour sur `180827ba` : le seuil était exécuté dans pointerMove ; angle calculé
sur deux points successifs et bounds relus sur une scène inclinée, donnant des
variations brusques. Correction : déclenchement dans pointerUp uniquement,
repère figé, angle global et interpolation courte. Cancel n’ouvre jamais.
Test navigateur maintient la coupe suffisante 350 ms avant de lever le doigt.
Validation du ressenti sur téléphone encore attendue.

## Peel trop linéaire — 13 octobre 2026

Problème joueur démontré : `abs(deltaX)/(width*.55)` et fente horizontale fixe
font sentir une jauge. Correction ciblée : zone tactile haute, trace X/Y,
clips des pièces suivant la trace, rabat sous le geste ; seuil de surface
ouverte et repli au relâchement. Tests navigateur dédiés ; acceptation du
ressenti par Malik sur téléphone encore requise. Aucun résultat esthétique
sur appareil réel revendiqué. [Détails](booster-peel-guide-2026-10-13.md).

Accès aux thèmes et découverte depuis Binder vide restaurés, indication Live
explicitée et marquage du Tribunal ajusté. Titres compacts Gemini conservés avec
assertions exactes actualisées. [Détail et preuves](correctifs-interface-2026-10-13.md) :
116/116 DOM, typecheck/lint/build et 26 scénarios navigateur vérifiés. Deux
cas navigateur cloud non exécutés localement ; nouvelle CI à confirmer.

## Ouverture : correction après essai téléphone — 13 octobre 2026

Retour réel : sachet trop brillant et attente parfois bloquée. D-063 coupe
la 3D par défaut, remplace seulement l'impression d'ouverture, supprime le
sheen ajouté et garantit une fin d'extraction indépendante des effets audio.
Secours manuel et sortie de l'attente réseau sans second tirage ajoutés.
[Diagnostic et preuves](booster-clean-2026-10-13.md). K-047 garde sa validation
visuelle sur téléphone ; le correctif ne prétend pas reproduire Pocket.
Les paragraphes suivants décrivent les étapes précédentes.

## Ouverture hybride — 13 octobre 2026

Le sachet dispose désormais d'une amélioration Three.js limitée à l'ouverture,
avec secours 2D. [Preuves et limites](booster-3d-2026-10-13.md), D-062.
L'extraction des dos reste HTML et le plastique n'est pas simulé physiquement ;
K-047 reste soumis au jugement visuel sur téléphone, pas clos par les tests.

## Lecture actuelle — 12 octobre 2026

Le registre ci-dessous est actualisé pour `10699eb`. Lire d’abord
[le bilan courant](etat-projet-2026-10-12.md) et [le plan actif](roadmap.md#plan-actif).
Les premiers paragraphes datés du 11 octobre sont des notes historiques de
livraison, pas des contrôles encore à faire.

## Craft — aperçu avant le seuil (11 octobre 2026)

Seuil de dix doublons conservé, trois cartes manquantes à préparer avec les coûts
réels. Les points du recyclage groupé annoncés excluent les Live. Si la page Binder
choisie est complète ou uniquement non artisanable, les autres idées sont
explicitement annoncées. Les aperçus ne dépensent rien. Vérifications locales
vertes, nouvelles suites GitHub et téléphone réel restant à vérifier ; passation.

## Binder — validation des petites collections (11 octobre 2026)

Compteurs calculés depuis les cartes présentes, aucun gain ajouté. Le premier
scénario de choix attendait 12 cartes sur une vague qui n’en contenait que cinq ;
familles regroupées avant découpage, retest 8/8 réussi. Une liste initiale vide
a été détectée par 2 DOM : valeur résolue partagée avec le select, 10/10 DOM et
2/2 retests navigateur du choix réussis. Vue Obtenues au démarrage
conservée, objectif mémorisé uniquement sur cet appareil/édition. SQL non modifié.
Contrôles complets GitHub et retour visuel physique restent à vérifier ; état
courant dans la passation. K-031 reste un chantier séparé.

## Audit produit P0/P1 — corrections publiées et CI verte (11 octobre 2026)

Le premier E2E du lot a détecté un CTA hors du pli sur écran court et le retour
focus du Paquet Scène devenu repliable. Corrections locales ciblées confirmées par 8 E2E bureau/téléphone simulé ;
les suites finales passent, preuves détaillées dans la passation. L’essai invité est un aperçu sans collection ni gains ;
le compte reste requis pour jouer avec la collection serveur. Aucun nouveau
problème SQL établi ; 645 contrôles du vérificateur jetable passent jusqu’à 0048.
Une capture locale à 412×915 a aussi montré le sablier sous la navigation :
réglage CSS final vérifié par 4 E2E, avec assertion de visibilité intégrale.
Code final main `3d3ef31` : CI 38153757540 success (1118 unitaires, 86 DOM,
645 SQL, 46 E2E + 8 cloud simulés). Contrôle Supabase 38153978544 success,
base déjà à jour, aucun SQL exécuté. Liens dans la passation.
K-031 reste inchangé ; parcours sur téléphone physique non validé.

# Problèmes connus CreatorDeck

### Visages artificiels dans certains anciens portraits Upscayl — 13 octobre 2026

Malik signale que plusieurs agrandissements IA reconstruisent les traits et
semblent peu naturels. Le catalogue réutilise les avatars Twitch d’origine
pour cette catégorie ; les choix manuels et les images avec provenance gardent
leur priorité. Les fichiers Upscayl sont archivés et leurs crédits indiquent
qu’ils ne sont plus affichés. Tests adaptés à l’enregistrement actif à retrouver
dans [le bilan](portrait-upscale-review-2026-10-13.md).

État courant : code `10699eb`, CI complète et Vercel Production réussis le
12 octobre 2026. Voir [le bilan vérifié](etat-projet-2026-10-12.md) et
[le plan actif](roadmap.md#plan-actif). Les anciennes observations restent
historiques, les compteurs et sources doivent être rattachés à leur révision.

### Retours encore à rapprocher

Le seul retour utilisateur subjectif encore attendu est l’avis sur l’ouverture
visuelle du booster (A dans la [roadmap](roadmap.md#retours-utilisateur-à-rapprocher--liste-unique)) ;
Malik demande l’analyse externe de Grok avant de décider d’un correctif. Malik confirme le 12 octobre que le retour Paquet Scène est bon ; ce point
est clos. Scroll,
objectif Live, cadeaux et version récente sont confirmés. Le parcours sablier
est confirmé et fermé.

Audit initial : 10 octobre 2026, branche `design/booster-reveal-polish`, code
`4955d9bbd489777c6ffd74229613075a332cc9e9`. Consulter l'état GitHub actuel avant
de reproduire. Ne pas confondre défaut confirmé, incident historique, limitation
d'environnement et validation manquante. Le détail historique de l'atelier est
conservé dans [atelier-et-problemes.md](atelier-et-problemes.md).

## Registre

**K-047 — continuum d’ouverture : corrigé dans le nouveau lot du 12 octobre.**
Le sachet était démonté avant le second portail de révélation, avec un reflet
porté par la scène et une inclinaison libre de carte. Le portail reste désormais
monté, la révélation est intégrée, le reflet suit la matière et la carte suit
un geste planaire après flip. [Fichiers, preuves et limites](booster-continuum-2026-10-12.md).
Le jugement esthétique sur téléphone reste distinct des tests fonctionnels.


K-040 — 11 octobre 2026 : copie cloud non reprise au démarrage, corrigé
localement. Le message exact « sabliers : charge la sauvegarde du cloud dans
Compte avant de synchroniser » vient du trigger `_guard_hourglass_spends`
quand le compteur local ne correspond pas au registre serveur. La session était
restaurée sans lecture de la sauvegarde ; le rafraîchissement de la réserve
pouvait dater cette vieille copie plus récemment. Reprise automatique avant
compteurs et envoi, comparaison avec la dernière version synchronisée,
préservation des conflits réels et du rejeu. Test simulé : compteur local 0,
serveur 1, horloge locale plus récente ; aucune écriture périmée, sablier utilisé
puis réponse perdue rejouée une seule fois après rechargement. E2E bureau et
téléphone simulé verts ; publication/CI dans la passation.

| ID | Gravité / nature | Statut / portée | Symptôme et reproduction | Cause / contournement |
|---|---|---|---|---|
| K-046 | Faible, tactile/révélation | Corrigé et publié sur `main` (`3f33b19`) ; CI `38251607393` verte | Toucher « Révéler la suivante » pendant le retournement animait le bouton mais n’avançait pas ; il fallait toucher une seconde fois. | La fermeture d’`animationend` ne voyait pas l’appui arrivé après son rendu initial. Une référence synchronisée retient un seul appui par carte et le consomme à la fin du flip ou du filet de sécurité. Perfect/verrou inchangés. Régression DOM 16/16 ; suite E2E bureau/téléphone et cloud simulé verte. |
| K-045 | Moyenne, style et qualité des portraits | Lot complet intégré le 12 octobre (`10699eb`) ; améliorations individuelles possibles | 300 manuels, 699 Upscayl et Diverron restauré IA ; les 1 000 routes existent mais ne prouvent pas 1 000 portraits nets et vérifiés. | CI complète et Vercel réussis. Sources/licences des imports souvent absentes, détails IA reconstruits ; avatars génériques acceptés par Malik (K-044). |
| K-044 | Choix visuel accepté | Clos le 12 octobre, instruction explicite de Malik | SolaryHS, j0niq et toaststix gardent leur avatar générique. | Sans photo de profil, conserver l’avatar générique ; aucune recherche/remplacement demandé. Ce n’est plus un bug ni une tâche de roadmap. |
| K-043 | Faible, compteur pity après tirage | Corrigé et testé sur `main` `1439e44` ; CI `38178996093` verte | Le compteur affichait 7 avant puis 12 après un booster sans Légendaire. | `open_pack()` renvoie le compteur du journal après tirage ; l’adoption de `save.state` pouvait réécraser cette réponse par l’ancien `pityCounter`. Le client conserve maintenant la progression serveur calculée. Reproduction unitaire, vue restante 7→6 vérifiée. |
| K-042 | Faible, reflet/continuité du sachet | Corrigé et testé sur `main` `1439e44` ; CI `38178996093` verte | Vidéo : bande lumineuse indépendante persistante, longue attente immobile et dos apparemment séparés du sachet. | Reflet clipé sur la silhouette SVG et animé une seule fois, 1,25–1,35 s ; arrêté en ouverture/reveal/Perfect ou effets réduits. Consigne indique la bande soudée haute. Z-index : cartes au-dessus du corps, sous le rabat. E2E local 30/30 et assertions finales 2/2 ; CI complète verte. |
| K-041 | Faible, UX/gestes et rendu CSS | Corrigé et publié sur `main` `674fc1d` ; CI `38176673799` verte (4 jobs) | Répétitions autour du sablier, trop de chrome avant la grille Binder, révélation au bouton seul, reflet infini avant déchirure malgré mouvement réduit. | Une note contextuelle, Binder compact, swipe après flip avec bouton conservé, notice de succès contextualisée ; mouvement réduit coupe le reflet. Scoping CSS : zéro doublon sélecteur/keyframe entre feuilles. Écrans 28/28 ; E2E continuité/réduit 4/4, abandon mi-course 2/2, swipe horizontal 2/2 (geste débordant de la carte après capture pointeur). Typecheck, ESLint et build statique code 0. |
| K-039 | Faible, découvrabilité sociale | Résolu dans le code `980bdf8` (inclus dans `main` `d585db6`) ; CI `38164889818` verte (4 jobs) | Les ouvertures récentes des amis (dernière heure) n’apparaissaient dans le Drop qu’après ouverture d’un panneau secondaire. | CTA conditionnel déplacé hors du repli, sous le Paquet Scène ; il mène au Carnet et n’ajoute rien quand il n’y a pas d’activité. DOM ciblé 7/7 ; CI complète verte. Aucun changement de données, notification ou serveur. |
| K-031 | Élevée, recharge ordinaire | Résolu sur main `76e8a62` ; 0049 appliquée et vérifiée automatiquement ; téléphone confirmé par Malik | Après plusieurs intervalles gagnés avec stock sous le plafond, la réserve pouvait regagner trop tôt au contrôle suivant. | 0048 avançait l’ancre de N millisecondes au lieu de N × intervalle. 0049 remplace uniquement `_pack_refresh` par la formule correcte. Tests : TypeScript 103/103, toutes assertions SQL jetables ; CI 38163674938 quatre jobs verts ; automatique 38163920425 success, log confirme TLS/projet/historique, application 0049 seulement et post-vérification des objets. Malik confirme le test sur téléphone réussi. |
| K-038 | Moyenne, continuité visuelle du booster | Correctif publié et CI verte ; retour A (avis visuel téléphone) demandé | Après la déchirure, les cinq dos montaient mais le sachet ouvert restait visible dessous ; Reflets coupés ou mouvement réduit laissaient une enveloppe fantôme. | Cap 980 ms, corps 1150 ms, côtés/ombre 1080 ms puis opacité nulle ; sans effets/mouvement réduit, emballage masqué et dos conservés. Timer 1900 ms et Reveal/Perfect/tear inchangés. E2E locaux 4/4 bureau/téléphone simulé ; CI `38162996089` et `38164889818` vertes. Réponse physique reste subjective. |
| K-037 | UX Paquet Scène | **Clos : corrigé et confirmé par Malik le 12 octobre** | La disponibilité et la présentation après ouverture conviennent désormais à Malik. | Aucun nouveau correctif requis ; les états actuels restent couverts par les tests. |
| K-036 | Élevée, tactile/ouverture involontaire | Confirmé corrigé par Malik sur son appareil | Remonter le doigt sur le sachet ou le grand bloc Drop ouvrait un booster au lieu de défiler. Reproduit par le chemin pointer capture/armed de HomeView. | Scroll natif autorisé, clic après glissement ignoré ; appui/clavier ouvrent la scène séparée. Déchirure et Perfect inchangés. 50 E2E et 8 cloud simulés verts ; CI `38155656424` success. |
| K-035 | Moyenne, UX/règle sablier | Résolu ; parcours téléphone confirmé par Malik | Sablier caché sous « Jetons et sabliers », grisé à 4/4 ; carte encombrée de garanties et compteurs. | Bouton visible, informations secondaires allégées ; bonus unique 5/4 jusqu’à ouverture. CI `38145382045` verte (4 jobs), 0048 appliquée et vérifiée (`38146774310`). Malik confirme le parcours réel 4/4 → 5/4 → ouverture → 4/4. |
| K-034 | Automatisation Supabase | Résolu sur main ee10a6d ; automatique réussi | Prévalidation baseline 0001–0046 refusait 0047 manual déjà installée avant lecture réseau. Log 38140833700 désormais téléchargé : même refus, exit code 1. | Validation des fichiers séparée du plan sur historique réel ; manual enregistrée ignorée dans le plan, approbation maintenue pour manual en attente. 28/28 tests outil, politique/syntaxe/ESLint ciblé/diff-check réussis. Aucun SQL modifié ni 0047 réappliquée. CI 38142506934 quatre jobs verts ; automatique 38142681999 success sur ee10a6d, log lu : base déjà à jour et vérifiée, aucun SQL de migration exécuté. |
| K-033 | Application 0047, diagnostic incomplet | Résolu, 0047 appliquée et objets vérifiés | Run manuel 38139794012 failure à l’étape de contrôle/application, après CI verte et dry-run réussi. | Log fourni par Malik : CLI 2.39.2 refuse les options récentes de config.toml avant SQL. db push isolé dans un dossier temporaire (mêmes SQL, config minimale), contrôle historique/objets après application ajouté ; 24/24 tests locaux et compatibilité binaire vérifiée. Correctif 5832b5d : CI 38140313000 verte, dry-run réussi, application 38140515537 success avec vérification historique/objets, contrôle final en lecture seule 38140562490 success. Aucun repair ni replay historique. Risque sans sauvegarde accepté explicitement par Malik. |
| K-032 | CI navigateur, configuration de test | Résolu, CI distante verte sur 1dd5b53 | CI de main 9788208 en échec : scénarios cadeau/sablier lancés sans cloud, tutoriel inattendu ou cadeau absent. | Les deux scénarios exigent désormais la configuration publique valide et leur nom les sélectionne dans le job cloud à RPC simulées. Helper partagé aligné sur les fichiers/env de Next dev. Aucune assertion supprimée, aucun SQL modifié ; 42/42 sans cloud (6 ignorés), 6/6 cloud simulés, typecheck/lint réussis. CI 38139620497 verte sur 1dd5b53. |
| K-030 | Moyenne, sabliers en ligne | Migration 0047 appliquée et vérifiée ; parcours sablier sur téléphone confirmé | Les gains existaient mais le bouton restait désactivé depuis 5c120f3. | Nouveau RPC atomique `use_hourglass` : débit 1, recharge -15 min, idempotence UUID, garde des anciennes sauvegardes et refus solde vide/réserve pleine. 1117 unitaires, 83 DOM, 643 SQL dont 19 sabliers, E2E simulé 2/2. Migration appliquée le 11 octobre (`38140515537`), versions/objets vérifiés. Malik confirme l’usage réel du sablier. Les sources de gains restent locales ; ne pas annoncer une économie intégralement certifiée serveur. |
| K-029 | Outillage, accès GitHub | Résolu par exécution réseau autorisée ; diagnostic initial rectifié | Git et curl exécutés dans le bac à sable échouaient immédiatement à joindre proxy:8080. | Contre-épreuve : même commande Git, même proxy, avec sandbox_permissions=require_escalated approuvé → ls-remote, fetch et push réussis. Le refus venait des restrictions d'exécution ; aucune panne du proxy confirmée. Conserver proxy/CA, utiliser l'autorisation réseau de l'outil ; aucune règle réseau modifiée ni environnement recréé. |
| K-028 | Moyenne, objectif quotidien en ligne | Correctif confirmé par Malik après publication | Après un Live Drop côté serveur, l'objectif « Ouvre un booster » pouvait rester à 0/1. Le Paquet Scène ne compte pas pour cette mission, par règle existante. | Le client conserve maintenant les missions calculées après adoption de la sauvegarde serveur. Test cloud ciblé 135/135, typecheck et ESLint ciblé réussis. Malik confirme que l’objectif progresse après un Live Drop. |
| K-027 | Faible, accueil cadeau | Correctif confirmé par Malik ; aucun toast gênant observé | Après réclamation du cadeau, un toast persistant recouvrait le bouton du booster cadeau suivant dans la boîte. | Le message cadeau et son solde actualisé restent visibles ; le toast de succès redondant n’est plus émis. Parcours E2E bureau/téléphone simulé 2/2 avec RPC interceptées. Malik confirme ne pas avoir vu de message gênant. |
| K-025 | Faible, progression du Binder | Corrigé et testé localement | Avec 999 noms sur 1 000, le pourcentage arrondi affichait 100 %. | Pourcentage tronqué : 99 % jusqu’au dernier nom. Test DOM 999/1 000 ajouté ; pas de modification des compteurs du moteur. |
| K-026 | Outillage, lint | Corrigé localement | Après un rapport Playwright, ESLint analysait le JavaScript généré du visualiseur de traces (188 erreurs). | Exclusions playwright-report/** et test-results/**, déjà ignorés par Git. Aucun fichier produit exclu. |
| K-022 | CI, fixture navigateur | Résolu ; les scénarios serveur sont vérifiés séparément avec RPC simulées | Job navigateur-cloud : timeout au clic sur Ouvrir le booster, tutoriel intercepte les événements. | L'ancien scénario supposait un joueur déjà accueilli mais renvoyait `{}` pour `onboarding_status`. Le helper navigateur parcourt désormais les étapes et les scénarios cloud sont sélectionnés dans le job dédié. La CI complète 38140313000 est verte sur le correctif final ; preuves détaillées dans la passation. Aucune connexion de test à la production. |
| K-024 | Configuration TLS, runner GitHub | Résolution confirmée par Malik après intégration de la CA | Dry_run échouait avec SELF_SIGNED_CERT_IN_CHAIN. | CA publique Supabase intégrée dans 37e34e6, TLS et hôte toujours vérifiés. Malik confirme ensuite « C’est passé ». Connexion/projet/historique en lecture seule validés selon ce retour ; aucun log final ni run consulté directement par l’agent, aucune migration appliquée par ce contrôle. |
| K-023 | Diagnostic, connexion PostgreSQL | Diagnostic corrigé ; dry_run réussi selon Malik | L’ancien script masquait tous les codes pilote sous un message générique. | Messages sûrs par cause ajoutés, puis erreur TLS identifiée et K-024 résolue. Ne pas redemander mot de passe ou secret sans nouvel échec précis. |
| K-021 | Configuration, mises à jour SQL | Procédure automatique exercée jusqu’à 0049 ; aucune validation utilisateur en attente | Connexion TLS, projet, historique et applications automatiques des migrations requises ont été vérifiés dans les runs référencés dans la [passation](agent-handoff.md). | `0049` appliquée et vérifiée par le run `38163920425`. Les futures migrations restent soumises à CI, historique, TLS et contrôles après application. Aucun repair ni ancien reset rejoué. [Procédure](mises-a-jour-automatiques.md). |
| K-020 | Moyenne, replay du tutoriel | Correctif 0046 appliqué ; tutoriel et cadeaux restants confirmés sur téléphone | Réinitialiser la progression ne redonnait pas le tutoriel ni sa séquence cadeau. | 0046 retire la fin du tutoriel du compte connecté ; le client rejoue après réussite. Malik confirme le tutoriel et l’ouverture des cadeaux restants sans message gênant. |
| K-019 | Élevée, cadeau de reprise | Reproduit en production ; correctif poussé sur `main` le 11 octobre, migration 0045 active selon contrôle SQL transmis par Malik | Après avoir réclamé et ouvert le premier booster cadeau, cliquer pour ouvrir l'un des quatre restants affiche « cadeau déjà réclamé ». | L'écran rappelait `claim_return_gift()` à chaque clic ; le RPC rejetait tout claim répété même si le stock cadeau restait positif. Migration 0045 rend le RPC idempotent sans recréditer, renvoie l'état `gift_claimed`, et la nouvelle interface passe ensuite au libellé « Ouvrir un booster cadeau ». Tests complets/API/écrans/SQL, typecheck, lint et build webpack passent. Commit `9710baf` est vérifié sur GitHub `main`. 0045 est déjà appliquée ; le statut Vercel n'est pas vérifié. |
| K-018 | Élevée, SQL cadeau | Corrigé et validé localement le 11 octobre 2026 | 0044 remplaçait le helper des boosters ordinaires sans synchroniser leurs compteurs. | Helper cadeau isolé, droits clients retirés ; preuve SQL de conservation de la fonction ordinaire ajoutée. `npm test` 1 109/1 109 et `supabase:verify` réussis. Le reset 0044 a ensuite été appliqué par Malik dans le SQL Editor ; K-017 note les compteurs vérifiés. |
| K-016 | Moyenne, build Cloud | Limitation d’environnement constatée le 10 octobre 2026 | `npm run build` (Turbopack) échoue lors de l’analyse CSS : `creating new process`, `binding to a port`, `Operation not permitted`. | Aucun défaut produit établi. `npm run build -- --webpack` réussit, avec export statique complet. Ne pas modifier la configuration du dépôt pour contourner les restrictions Cloud sans autre preuve. |
| K-017 | Élevée, opération irréversible | Reset effectué par Malik dans Supabase le 11 octobre 2026 | Le contrôle SQL a renvoyé le marqueur `tutoriel-cadeau-2026`, 16 tutoriels, 16 cadeaux et zéro tirage/carte/échange ouvert/annonce ouverte. | La base de production a été modifiée depuis le SQL Editor du propriétaire ; cet environnement Cloud n'a pas exécuté la migration. Le contrôle fourni établit ces compteurs, pas une sauvegarde indépendante. Le bug K-019 du claim cadeau a été constaté ensuite. |
| K-015 | Moyenne, cohérence des artefacts de données et tests | Résolu par vérification locale sur le checkout courant (10 octobre 2026) | `npm test` : 71 fichiers, 1 109/1 109 ; génération catalogue/saisons et Git sont passés avec exécution locale autorisée. | Les anciens échecs étaient dus à l’environnement sandbox (Git `EPERM`, processus locaux) et non aux artefacts du HEAD courant. `catalog:ci` n’a pas été demandé/exécuté dans ce lot. |
| K-013 | Elevee, coherence du tirage | Corrige et valide localement par 35 tests et PostgreSQL jetable | Les familles a 1-4 Epiques pouvaient vider les choix ; le premier run a revele le reserve exclu du 5e slot. | La migration 0043 reserve correctement le candidat et le rend disponible au dernier slot. Aucun deploiement. |
| K-014 | Elevee, validation SQL | Resolu pour la validation locale jetable | PostgreSQL refusait de demarrer sous le compte Administrateur Windows ; le run WSL initial a ensuite revele des defauts de fixture, corriges. | Sous WSL creator, migrations 0001-0043 et controles complets reussis. La production reste hors perimetre. |
| K-001 | Élevée, environnement | Historique confirmé les 8–9 octobre ; cause non démontrée | Une reprise Cloud peut revenir au parent/main/clone limité ; status montre des milliers de changements. Relever branche, HEAD, refs et fichiers avant d'éditer. | Origine automatique soupçonnée dans l'atelier, non prouvée. Sauvegarder les fichiers touchés, fetch explicite, ne pas add-all/force/reset aveugle. Le switch/tracking échoué de l'audit du 10 octobre était une erreur locale distincte, corrigée. |
| K-002 | Moyenne, données visuelles | **Résolu le 12 octobre 2026** avec une photo fournie par Malik, restaurée par IA | Le portrait WebP endommagé de DIVERRON apparaissait comme un disque vert. | Une photo fournie par Malik a été restaurée et intégrée en 900 × 900 px. L’application la crédite comme photo fournie/restaurée ; source et auteur de l’original non documentés. |

Scan ciblé, 11 octobre 2026 : les 1 000 fichiers `public/creators/*.webp` ont
été décodés et réduits pour repérer les images majoritairement vertes. Aucun
échec de décodage ou dimension incorrecte ; seul `diverron.webp` ressortait (87 %
de pixels verts dominants selon le filtre de repérage). Le 12 octobre, une photo
fournie et restaurée a remplacé ce secours à l’affichage. Le filtre sert au tri,
pas à juger visuellement un portrait.
| K-003 | Moyenne, version réellement visible | Confirmé par Malik : les changements récents sont visibles dans l’application | Savoir si l’application consultée par Malik contient bien les changements récents. | Malik confirme la visibilité des changements récents. Le statut Vercel du code `980bdf8` est success (« deployment completed »), sans préciser preview ou production ; aucun blocage visible côté application selon son essai. |
| K-004 | Élevée quand présente, SQL | **Corrigé dans la branche actuelle**, ancien main concerné | Ancien `0004` : `open_pack()` échoue avec « set-returning functions are not allowed in CASE ». La lecture du code design montre `FROM unnest(...) ORDER BY array_position(...)`. | Correctif historique `942ba694`, déjà intégré ; la fonction finale est ensuite redéfinie dans `0035`. Ne pas importer les conclusions du checkout main dans design. Validation SQL courante à noter dans la passation. |
| K-005 | Faible à moyenne, validation UI | Ancienne validation visuelle ; éléments encore utiles regroupés sous A | Scène d’ouverture : soudure tactile, dos/faces/halo, Perfect et options d’accessibilité. | Les observations de Chromium et du preview sont historiques. La seule appréciation visuelle encore demandée est A dans la roadmap ; ne pas redemander chaque ancien point séparément. |
| K-006 | Moyenne, accès de l'agent | Incident historique ; accès REST GitHub fonctionne dans l’environnement du 11 octobre | Ancien audit : GraphQL Forbidden et REST HTTP 403 sur PR #8. | Cause passée non établie. Dans l’environnement actuel, API GitHub/`gh` répondent et runs/PR sont lisibles ; l’ancien refus n’est pas un blocage présent. |
| K-007 | Moyenne, défaut de test confirmé | **Corrigé le 10 octobre 2026** ; 559/559 contrôles SQL passent | Avant correction (`dedb03be`), le samedi/dimanche après le début de journée de jeu à 6 h UTC, lancer `npm run supabase:verify` : code 1, seul échec « arène · draft : hors du week-end, c'est refusé ». | Le vérifieur appelle `arena_draft_choices()` avec `now()` et attend toujours un refus, même un vrai samedi. `0018` autorise correctement le week-end ; les contrôles à dates explicites passent. Correction : fenêtre fermée puis ouverte imposée dans la base jetable, définition originale sauvegardée et restaurée dans `finally`. Les contrôles calendaires à dates explicites restent présents. `npm run supabase:verify` : code 0, 559/559 le samedi 10 octobre ; contre-épreuve et détails dans la passation. Aucune migration/règle produit modifiée. |
| K-008 | Moyenne, réseau/outillage | **Résolu le 10 octobre 2026, reprise E2E** | Ancien téléchargement bloqué par les redirections Chromium/FFmpeg. Installation verrouillée maintenant code 0, Chromium 1243 et FFmpeg 1011 présents. | Les trois domaines CDN et redirections sont accessibles. E2E effectivement exécutés : voir la passation ; échecs applicatifs distincts K-010. |
| K-009 | Moyenne, procédure d'installation | Corrigé dans cet audit ; prévention documentée | Avec `npm_config_package_lock=false npm run dev:setup`, les plages semver ont amené Next 16.4.0 et Playwright 1.64.0 sans changer le lock, qui demandait 16.3.6/1.63.0. | Le flag désactive aussi la lecture du lock. `npm ci` puis `npm run dev:setup` sans ce flag ont restauré les versions verrouillées ; versions comparées réellement. Rejouer les contrôles dépendants après correction, ne pas attribuer leurs premiers résultats à l'environnement verrouillé. |
| K-010 | Moyenne, accessibilité clavier | **Corrigé le 10 octobre 2026**, code `4b9fcca3` | Avant correctif, `npm run e2e -- --grep "the revealed card keeps"` échoue sur bureau et téléphone à `e2e/pack-tear.spec.ts:46` : après fermeture, le bouton « Ouvrir le booster » ne reprend pas le focus. | Cause : capture du focus après désactivation du bouton. Capture désormais avant le commit de désactivation, cible conservée de la déchirure à la révélation. Même test inchangé : **2/2 réussis**, écrans/tactile **9/9**, typecheck et lint ciblé code 0. Détails et limites dans la passation. |
| K-011 | Moyenne, accessibilité clavier Scène | **Corrigé le 10 octobre 2026**, code `d87b72c` | Avant correctif : après ouverture puis fermeture Scène, focus BODY, bouton consommé désactivé ; nouveau scénario E2E bureau/téléphone 2/2 échecs. | Retour sur le titre de la section si le déclencheur ne reçoit plus le focus ; titre tabIndex=-1, paquet consommé toujours désactivé. Après correctif : scénario Scène et scénario Live existant **4/4 réussis**, typecheck et lint ciblé code 0. CI du nouveau SHA et appareil réel non vérifiés ; détails dans la passation. |
| K-012 | Moyenne, tactile/ergonomie | Correctif livré ; avis regroupé sous A (rendu/toucher) et B (scroll) | Ancien retour : sachet trop grand et soudure hors de portée ; appui sur sachet accueil sans effet. | Paquet compact, ouverture explicite et Drop mobile compactés ; tests Playwright bureau/téléphone simulé verts. L’essai sur le téléphone réel reste à faire ; ne pas le déclarer validé. |

## À ne pas transformer en nouveaux bugs

- Les anciens compteurs 181/931/1077 des tests ne sont pas interchangeables :
  ils appartiennent à des commits différents. Compter le run de la passation.
- Les suites Playwright, écrans et SQL existent ; l'ancienne case non cochée de
  roadmap est historique. Disponibilité d'un script ≠ exécution réussie.
- L'APK debug ou build sans cloud d'un ancien main ne prouve pas le produit
  distribué actuel ; la branche et ses variables de compilation changent le parcours.
- Les questions « Tu demandes » limité à 8, pager et simulateur conservé sont
  des choix/questions documentés, pas des bugs confirmés par cet audit.

## Mise à jour d'un incident

Ajouter un ID stable, date/agent, SHA/branche/environnement, gravité et impact,
étapes minimales, attendu/observé, commandes/code de sortie, cause vérifiée ou
hypothèse, statut, contournement et action recommandée. À la correction,
conserver l'entrée avec commit et test de non-régression ; ne pas effacer l'histoire.
Ne jamais publier de logs contenant des clés ou sessions.
