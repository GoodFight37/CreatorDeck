# Roadmap CreatorDeck

## État actuel — 16 octobre 2026

**Sachet Live Drop souple (D-128) — publié sur Vercel, ressenti physique ouvert :** silhouette et soudures arrondies, plis et volume dans l'impression existante, tranches moins rigides, reflet contenu et ombre recadrée. Taille, idle, CTA, peel et économie conservés. [Captures avant/après 390 et 320 px](sachet-live-d128.md) ; code `077a67ce`, CI 6/6 et Vercel Production `READY` avec SVG publics identiques aux fichiers publiés. Le rendu et le geste sur téléphone physique restent à juger par Malik.

**Matière des cartes Mèmes (D-127) — publiée sur Vercel, jugement physique ouvert :** audit différentiel des 59 observations d'animations et des 27 familles partielles du paquet réduit ; progression de cadre et de matière selon la rareté, Full Art plus ouvert, reflet au doigt limité à la grande fiche. Pas de sweep perpétuel ni de modification du booster physique, des cartes Twitch ou des règles. Voir [l'audit et les captures comparables](audit-cartes-memes-reference.md). Code `40eb20f7`, CI 6/6, Production `READY`, fiche visible sur le domaine public ; le rendu sur téléphone réel reste à juger.

**Ouverture tactile Mèmes (D-126) — publiée et vérifiée sur Vercel :** retour utilisateur sur D-125 : révélation trop statique. Le sachet Mèmes utilise désormais le peel, l’extraction des cinq dos, le flip automatique avec rareté différenciée et un récap maintenu 1,5 s. Taux, réserve et Twitch inchangés. Tests navigateur mobile simulé et connecté de production réussis sur `b8cff0f9` : peel, cinq flips, récap et réserve à 3. Déploiement Production, CI 6/6 et workflow Supabase réussis. Reste le ressenti tactile sur téléphone physique.

**Cartes Twitch, référence visuelle (D-123) — publiées sur Vercel :** cadre de rareté plus lisible, cartouche de nom et libellé de rareté sur les grandes cartes ; petites cartes compactes, courte pose à l'ouverture de la fiche, reflets au geste et révélation existante préservés. Aucun catalogue ni média du ZIP de référence importé. Écrans ciblés 45/45, navigateur mobile 5/5, TypeScript, ESLint ciblé et build réussis ; captures 412 × 915 inspectées. Commit `89936291`, CI 6/6 et statut GitHub du déploiement Production réussis ; note joueur lue sur le site 390 × 844. Appréciation visuelle sur téléphone physique encore ouverte.

**Univers Mèmes FR (D-125) — publié et vérifié sur Vercel :** booster de cinq cartes et classeur séparés, catalogue de 2 151 fiches dont 2 150 tirables avec image, 21 Full Art et 2 147 fichiers WebP distincts. Réserve serveur propre (quatre maximum, une recharge toutes les 30 minutes), dernière carte Rare ou mieux, tirage idempotent. Les cartes, taux, possessions et ressources Twitch ne changent pas. Droits d'usage affirmés par Malik sur la base d'un accord privé non partagé ; l'équipe ne peut pas vérifier sa portée documentaire. Voir [source et limites](catalogue-memes-source.md). Tests locaux, CI 6/6, workflow Supabase et déploiement Vercel réussis sur `52b3738a`. Un compte invité de production a ouvert cinq cartes et retrouvé `5 / 2151` dans le classeur sur Chromium mobile. Restent le ressenti sur téléphone physique et le visuel source manquant d’une fiche.

**Tutoriel après connexion (D-121) — publié et vérifié sur le site :** la création d’un compte invité ne superpose plus « Mon compte » et le tutoriel. Celui-ci attend la fermeture de la feuille, puis sa fin revient au Drop. Test ciblé 1/1, écrans 182/182, navigation téléphone 6/6, TypeScript, ESLint et build réussis ; CI 6/6 sur `6a1c0069`. Le 16 octobre, un compte invité neuf a parcouru la production Vercel à 390 × 844 : aucune superposition ni exception JavaScript. Seul le ressenti sur téléphone physique reste à juger. [Décision D-121](decisions.md). Aucun changement des cadeaux, taux ou ressources.

**Sachet Drop affiné — publié dans `118b21f0` :** angle ramené à 7° sur Y et 4° sur X, tranches foil de 16 px, dessous de 12 px, couleur centrale moins claire ; taille, idle, reflet, ombre et CTA conservés. Build local, quatre scénarios navigateur téléphone, CI 6/6 et Vercel Production `READY`. Une note joueur rétrospective est ajoutée le 16 octobre ; appréciation visuelle et tactile physique toujours côté joueur.


**Lot 05 IA Studio (D-119) — publié et vérifié sur Vercel :** alerte carte 0 réfutée par le contrat SQL (index 1 à 5), feuilles sociales synchronisées, variantes d’un ancien partenaire écartées, proposition verrouillée jusqu’à sa réponse. 181/181 écrans, 1 186/1 186 unitaires, CI 6/6. Deux comptes invités ont ensuite vérifié sur la production l’amitié, l’offre unique malgré un double appui, son acceptation et les cinq cartes finales de chaque Binder. Wishlist persiste après rechargement ; une réponse de variantes retardée est écartée. Vol Last Pack, transaction à l’Hôtel et ressenti tactile physique restent ouverts. [Preuves et limites](verification-sociale-vercel-2026-10-15.md). Aucun changement d’économie ou de taux.


**Vocabulaire Échanges (D-118) — publié, CI verte :** les deux aides
visibles du panneau Échanges utilisent les mots du joueur. Le garde de jargon
et les deux assertions Compte lié qui rendaient la CI rouge restent actifs ;
voir [la décision D-118](decisions.md) et la passation pour le run 6/6 vert.
Les échanges et leur arbitrage restent identiques.


**Stabilité du sachet Drop (D-117) — implémentée :** après confrontation du
partage Claude au code, l’entrée ne repart plus au relâchement, l’idle commence
sans saut, le sachet reste activable avec un booster de test, et l’ombre suit
le padding sur les hauteurs courtes. Note joueur et tests ciblés inclus ;
voir [D-117](decisions.md). Le ressenti tactile physique reste ouvert.


**Lot 04 IA Studio (D-116) — implémenté :** le paquet de l’overlay prend le bon
habillage avant le peel ; Tribunal et Arène sortent de l’état occupé après une
erreur, avec message et réessai ; la feuille de code accepte Retour et Échap ;
les délais expirés de l’Arène ont un libellé cohérent. Le feuilletage Binder
depuis une carte, régressé par D-115, et les attentes E2E de focus sont corrigés.
Voir [la revue du lot 04](revue-ia-studio-lot04-2026-10-15.md) et [la décision D-116](decisions.md).


**Binder/Atelier après revue IA Studio (D-114/D-115) — corrigé :** les Sortants
possédés figurent dans Obtenues et Toutes ; recherche et tri les incluent.
Le compteur Toutes de l’Atelier conserve son total sous filtre de rareté.
Un signalement de plantage Atelier était un faux positif : le registre des
créateurs inclut déjà les Sortants. Le rapport complet a été reçu ensuite ;
les fiches Sortants, l’action directe Twitch et le focus Atelier sont aussi
corrigés. Voir [la revue complète D-114/D-115](revue-ia-studio-binder-2026-10-15.md).

**Deuxième bilan IA Studio vérifié (D-113) — publié et Vercel vérifié :**
retour Android pendant le tirage sans annulation, marqueurs du tutoriel recalés
par compte, polling Last Pack après résolution de la lecture et description
accessible de Toi. L’alerte `inert` est un faux positif dans les composants
actuels, tous portalisés hors de `.app-shell`. Détails :
[revue du deuxième lot](revue-ia-studio-architecture-2026-10-15.md).

**Premier bilan IA Studio vérifié (D-112) — publié et contrôlé sur Vercel :**
deux faux positifs réfutés (contexte `dry_run`, fallback CSS), constat SVG
réfuté, rôles de compteurs et focus du prototype corrigés ; barre de niveau
bornée pour un import incohérent. Aucun changement des règles. Revue détaillée
et limites : [bilan vérifié](revue-ia-studio-2026-10-15.md).

**Fiabilisation des vérifications (D-111) — publiée, Vercel vérifié :** reproduire les
échecs navigateur de main, corriger les attentes périmées et stabiliser les
cibles réelles ; rendre les échecs lisibles dans GitHub et permettre aux
contrôles indépendants de tous s’exécuter. Aucune modification du jeu.
18 exécutions ciblées réussies (14 scénarios uniques). Le défaut de vocabulaire
Trades reste signalé et hors périmètre. Trois shards navigateur, SQL et cloud simulé verts sur `6cbb3926`.
Complément des anciennes assertions DOM : 25/25 ciblés ; la qualité reste
rouge sur le vocabulaire Trades exclu. [Rapport D-111](verification-d111.md).

**Volume vivant du sachet (D-110) — publié et contrôlé sur Vercel :**
oscillation sur trois axes en 4,8 s, foil et face avant renforcés, reflet 4 s,
double ombre et spot bordeaux ; format et CTA jeu conservés. Réduction des
animations respectée. Contrôles et déploiement dans la passation.

**Accueil Drop en scène (D-109) — publié sur Vercel, ressenti physique ouvert :**
pack Live Drop dominant dans une lumière chaude avec sol, ombre et pans foil ;
entrée et respiration discrètes, réduites selon les préférences ; CTA plein
largeur et « Plus d’infos » replié. Chrome de l’accueil allégé. Capture locale
390 × 844 et 320 × 568 inspectée : action entière au-dessus de la navigation
basse, pas de débordement. Aucun taux, ressource ou autre pilier modifié.
Vérifications et déploiement détaillés dans la passation. Le verdict tactile
sur appareil reste à faire par le joueur.

**Finition du rituel d’ouverture (D-108) — publiée, Vercel vérifié :**
les consignes TIRE / RELÂCHE, l’extraction à 1,2 s et l’impact Rare+ étaient
déjà en place sur main. Le récapitulatif de chaque booster attend maintenant
1,5 s avant le retour, même avec effets coupés. Côtés, reflet et ombre du pack
hero ajustés en CSS sans toucher à la structure du Drop. Production Vercel
`success` sur `36490080`, note joueur visible ; tests ciblés et build réussis.
CI complète rouge (texte du panneau Échanges, scénario sablier simulé et
shards E2E) ; parcours ciblé d’ouverture réussi localement, détails dans la
passation. Jugement tactile sur téléphone ouvert.

**Trade Radar (D-107) — publié et vérifié sur Vercel :** pistes à la demande depuis les souhaits
publics des amis et les variantes locales en double ; partenaire/carte offerte
préparés, choix de la contrepartie et arbitrage serveur conservés. États vide,
chargement, lecture partielle et changement de partenaire traités. Aucun SQL,
économie ni collection tierce exposée. Logique/store/notes 172/172, écrans
13/13, typecheck, ESLint, build et rendu 320/390 px réussis. Code `6816e9e5`,
Production et contrôle Vercel `success` ; note joueur visible sur le site.
Scan sur compte réel non essayé ; checkpoint courant.

**Perfect renforcé (D-106) — publié et vérifié sur Vercel :** noms/raretés et nouveautés des
cinq cartes lisibles sous le tirage ; récapitulatif Perfect distinct. Aucun
changement de taux, gain, son, geste ou timing. DOM 28/28, TypeScript, ESLint,
build et rendu Chromium à 320/390/1024 px réussis. Code `7a0b182e`, Production
et contrôle Vercel `success`. Aucun Perfect réel tiré en Production ; checkpoint.

**Story de profil (D-105) — publié et vérifié sur Vercel :** export PNG 9:16 depuis la fiche
publique, à côté de l'affiche 4:5 ; même modèle de faits serveur, vitrine vide
et portraits manquants pris en charge. Aperçu adapté aux petites hauteurs et
focus restauré. 16 tests de logique/notes, 11 tests d'écran, typecheck, ESLint
et build réussis ; rendu Chromium inspecté. Code `e61bca4e`, Production et
contrôle Vercel `success`. Profil connecté réel non essayé ; checkpoint courant.

**Accès permanent Twitch (D-104) — publié et vérifié sur Vercel :** chaque fiche de carte dans
le Binder et la vitrine Toi donne accès à la chaîne, avec ou sans direct. Le
direct actuel reste une information distincte. Aucun effet sur les tirages ou
les comptes ; note joueur dans Nouveautés. DOM 13/13, TypeScript, ESLint et
build réussis ; code `a48cf341`, Production et contrôle Vercel `success`.
Parcours connecté sur site non essayé ; détails au checkpoint.

**Objectifs et saisons (D-103) — clos, publié et vérifié sur Vercel :** quotidien,
collection/jalons et saisons lisibles ; gains et prochaine étape, filtres et
pages de huit saisons. Tout réclamer comprend les jalons et s'arrête sur un
refus, avec bilan reçu/erreur et verrou contre les doubles clics. Choix de série
séparé. Seuils, récompenses et règles identiques ; note joueur du 15 octobre.
DOM 10/10, notes 8/8, trois scénarios navigateur uniques réussis, type/lint OK.
Build final réussi. Code `5f96ab58`, Vercel Production `READY` / `success` ;
parcours invité quotidien/saisons/paliers/pages et patch note contrôlés à
320/390 px. Réclamations complètes testées localement, refus simulés en DOM.
Détails et limites au checkpoint courant.

**Journal Nouveautés (D-102) — clos, publié et vérifié sur Vercel :** historique
joueur depuis Toi, détail/filtre, repère discret de non-lu, lecture explicite
individuelle/globale, persistance locale et repli session si stockage bloqué.
Sept notes initiales, règle de publication par livraison dans AGENTS et
`nouveautes.md`. Aucun nouveau backend, gameplay ou audio. Logique 8/8,
DOM 21/21, navigateur 4/4 et build/statique réussis. Code `3fe32e8d`, Vercel
Production `READY` / `success` ; historique/lecture/rechargement/focus contrôlés
sur le site à 320/390 px. Détails et limites au checkpoint courant.

**Lot Toi complet (D-101) — clos, publié et vérifié sur Vercel :** vitrine
inspectable et noms complets, variantes/quantités réelles, niveau/XP et
collection visibles, accès direct aux objectifs, réglages et outils regroupés.
États vide/partiel, compte/sauvegarde/conflit/erreur traités ensemble.
18 DOM et cinq scénarios navigateur uniques réussis. Code `261625f5`, Vercel
Production `READY` / `success` ; profil invité, progression/objectifs et réglages
contrôlés à 320/390 px, sans écriture sur un compte. Détails au checkpoint.
Aucune règle, audio, économie ou fonctionnalité serveur ajoutée.

**Lot Craft / Atelier (D-100) — clos, publié et vérifié sur Vercel :** aperçu de
carte avant confirmation, coût/solde/monnaie, manque et refus visibles, attente
verrouillée, résultat création/recyclage avec suite directe classeur/recettes.
Live et dernière copie protégés comme avant. 14 DOM réussis, trois scénarios
navigateur uniques réussis à 320/390 px. Code `88d5cfa1`, Vercel Production
`READY` / `success` ; aperçu, solde insuffisant, focus et recyclage vide
contrôlés sur le site publié sans transaction réelle. Détails au checkpoint.
Aucun moteur, prix, tirage, audio ou Supabase modifié.

**Lot Binder complet — clos, publié et vérifié sur Vercel :** finir ensemble feuilletage,
protections/dos, matières par rareté, consultation des variantes possédées,
fiche carte, accessibilité et responsive. D-099. Le lot précédent est conservé
comme base, sans repartir en petites livraisons. Quantités par variante issues
des cartes existantes, 12 cartes montées, OFF/réduit respectés. Publication et
vérifications du lot complet dans le checkpoint courant : DOM 31/31, cinq
scénarios finitions et sept de feuilletage réussis (un test de timing corrigé),
TypeScript, ESLint et build passent. Publié à `7d127c0f`, Vercel Production
`READY` / `success`. Parcours invité de Production contrôlé : pages, dos,
fiche plein écran, focus/fermeture et largeur 320/390 conformes. Variantes et
matières possédées contrôlées dans les fixtures locales seulement. Aucun run
Actions retourné au relevé ; ressenti tactile non certifié.

**Binder — publié et vérifié sur Vercel (autorisé par Malik) :** feuille
CSS directionnelle, glissement horizontal avec flèches/clavier conservés,
scroll vertical natif, noms complets et rareté sous les pochettes. Garder
12 cartes/page, vue Obtenues, recherche/tri/collections et possession. Aucune
nouvelle règle de jeu, audio ou sleeve à débloquer. Critères : pas de fiche
ouverte par un swipe, tap normal fonctionnel, bords/annulation/filtres corrects,
OFF/mouvement réduit sans attente, noms longs visibles à 320/390 px, aucun
débordement. DOM 29/29, E2E mobile 7/7 nouveaux + 3/3 existants, TypeScript,
ESLint et build réussis. Publié à `da48f70c`, Vercel Production `READY` / contrôle
`success`. Parcours invité de Production vérifié : 12 dos/page, flèches, verrou,
swipe, retour, fiche au tap, nom long complet et largeur correcte à 320/390 px.
Cartes possédées vérifiées dans les fixtures locales seulement. Aucun run Actions
retourné au relevé ; CI complète non certifiée. Preuves : checkpoint courant, D-098.

**Rituel d'ouverture — publié et vérifié sur Vercel (14 octobre) :** garder
l'accueil amélioré, retirer seulement « LE DROP » en double. Peel libre avec
résistance progressive et signal du seuil, consigne « TIRE / RELÂCHE » ;
extraction JS/CSS unifiée à 1,2 s, cinq dos posés avant le reveal ; impact tenu
et lumière/SFX existants synchronisés pour les rares. Récapitulatif mobile
3 + 2 avec noms lisibles, sachet masqué et retour explicite après sa pose
(garde anti-double-tap de 650 ms si effets ON). Pas de BGM, tirage, économie ou
nouveau gameplay. Critères : pas d'ouverture par petit trait, aucun skip par
appui pendant le flip, Commune/Rare/Légendaire distinctes, résumé lisible à
390 × 844, modes OFF/mouvement réduit respectés. D-097 et checkpoint courant
pour les preuves : build/statique/écrans et parcours Chromium ciblés passent.
Code publié sur `main` à `aabd4169`, Vercel Production `READY` / contrôle
`success`. Le tutoriel de Production a été parcouru à 390 × 844 : coupe courte
annulée, ouverture au relâchement, cinq dos à 1 s, reveal à ~1,21 s, cinq cartes
et résumé 3 + 2 sans débordement. Aucun run Actions retourné au relevé, donc pas
de CI complète déclarée verte. Le ressenti tactile reste ouvert.

### Historique des livraisons précédentes

**Reprise après audit audio/Drop :** audit démarré depuis
`d19471fe89b8e7ecda21fc7cce53f6ddeab4d683`, correction publiée sur `main` et
validée au SHA `348ec6943d8f17e62d02739096a1a6b632abed0a`. Elle centralise
le démarrage de la BGM dans l'action de jeu, protège la boucle contre les
chargements asynchrones après mute et supprime le pilotage concurrent dans les
composants du pack. Le Drop conserve `min(58vw, 220px, 34dvh)` en hauteur courte
au lieu d'être réduit par des media queries contradictoires ; les tests vérifient
390 × 844 et le défilement des CTA en petit viewport. Voir le checkpoint de
[passation](agent-handoff.md) pour les résultats exacts. La lecture réelle sur
téléphone, le rendu des biseaux et la sensation du peel restent des validations
joueur, pas des succès déduits des tests.

La CI complète [`38610672014`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38610672014)
est verte (6/6 jobs) : unitaires 1 171/1 171, écrans 130/130, E2E 103 réussis
et 11 scénarios cloud conditionnels ignorés, cloud simulé, migrations SQL,
ESLint, typecheck et build. Le premier run avait identifié une attente de taille
arbitraire et des snapshots d'ouverture périmés ; ils ont été corrigés et
revalidés. Les vérifications ciblées 390 × 844 confirment labels, hint,
séparation de 12 px avec le ticket, accès CTA par scroll et absence de
débordement horizontal. La capture ne montre pas d'artefact latéral net.
Le test unitaire local isolé donne 1 154 succès et 17 erreurs sandbox (Git
`EPERM`/sorties seed silencieuses), mais la suite complète passe sur runner CI.
Build local bloqué par l'environnement (worker Turbopack suspendu, Webpack ne
lit pas `tsc --showConfig`), build CI réussi. Vercel Production `READY` sur
`348ec694`, alias `creator-deckk.vercel.app`. La lecture du contenu par le
connecteur est refusée en 403 ; aucun contrôle navigateur de production revendiqué.

**Empreinte de version (historique) :** le correctif de l’indicateur prévu en
D-018 a été publié au SHA `7e5ecbd2859ae734c772703b1e291650d18c5b1e`. La
Production actuelle est `READY` sur `348ec6943d8f17e62d02739096a1a6b632abed0a` ;
le code du peel conserve son dernier changement au commit `3fec7895`.

**Peel libre — ouverture confirmée, sensation encore perfectible :** au test du
pack tutoriel sur Vercel, Malik confirme que le sachet s'ouvre normalement,
mais précise que le geste n'est pas parfait. Aucun nouveau symptôme concret
n'est rapporté ; garder le point ouvert et ne pas inventer de correctif avant
un défaut plus précis. Le code publié conserve l'ordre X/Y du doigt dans la
bande Y 6–26 %, avec 64 % de couverture, effort minimal `0,22`, ouverture au
relâchement et extraction automatique des cartes. CI GitHub
[`38573481379`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38573481379)
verte (6/6) sur le code `3fec7895`. Les vérifications géométrie 3/3, E2E
49 réussis/1 scénario cloud ignoré, écrans 130/130, typecheck, ESLint et build
datent de cette livraison. Elles ne certifient pas la sensation tactile. Voir
D-092, [le problème connu](known-issues.md) et le dernier checkpoint.

**Audio :** les deux pistes fournies restent des références provisoires. À sa
demande, `springly_sprigs` remplace maintenant la nappe bourdonnante dans
`public/music/hub-late-night.mp3` ; `snow_day` reste hors dépôt. Elle commence
au premier geste autorisé par le navigateur (l'autoplay sonore est bloqué au
chargement mobile), grâce au préchargement au montage. Fondu d'entrée 1,4 s,
raccord cyclique fondu croisé 1,2 s, mute fondu 0,35 s, reprise fondu 1,4 s sans
remise à zéro de lecture. Les gains restent très bas (`0,08` au hub, `0,04`
pendant booster/reveal). Pioche de carte relevée de 4 dB et retournement de
carte de 1,4 dB, la borne de crête des SFX restant inchangée. SFX/audio 23/23,
typecheck et ESLint ciblé passent. Le choix final et l'écoute Vercel sur
téléphone restent ouverts. Voir [audio-assets.md](audio-assets.md).

**Drop — direction visuelle en cours :** objectif « scène d'ouverture de booster »
plutôt que carte/formulaire. Le patch local garde le pack à
`min(58vw, 220px, 34dvh)` sur petits écrans, rend ses faces CSS 3D plus lisibles,
fait boucler un sheen doux en 5 s, renforce sol/halo et place le CTA avant les
infos secondaires. Le hint long est supprimé, le nom du pack reste visible et
les jetons sont repliés dans les détails. Aucun audio, WebGL ou changement de
gameplay. Tests d'écrans 13/13, typecheck, ESLint ciblé et diff-check réussis.
Les E2E téléphone ont d'abord été bloqués par l'absence du Chromium Playwright
prévu; un second passage via Chromium système les a exécutés. Publié sur `main`
au SHA `47f5f4fa`, Vercel Production `READY` (contrôle `success`). La capture a
révélé que les côtés restaient discrets; voir le suivi ci-dessous.

**Suite du contrôle visuel — terminée :** une capture Production à 390 × 844 a
révélé que les faces CSS du sachet étaient orientées vers l'arrière. Correctif
publié à `08785e43` : faces tournées vers le joueur/20 px, sheen renforcé, ticket
tutoriel ramené à « Essayer » + un volet secondaire. Écrans 14/14 et E2E
Chromium mobile 4/4, typecheck et ESLint passent. Vercel Production du SHA
`08785e43` est `READY` / `success`; Chromium a confirmé la face foil de 14,4 px,
le volet tutoriel fermé et l'absence de débordement. Voir le checkpoint de
passation pour les résultats détaillés.

**Avance des cartes :** un appui pendant le flip était mis en file et exécuté
au terme de l'animation ; un second appui pouvait alors agir sur la carte
suivante immédiatement. L'avance est maintenant ignorée et le bouton désactivé
jusqu'à la face visible. Le raccourci explicite « Révéler les cinq cartes d'un
coup » reste disponible. Tests ciblés locaux passent ; Playwright local n'a pas
démarré son serveur. Le scénario a passé GitHub Actions
[`38613807945`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38613807945),
avec 105/105 E2E verts.
Vercel status check `success` ; API de déploiement renvoie 403, donc état READY
non confirmé indépendamment. Le niveau sonore sur appareil reste à écouter.

**Empreinte de version :** l’indicateur prévu dans D-018 n’était pas
effectivement rendu. Le correctif ajoute `Version Android/Web · <commit court>`
dans Toi → Réglages et garde le SHA complet au survol. Il distingue le bundle
du site et celui d’une APK, mais ne décrit pas le solde Supabase du compte.
Un déploiement Vercel met à jour le web ; une APK installée doit être
reconstruite et réinstallée. Code publié au SHA
`7e5ecbd2859ae734c772703b1e291650d18c5b1e` ; Vercel Production `READY`.
Voir la [passation](agent-handoff.md).

**État du code avant le point version :** `main` au SHA `abcd2d0ad5b5c4d896a21f9b68496c9af4a4b832` ;
les boosters de test ont un solde distinct, et le plafond de recharge ordinaire
reste intact. CI GitHub `38490854882` verte (6/6), migration Supabase 0051
appliquée par `38491098387` et Vercel Production READY. La correction précédente
du sachet et du lancement audio est au SHA `8bf36ba0` ; l'écoute sur téléphone
  reste nécessaire pour juger le niveau et la couleur de la boucle. Correctif
  du peel publié à ce SHA, CI `38494377386` verte (6/6), Vercel Production
  `READY`. Voir le [checkpoint](agent-handoff.md) pour les preuves et limites.

- **Audio :** un nouvel asset sans percussion a été publié après le retour de
  Malik sur le « tac-tac » : 24 s, `-22,7 LUFS` source. La reprise locale
  sépare maintenant l'interrupteur Son de l'application de celui de la Musique
  et retire les niveaux de volume ; la shortlist de pistes à écouter est dans
  [audio-assets.md](audio-assets.md). Ces deux interrupteurs sont publiés sur
  `main` au SHA `ee62de9e95fdccad513a0435956bf816927a345a`, Vercel Production
  READY. Aucun morceau externe choisi ou intégré pour l'instant. Le mix
  conserve son ducking du pack et le silence Tribunal. La première CI audio
  (`38499177407`) a révélé un nom accessible obsolète dans un test E2E ; corrigé
  et publié au SHA `28af5919`. La nouvelle CI `38499499108` était en attente/
  cours au dernier relevé. Vercel sert le code audio de `ee62de9e`. Écoute
  physique et choix d'une piste nécessaires.
  Voir
  [D-085](decisions.md), [D-086](decisions.md) et [audio-assets.md](audio-assets.md).

- **Sync compte :** publié sur `main` (`fc5b47ff`) ; la sauvegarde en ligne
  existante est la référence à la connexion et au retour de l'appli ou du réseau.
  Les missions locales calculées après un tirage sont réenregistrées sans
  forçage. La réserve de boosters reste côté serveur : le guide des codes privés
  explique comment obtenir des boosters de test sans réinitialiser le compte.
  Une progression faite hors ligne est remplacée au retour en ligne. Le suivi
  `c3ab397e` est validé par la CI (`38488559202`, 6/6) et déployé sur Vercel.
  Pour Android,
  une APK déjà installée doit être reconstruite et réinstallée ; Vercel ne la met
  pas à jour.
- **Tests de booster sur compte réel :** l'implémentation locale ajoute un
  solde bonus distinct de la réserve et le compteur au Drop ; la recharge
  normale ne change pas. Migration 0051 publiée et appliquée sur Supabase.
  Code publié au SHA `5bdf9f21317a2d6b6557c1cc70f968a3379236e6` ; CI
  [`38490854882`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38490854882)
  verte (6/6), Supabase [`38491098387`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38491098387)
  et Vercel Production READY. À faire côté Malik : créer le code personnel
  `MALIK` (50 ouvertures, une seule utilisation, réservé à son compte) avec
  l'adresse Supabase, via le [guide](booster-test-access.md). Aucun code n'a
  encore été créé.

- **Portraits :** 454 choix manuels protégés, dont le lot de 154 importé le
  13 octobre ; 542 profils restent à examiner dans le pilote. Celui-ci propose
  des images à comparer et n'en remplace aucune automatiquement. Le critère est
  visuel : identité, netteté, visage lisible, résolution et cadrage. Voir le
  [rapport d'import](portrait-import-manuel-lot-2026-10-13.md) et le
  [pilote](portrait-pilot-2026-10-13.md).
- **Ouverture :** peel guidé et continuum publiés, 3D désactivée par défaut.
  Après le retrait de la languette, la cinquième carte ordinaire attend 360 ms
  avant son flip ; Perfect, Reflets désactivés et mouvement réduit n'attendent
  pas. Le correctif publié `b6a3605c` contre les allers-retours figeait le
  geste trop tôt : seuil horizontal de 38 %, puis aucun suivi du doigt. Le
  contour SVG invisible a été corrigé dans `269ec4d7`; le commit `abcd2d0a`
  garde maintenant le suivi X/Y et le rabat en mouvement jusqu'au
  relâchement, tout en gardant une fente géométriquement stable. E2E ouverture
  (45 réussis, 1 scénario cloud ignoré), typecheck, ESLint et build passent.
  Ce dernier correctif est poussé sur `main` ; CI (`38563130307`) et son
  déploiement Vercel étaient en cours au dernier relevé. L'essai physique reste
  à faire. Voir [D-084](decisions.md), [D-088](decisions.md),
  [D-089](decisions.md) et le
  [rapport d'ouverture](booster-continuum-2026-10-12.md).
- **Autres piliers :** Drop et Craft ont reçu leurs ajustements mobiles. Binder
  conserve la provenance d'obtention Live, tandis que le statut de direct actuel
  dépend d'un snapshot récent. Aucun changement d'économie ou de schéma de
  données n'est en attente dans ces livraisons.
- **Sablier connecté :** le contrôle relit désormais le cloud lorsqu’un conflit
  antérieur bloque l’action ; il ne consomme rien tant que le conflit persiste.
  Correctif `1ebc6415` publié, CI `38482257038` verte (6/6), Vercel success. Voir
  [D-079](decisions.md) et la [passation](agent-handoff.md).

## Livraison publiée — sensation de jeu, 13 octobre 2026

Implémentation locale vérifiée, dans l’ordre demandé A → E :

- **A — Audio :** première BGM originale et compressée dans `public/music/`,
  lancée au premier geste, ducking durant pack/reveal, silence musical au
  Tribunal. Le réglage Son et le volume global la pilotent avec les SFX ;
  signatures courtes pour Légendaire, Perfect et fin du Tribunal. Réglages Son
  et Reflets activés par défaut sans préférence mémorisée. Asset encore prototype ;
  remplacement documenté dans [audio-assets.md](audio-assets.md). Un défaut de
  niveau est maintenant suivi séparément en D-085.
- **B — Booster/cartes :** conserver la scène foil CSS et ses cinq dos ; ajout
  d’un placeholder cohérent en cas d’échec de chargement d’un portrait. Ce filet
  ne détecte pas encore automatiquement les portraits flous/pixelisés ; la
  qualité visuelle doit rester revue à l’œil. Le chemin WebGL est retiré du
  composant d’ouverture ; le sachet demeure entièrement CSS. Les timings de
  reveal restent inchangés.
- **C — Tribunal :** quotidien, jauge de karma, tampon/grâce, marteau/ban et
  bilan existaient déjà ; ils sont conservés, avec un stinger de clôture.
- **D — Jeu plutôt qu’app :** le Drop gardait déjà le sachet/CTA en tête et le
  Tribunal près des objectifs. Le thème du Binder s’applique maintenant aussi
  au Drop ; vitrine/streak remontés dans Toi, statistiques et fonctions en ligne
  repliées.
- **E — Binder :** 12 cartes par page (dans la plage 12–18), petite entrée de page
  neutralisée par `prefers-reduced-motion`, et son de page existant sur les
  flèches. Le filtre par cartes obtenues reste le défaut.

Validation sur appareil physique non effectuée. Le rendu sonore du prototype et
la lisibilité des portraits doivent être jugés sur téléphone avant toute
affirmation de finition visuelle. Voir [audio-assets.md](audio-assets.md) et le
checkpoint de passation pour le dernier mix.

## Prochaines étapes

La CI du code D-121 est verte et son parcours invité réel est passé sur Vercel.
Les lots Binder/Atelier/Toi/Nouveautés/Objectifs, ouverture et feuilles sociales
sont publiés. Aucun défaut de code reproduit ne reste ouvert dans ce plan.
Les anciennes cases plus bas sont des relevés historiques, pas des ordres de
rejouer une migration ou un reset.

| Reste réel | Statut et prochaine condition |
| --- | --- |
| Sensation du peel, feuilletage Binder, volume du sachet et écoute des sons | Essais physiques du joueur sur le site Vercel. Les tests navigateur ne tranchent pas le ressenti ; conserver les valeurs actuelles tant qu’aucun symptôme précis n’est rapporté. La sélection BGM est mise de côté à sa demande. |
| Portraits encore sur avatar | Revue visuelle des 542 profils relevés le 13 octobre, avec identité, source et qualité à valider avant remplacement. Le pilote ne publie rien automatiquement ; `SERPAPI_API_KEY` est absent dans cet environnement. Les 454 choix manuels restent protégés. |
| Code privé `MALIK` pour boosters de test | Option personnelle non créée dans le dépôt : nécessite l’adresse exacte du compte cible et l’accès au SQL Editor Supabase. [Procédure](booster-test-access.md). Les boosters ordinaires fonctionnent sans ce code. |
| Démonstrateur `/catalogue-demo` | Prototype isolé livré ; HTTP 200, largeur 390 px sans débordement ni exception JavaScript contrôlés sur Vercel le 16 octobre. Son intégration multi-univers exige un choix produit sur le catalogue, les règles et les droits ; aucun changement du jeu réel n’est engagé par D-076. |
| Soundbites de créateurs, événements Twitch, Last Pack revanchard | Idées de backlog sans sons fournis, droits, règles ni critères d’acceptation. Aucun développement lancé ; ne pas inventer ces mécanismes à partir d’un « Next » général. |
| Vol Last Pack, achat/dépôt Hôtel et autres transactions sociales réelles non parcourues | Vérifications en Production encore possibles avec comptes et cartes de test ; le moteur et les interfaces ont des tests simulés. Ne pas annoncer ces transactions vérifiées en conditions réelles avant leur exécution. |

## Historique — statuts à leur date, remplacés par le plan ci-dessus

## Ergonomie courte et geste de révélation — 11 octobre 2026

Les états du sablier se résument à une note contextuelle ; sa réussite affiche
le nouvel effet dans la notice existante. La collection conseillée tient sur une
ligne et le choix des pages du Binder est plus compact. Une carte accepte un
balayage horizontal ou vers le haut après le flip ; le bouton reste disponible,
et Perfect/verrouillage ne changent pas. Les familles du menu Toi sont séparées
plus clairement. Le CSS de continuité est scopé à `.booster-presentation` ; le
contrôle des quatre feuilles ne trouve aucun sélecteur exact ou keyframe en
double. Le mouvement réduit coupe le reflet infini avant déchirure.

Les tests de geste vérifient le glissement lent, le recul/relâchement et le
chemin « Ouvrir sans déchirer ». Scan : 1 000 WebP décodés, aucun invalide ; seul
`diverron.webp` ressortait majoritairement vert. Le 12 octobre, une photo fournie
et restaurée a remplacé le secours SVG à l’affichage. Aucun nouveau moteur, SQL,
règle de jeu ou timing.

Les sections datées ci-dessous sont un journal de livraisons et d’observations,
pas une liste de tâches à reprendre. Les anciennes cases `[ ]` sont historiques
tant qu’elles ne figurent pas dans le « Plan actif » ci-dessus. État détaillé et
preuves dans [la passation](agent-handoff.md).

## Ouverture du sachet — cartes dégagées (11 octobre 2026)

L’enveloppe disparaît pendant la sortie des cinq dos ; ses flancs et son ombre
ne restent pas sous la pile. Disparition immédiate lorsque Reflets sont coupés
ou que le système réduit les animations, pile visible dans les deux cas. Le
passage à Reveal conserve son délai de 1900 ms, les timings Reveal/Perfect/
silence/tear restent inchangés. E2E ciblé : 4/4 bureau et téléphone simulé ;
CI `38162996089` et `38164889818` vertes. Retour physique classé A dans le plan
courant. Pas de migration.

## Missions du jour — libellés corrigés (11 octobre 2026)

Bilan toutes faites générique (les quatre missions de configuration), mission
Tribunal avec explication des cinq dossiers distincts et icône. Aucun changement
de progression/récompense. DOM 2/2, lint ciblé et diff-check verts ; contrôles
GitHub suivis par Malik.

## Accès Arène et Hôtel — clarification livrée localement (11 octobre 2026)

Dans le menu Toi, afficher compte requis, cartes distinctes nécessaires (X/5),
présence en direct au dépôt ; pour l’Hôtel, doublons vendables et points actuels.
Feuilles accessibles pour comprendre les fonctions avant prérequis. Aucun gate,
seuil économique ou SQL ajouté. DOM ciblé 6/6, ESLint/diff-check réussis.
Publié/CI à vérifier après commit ; détails dans la passation.

## Profil et K-037 — statut Scène serveur (11 octobre 2026)

Lot préparé pour main : disponibilité quotidienne vérifiée avant de proposer
l’ouverture et à nouveau avant déchirure ; refus déjà ouvert normalisé, Scène
visible et expliqué. Profil : pseudo, vitrine épinglée/automatique, pages réunies,
Légendaires uniques, collection en cours et personnalisation existante accessible.
Local : 146 unitaires magasin, 16 DOM, 6 E2E locaux et 2 cloud simulés réussis ;
contrôles longs GitHub en suivi au joueur, téléphone physique non validé.
Binder, Craft et identité du profil sont implémentés ; aucun nouvel équilibrage,
SQL ni chantier K-031 inclus. Preuves et limites dans la passation.

## Craft — préparer sa prochaine carte avant le seuil (11 octobre 2026)

Lot préparé pour main : aperçu de trois cartes manquantes Standard, coûts réels,
priorité à la collection Binder, valeur du recyclage groupé et explication des
Live conservés. Seuil de dix copies recyclables inchangé ; aucun achat/recyclage
avant déblocage. Local : 13 DOM puis 6 retests enrichis, 2 E2E réussis,
typecheck/lint/jargon verts ; suites longues GitHub en suivi au joueur.
Identité du profil implémentée dans le lot suivant ci-dessus. Preuves/limites dans la passation.

## Binder — collections courtes (11 octobre 2026)

Lot préparé pour main : objectifs de 12 cartes maximum par famille, compteurs
uniques, manquantes visibles, sélection gardée sur l’appareil et vue Obtenues
conservée au démarrage. Local : 4 unitaires, 10 DOM, 8 E2E puis 2 retests ciblés
réussis ; suites GitHub laissées en suivi au joueur. Voir la passation.
Critères : aucun doublon compté deux fois, pages limitées, choix retrouvé au
rechargement, page complète explicite. Économie et paliers inchangés.
Craft avant le seuil est implémenté dans le checkpoint suivant ci-dessus ;
identité du profil est implémentée dans le lot ci-dessus.

## K-036 — scroll et ouverture distincts

Publié sur main `0d860d6` : scroll libre depuis le sachet ou sa zone ; appui
explicite pour la scène de déchirure. CI 38155656424 success (50 E2E, 8 cloud
simulés, 1118 unitaires, 86 DOM, 645 SQL). Supabase automatique 38155870699
success, aucun SQL exécuté. Liens/preuves dans la passation ; téléphone réel
à vérifier.

## Audit produit P0/P1 — publié et CI verte, 11 octobre 2026

Essai invité sans gains, Tribunal visible en un appui avec feedback/bilan/mission
« Juge 5 dossiers », objectif prioritaire après le premier booster, Drop secondaire
replié et profil explicite. Son/reflets ON par défaut et vitrine/série/cascade/raretés
existants conservés. Sachet et espacements ajustés pour garder le sablier au-dessus
de la navigation. Code main `3d3ef31`, CI **38153757540 success** : 1118 unitaires,
86 DOM, 645 SQL, 46 E2E sans cloud et 8 cloud simulés. Contrôle Supabase
**38153978544 success**, aucun SQL exécuté. Liens/preuves dans la passation.
P2 et K-031 séparés ; validation sur téléphone physique toujours à effectuer.

## K-034 — résolu et confirmé en automatique — 11 octobre 2026

Correctif publié sur main : [ee10a6d](https://github.com/GoodFight37/CreatorDeck/commit/ee10a6d46dcf8f91e585d77493f48271b981e31e).
Validation locale des fichiers séparée du plan sur l'historique réel ; manual
installée ne bloque plus, approbation maintenue pour manual en attente.
[CI 38142506934](https://github.com/GoodFight37/CreatorDeck/actions/runs/38142506934) : quatre jobs verts, outil 28/28.
[Run automatique 38142681999](https://github.com/GoodFight37/CreatorDeck/actions/runs/38142681999) : **success** sur ce SHA, log lu :
« La base est déjà à jour et vérifiée. Aucun SQL de migration exécuté. »
Git/API/logs effectivement accessibles, preset et six domaines appliqués sans changement réseau.
0047 non réappliquée, K-031 inchangé, téléphone réel toujours à tester.
Comptages CI, commandes, SHA et limites : [checkpoint courant](agent-handoff.md).
Les sections suivantes sont des observations historiques datées.

## Sablier visible et booster bonus — historique, essai téléphone confirmé

- [x] Bouton sablier sorti du menu replié ; informations secondaires allégées.
- [x] Réserve 4/4 → 5/4 par un sablier, un seul bonus consommable avant
  l’ouverture ; moteur local et RPC alignés dans migration `0048` (manual).
- [x] Tests ciblés 119 unitaires, 8 écrans, SQL jetable jusqu’à 0048, typecheck,
  ESLint ciblé et diff-check passent localement.
- [x] Publié sur main `6bc6be7` ; CI 38145382045 verte (4 jobs, SQL, 42 E2E,
  6 parcours cloud simulés inclus).
- [x] Migration `0048` appliquée seule via run manuel 38146774310 ; connexion
  TLS, cible CreatorDeck, historique et vérification après application réussis.
- [x] Malik confirme le test réel : sablier à 4/4 → 5/4, puis ouverture → 4/4.

K-035, D-037 ; détails et limites dans [la passation](agent-handoff.md).

## Complément historique du 11 octobre 2026 — K-034 avant correction

À cette date, 0047 est appliquée et vérifiée ; K-034 reste alors ouvert. Il a
ensuite été corrigé dans `ee10a6d`, CI verte, run automatique `38142681999`
réussi. Cette note garde la reproduction historique, pas une prochaine action.
Voir [la passation actualisée](passation-chat-temporaire-0047.md) pour reproduction,
preuves, limites, réseau du nouvel environnement et blocage d'édition signalé.
Les sections suivantes conservent les observations historiques datées.

## Reprise d’application 0047 — 11 octobre 2026

- [x] Absence de sauvegarde explicitement acceptée par Malik ; cible CreatorDeck et SQL additif relu.
- [x] Dry-run réel réussi sur 9788208 : run 38139346769, aucune migration appliquée.
- [x] Blocage K-032 reproduit ; correctif E2E cloud 6/6 localement, assertions conservées.
- [x] Correctif 1dd5b53 publié, CI 38139620497 verte, dry-run 38139632409 réussi.
- [x] Incompatibilité CLI/config résolue (5832b5d, 24/24 tests), CI 38140313000 verte ; application 0047 38140515537 réussie et historique/objets vérifiés, contrôle final 38140562490 réussi.
- [ ] Essai débit/recharge/rechargement et ouverture sur téléphone réel.

Voir le checkpoint courant pour preuves, limites et autorisation.

## Sabliers en ligne — correctif du 11 octobre 2026

- [x] Origine retrouvée : `5c120f3`, passage de la réserve au serveur.
- [x] Débit/recharge atomiques, solde synchronisé, clé de rejeu persistante et
  garde contre les anciennes sauvegardes : code publié sur main, `aded8ff`.
- [x] Contrôles locaux : 1117 tests unitaires, 83 DOM, 643 assertions SQL,
  E2E bureau/téléphone simulé 2/2 ; typecheck, lint et build webpack réussis.
- [x] **0047** appliquée au projet CreatorDeck et versions/objets vérifiés (38140515537). Cible/historique contrôlés, absence de sauvegarde explicitement acceptée par Malik.
- [x] Malik confirme que le sablier a été testé sur téléphone réel et que tout est bon ; le comportement est validé par retour utilisateur. La version servie n’a pas été vérifiée séparément par l’agent.
- [x] K-031 : corrigé par migration additive `0049_pack_refresh_ancre.sql`, appliquée et vérifiée automatiquement (38163920425) après CI verte (38163674938). Tests de conservation du temps restant en TypeScript et PostgreSQL jetable.

K-030, D-032 ; gains locaux et montants conservés, pas de certification serveur
complète de leurs sources. Le nouveau helper privé préserve le temps résiduel
pour les sabliers ; aucune correction globale de la recharge ordinaire.
Commandes, preuves, limites et reprise Cloud/PC dans [la passation](agent-handoff.md).

## Objectif quotidien après Live Drop en ligne — 11 octobre 2026

- [x] Conserver les compteurs de mission lors de l'adoption de la sauvegarde
  serveur du Live Drop : correctif publié sur main, `bd97f71`, SHA vérifié.
- [x] Test cloud ciblé 135/135, typecheck, ESLint ciblé et diff-check réussis.
- [x] Accès GitHub rétabli par exécution réseau autorisée avec le proxy existant
  (K-029) ; aucune règle réseau ou donnée Supabase changée.
- [ ] Vérifier la version servie puis le prochain Live Drop → objectif 1/1 sur
  téléphone réel ; aucune récupération rétroactive des ouvertures passées.

K-028, D-031 ; commandes et publication dans [la passation](agent-handoff.md).

## Test navigateur complet du cadeau — 11 octobre 2026

- [x] Scénario bureau/téléphone simulé : tutoriel puis boîte cadeau, message,
  ordre correct, un claim, cinq tirages de cinq cartes, solde standard intact.
- [x] Suppression du toast redondant qui recouvrait le prochain bouton cadeau.
- [x] 2/2 Playwright, typecheck, lint, build webpack et diff-check réussis avec RPC factices ;
  aucune connexion à Supabase production ni migration.
- [ ] Contrôle cadeau sur le téléphone réel et la version effectivement servie ;
  attend le retour de Malik après examen du nouveau Drop/Binder.

D-030, K-027 ; commande exacte et historique de diagnostic dans
[la passation partagée](agent-handoff.md).

## Accueil Drop et Binder — 11 octobre 2026

Chantier demandé par Malik pendant son absence : **les deux priorités sont
implémentées**, identité de table de collectionneur (sachet + ticket crème),
ouverture mise au premier plan, puis objectif/activités et trouvailles
consultables. Binder : Dernières reçues, page à compléter calculée, vrais
manquants, retour au Drop à vide. D-029 ; mêmes moteurs et règles.

- [x] Accueil et Binder responsive, contrôles clavier/retour, 78 tests d’écran,
  1 109 tests logique, typecheck/lint/build webpack locaux réussis.
- [x] Captures Chromium examinées : 320 × 568, 412 × 915, 1280 × 900 ;
  pas de débordement ni erreur JavaScript sur les parcours capturés.
- [x] Navigateur sur export final : 42 réussis/2 scénarios cloud ignorés, code 0 ;
  six nouveaux parcours bureau/téléphone simulé compris. Code publié `4f91c71`.
- [ ] Validation personnelle esthétique/tactile sur le téléphone de Malik,
  avec le commit réellement servi. Ni CI distante ni Vercel inspectés ici.

Commandes/résultats navigateur et état Git exact : [checkpoint courant](agent-handoff.md).
Le brouillon cadeau, terminé comme test et validé en navigateur, est décrit plus haut.
Passation commune Cloud/local maintenant explicite ; pas d’autre chantier lancé.

**Automatisation Supabase** : Malik confirme le nouveau dry_run réussi après
la CA intégrée dans `37e34e6`. Contrôle en lecture seule réussi selon opérateur ;
ce retour remplace les statuts historiques « connexion à valider » ci-dessous.
La migration 0047 a depuis été appliquée et vérifiée ; voir le checkpoint courant
et [la procédure](mises-a-jour-automatiques.md). Ce paragraphe décrit le lot UI
au moment où il a été livré, avant l'application de 0047.

## CA Supabase intégrée — 11 octobre 2026

Certificat public fourni par Malik intégré au dépôt, chargé automatiquement sans nouveau secret CA. 21/21 tests locaux, signature/empreinte/expiration vérifiées. Nouveau dry_run réel requis pour confirmer la résolution du blocage TLS ; aucune migration production exécutée. Ne pas changer le mot de passe sans nouveau refus d’authentification.

## Connexion TLS Supabase — 11 octobre 2026

Dry_run fourni : SELF_SIGNED_CERT_IN_CHAIN. Support certificat CA officiel préparé/testé (20 tests) ; configuration du certificat puis connexion réelle encore requises. Ne pas modifier le mot de passe pour cette erreur. TLS reste vérifié, aucun changement produit/base. [Procédure](mises-a-jour-automatiques.md).

## Diagnostic connexion Supabase — 11 octobre 2026

Erreur réelle encore inconnue : ancien script masquait tous les codes PostgreSQL. Diagnostic sûr par cause ajouté ; contrôle manuel dry_run indépendant de la CI complète, aucune migration dans ce mode. Application réelle toujours bloquée sans CI verte. Connexion réelle reste à vérifier avec le nouveau workflow ; aucune nouvelle configuration de mot de passe demandée. Test navigateur cadeau suspendu, inachevé et non publié.

## CI navigateur après tutoriel — 11 octobre 2026

Échec du scénario cloud expliqué : mock onboarding incomplet et scénario ancien supposant le tutoriel terminé. Tests adaptés, sans modification produit/SQL. Suite locale 36 réussis/2 cloud ignorés, code 0 ; scénario cloud vérifié séparément, typecheck/lint réussis. Publication/CI distante à confirmer. L’automatisation Supabase attend la CI verte et le contrôle réel dry_run, pas une nouvelle configuration du secret.

## Automatisation Supabase — 11 octobre 2026

Préparée/testée localement : workflow après CI verte, plan protégé, historique standard Supabase, secret GitHub isolé. **Connexion réelle à valider** : historique 0001–0046 enregistré après preuves et secret GitHub ajouté selon retour opérateur ; lancer le contrôle manuel dry_run après CI verte. Aucun SQL/déploiement réel exécuté. Vercel indépendant, ordre de publication non contrôlé. [Procédure](mises-a-jour-automatiques.md).

## Rejouer le tutoriel — 11 octobre 2026

Implémenté et testé localement : reset individuel rejoue les trois étapes puis rend le cadeau restant accessible, sans recrédit. Nouvelle migration 0046 et client nécessaires ; production/validation téléphone attendues. 0045 est déjà active d'après le contrôle transmis par Malik, quatre cadeaux subsistent sur le compte testé. Critère restant : nouveau build + 0046, puis parcours réel Toi → reset → tutoriel → message → ouverture des quatre cadeaux. Voir la passation pour commandes/résultats.

## Chantier livré localement — tutoriel, reset global, cadeau — 10 octobre 2026

## Suivi production — bug d'ouverture du cadeau — 11 octobre 2026

Malik a appliqué 0043 puis 0044 dans le SQL Editor Supabase. Le résultat de contrôle partagé confirme le marqueur, 16 lignes tutoriel, 16 cadeaux et zéro tirage/carte/échange en attente/annonce active. En jeu, après le premier claim et l'ouverture d'un booster, les quatre ouvertures restantes échouent car le client rappelle le RPC de claim à chaque clic. Cause prouvée dans `creator-deck-app.tsx` et `claim_return_gift()`.

- [x] Migration additive 0045 : claim rejouable sans recrédit, statut `gift_claimed` exact ; tests API et SQL réussis sur Postgres jetable. Application de 0045 en production en attente.
- [x] Client : après le premier claim, afficher « Ouvrir un booster cadeau · N restants » et ouvrir directement ; `npm test` 1 109/1 109 et `npm run ecrans` 73/73.
- [x] Code poussé sur `main` au commit `9710baf` et SHA distant vérifié. Statut Vercel non vérifié.
- [ ] Appliquer 0045 dans Supabase puis vérifier le claim avec quatre boosters restants. Pas de validation téléphone supplémentaire pour cette correction.

Le code et les vérifications détaillées sont dans la passation. Aucun autre taux, récompense ou règle de tirage n'est modifié.

Code `f97ea42` et checkpoint `30490b4` poussés sur `main`. Migration additive `0044_tutoriel_reset_cadeau.sql`, tutoriel trois étapes et sauvegarde serveur, cadeau de 5 tirages distincts disponible après tutoriel, tirage serveur existant, CTA « Retour au Drop ».

- [x] Reset global one-shot : identifiants, profils, amis et historiques conclus conservés ; trades en attente annulés, annonces actives retirées, progression/réserves remises au départ ; cadeau préprovisionné pour chaque compte existant.
- [x] Tests API/UI/SQL : ordre tutoriel puis cadeau, message exact, claim unique, cinq ouvertures de cinq cartes et absence de débit réserve/paiements ; données préservées et migration rejouée sans écraser progression ultérieure.
- [x] Validations locales : `npm test` 71 fichiers/1 109 tests ; `npm run ecrans` 13 fichiers/73 tests ; typecheck, lint, build webpack, et `npm run supabase:verify` tous verts. Le build Turbopack standard ne fonctionne pas dans le Cloud restreint (port local refusé) ; `npm run build -- --webpack` réussit. Aucun téléphone réel ni E2E navigateur pour ce lot.
- [x] Code et checkpoint poussés sur `main` ; aucune PR fusionnée ou branche supprimée.
- [ ] Application réelle désormais autorisée par Malik, toujours sous condition de vérifier cible, schéma et sauvegarde récupérable. Accès Cloud bloqué CONNECT 403 ; alternative via tableau de bord Supabase et contrôle en lecture dans [le guide](supabase-reset-access.md). Aucun reset exécuté par cette session.
- [x] Correctif K-018 avant application : helper cadeau séparé, helper ordinaire préservé. Suite projet 1 109 tests et SQL jetable réussis le 11 octobre.

Résultats et limites exacts dans [la passation](agent-handoff.md), choix dans [les décisions](decisions.md), risque de procédure dans [les problèmes connus](known-issues.md).

## État courant après consolidation — 10 octobre 2026

- GitHub ne contient plus qu'une branche, `main`, actuellement au commit `2c9b6c4ae98898711bb6041c2297b17ac2a1a312`. La PR #7 est intégrée ; la PR #8 est fermée car devenue obsolète.
- Le correctif du Paquet Scène est intégré : tests ciblés 35/35 et vérification des migrations 0001–0043 sur PostgreSQL jetable sous WSL, avec 559 contrôles réussis selon les résultats consignés. Aucun accès ni changement en production.
- L'audit du moteur local a terminé 12 000 trajectoires (12 scénarios × 1 000), graine `20261010`, sans paquet manquant. Il mesure le moteur TypeScript local ; il ne constitue pas une simulation de la progression côté Supabase.
- Sur l'arbre de code du commit `53e6127d21a8e5d5ec173bfbe1b29e79d5f097c0`, les tests projet (70 fichiers, 1 104 tests), typecheck et build ont réussi ; le commit de consolidation `2c9b6c4` conserve le même arbre de code. Le contrôle Vercel de `2c9b6c4` est vert. Le workflow GitHub Actions #258 du commit `ecfe17a` a réussi : ses quatre jobs (qualité/build, E2E, SQL jetable et cloud simulé) sont verts.
- Les anciennes notes ci-dessous sont conservées comme historique ; les priorités actives plus bas sont la référence pour la suite.

## Parite Scene Supabase - validation locale terminee, 10 octobre 2026

- [x] Migration 0043 corrigee : cinq cartes distinctes, sans Legendaire, candidats garantis reserves et petites familles completees.
- [x] Tests cibles : 35/35.
- [x] PostgreSQL jetable sous WSL : migrations 0001-0043 rejouees, tous les controles passent, y compris les familles a peu ou zero Epique et le refus des familles incompatibles.
- [x] Aucun acces a Supabase production, aucun secret, aucun merge ni changement de main.
- [x] Correctifs de fixture et documentation commit/push sur la branche ; aucun merge ni changement de production.

## Audit Scène validé — 10 octobre 2026

Sur le commit `7da3d1c`, les 1 000 trajectoires par scénario ont terminé : 12 scénarios, 12 000 trajectoires, graine `20261010`, zéro paquet manquant. Résumé et limites : [audit-progression.md](audit-progression.md). Cet audit de progression valide uniquement le moteur TypeScript local. **À distinguer de la parité Paquet Scène**, vérifiée ensuite dans une base PostgreSQL jetable après la migration 0043.

## Chantier visuel — ouverture de boosters, 10 octobre 2026

- [x] Donner du volume CSS au sachet d’accueil et à PackTear, incliner l’objet sous le doigt, et animer son foil sans WebGL.
- [x] Plier les flaps avec une fente lumineuse et extraire les cinq dos en cascade sous une seconde ; garder le relais existant de 1,9 s.
- [x] Augmenter la présence de la carte plein écran et distinguer les raretés : entrée discrète pour les Communes, punch et halo bordeaux dès Rare, intensité croissante pour Épique/Légendaire.
- [x] Rendre la déchirure plus longue et texturée. Conserver les timings du silence Épique, du verrou Perfect et du bang sur le flip.
- [x] Tester Reflets désactivés / mouvement réduit : inclinaison tactile, specular, foil et animation lourde coupés. Typecheck, build et tests UI 70/70 réussis.
- [ ] E2E bureau 11/11 a passé avant le dernier ajustement de pose CSS ; le test ciblé après cet ajustement est resté suspendu au serveur Playwright local. À relancer avec le prochain parcours navigateur.
- [ ] Confirmer le rendu et le geste sur téléphone réel (VIS-01). La suite générale signale quatre tests SQL/catalogue désynchronisés, hors de ce chantier ; aucune migration Supabase n’a été touchée. Le déploiement Vercel prêt pour `main` est une prévisualisation ; Production pointe toujours vers `arena/01a10c75-creatordeck`.

# Roadmap CreatorDeck

## Checkpoint UX — 10 octobre 2026, deux passes

Deux lots UX sont publiés sur `main` : première boucle au commit [`1769636`](https://github.com/GoodFight37/CreatorDeck/commit/1769636dab8069486f64dff3ed81404eb0e86bb6), puis démarrage collection au commit [`09487de`](https://github.com/GoodFight37/CreatorDeck/commit/09487de). Le Binder ouvre sur les cartes obtenues, l’état vide invite à ouvrir un booster et laisse le catalogue accessible à la demande ; les pages de catalogue sont limitées à 12 cartes. La révélation se termine par un récapitulatif des cinq cartes, du nombre de nouvelles et une réouverture directe si la réserve le permet. Son/reflets sont actifs sans préférence enregistrée ; un choix OFF persistant reste respecté. L’Atelier cache ses listes avant dix copies recyclables, Toi met en avant les trois meilleures cartes possédées et la série, et Drop montre une mission existante. Aucune récompense ni règle d’économie n’a changé.

L’avis sur téléphone réel reste à recueillir.

Validation locale après la deuxième passe : écrans **72/72**, typecheck, lint
et build réussis ; contrôles ciblés après la dernière assertion **13/13**.
`npm test` complet : **1102/1106**, avec quatre échecs préexistants de
génération/synchronisation catalogue et saisons et de comptage SQL (`supabase-profil`).
`npm run catalog:ci` échoue aussi parce que `0003_catalogue.sql` est dérivé de
`creators.json`. Ces échecs sont hors périmètre UX et restent à corriger dans
un lot de cohérence données/migrations. La prévisualisation Vercel du commit
`427229f` est `READY` (`target: null`, alias `creator-deckk-git-main-hafsi37-2386.vercel.app`)
et son contrôle combiné est vert ; ce n’est pas Production. L’outil Actions n’a
retourné aucun run associé et n’établit donc pas l’état des workflows GitHub.
Aucun accès à Supabase de production. Le prochain lot produit à cadrer
porte sur l’entrée sociale visible, les badges/avatars et la cohérence visuelle
des portraits ; l’état de la configuration des rappels doit être vérifié avant
tout nouveau push. La validation sur téléphone reste ouverte.

## Identifiant de build — 10 octobre 2026

Le profil Toi affiche une version courte issue du SHA Git de la compilation.
Le commit applicatif `152c217` a passé les tests d’écran et de formatage, le
typecheck, le lint et le build ; le bundle local contient ce SHA. Vercel et les
Actions GitHub restent à vérifier sur la tête poussée avant de confirmer que la
version affichée sur le preview est celle attendue.

## Audit produit — progression et économie (10 octobre 2026, première passe)
### Exécution réelle du bilan local — résultats transmis le 10 octobre 2026

L'utilisateur a exécuté avec succès `npm run progression:bilan` sous Windows, depuis son clone local. **Une trajectoire aléatoire par profil**, sans seed et sans vérification cloud ; ces résultats ne sont pas des moyennes.

| Profil | Durée | Live | Scène | Uniques | Recyclées | Points recyclage | Craft | Jetons achetés | Points restants | Sabliers restants |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Occasionnel | 7 j | 14 | 7 | 96 | 13 | 572 | 4 | 0 | 223 | 41 |
| Régulier | 7 j | 42 | 7 | 224 | 28 | 1 027 | 7 | 0 | 605 | 62 |
| Intensif | 7 j | 84 | 7 | 373 | 90 | 4 588 | 7 | 1 | 5 158 | 87 |
| Occasionnel | 30 j | 60 | 30 | 301 | 177 | 10 579 | 27 | 1 | 170 | 140 |
| Régulier | 30 j | 180 | 30 | 627 | 449 | 22 303 | 30 | 2 | 12 855 | 221 |
| Intensif | 30 j | 360 | 30 | 848 | 1 122 | 59 542 | 30 | 5 | 53 365 | 323 |

**Observations, non décisions d'équilibrage :** forte accumulation de points chez le joueur intensif, sabliers non consommés dans le scénario, progression rapide vers 85 % du catalogue en 30 jours pour le profil intensif. La stratégie de simulation fabrique au plus une carte par jour, et les horaires du modèle ne reflètent pas une distribution réelle d'utilisateurs. Faire des simulations multi-seeds et tester une stratégie de dépense plus réaliste avant tout changement de paramètres.

### Audit avec le moteur réel — outil ajouté le 10 octobre 2026

- [x] Script `scripts/progression-bilan.ts` ajouté et commande `npm run progression:bilan` exposée dans `package.json` ; branche `design/booster-reveal-polish`.
- [x] **Exécuter** la commande sur un clone installé : succès confirmé par la sortie PowerShell fournie par l'utilisateur. Les résultats restent non reproductibles sans seed.
- [x] Répétition statistique et métriques reproductibles — terminées : 1 000 simulations par scénario, 12 scénarios, graine `20261010`, 12 000 trajectoires et zéro paquet manquant ; résultats dans [l'audit](audit-progression.md).
- [ ] Vérifier la parité des gains et de la sauvegarde avec Supabase sur un projet de test autorisé ; ne pas appliquer de migration en production sans validation.
- [x] Tester les échanges et l'hôtel des ventes avec plusieurs comptes de test sur PostgreSQL jetable — contrôles couverts par `supabase:verify`, 559/559 réussis et workflow Actions #260 vert ; aucune base de production utilisée.

**Couverture du script :** trois profils de 2, 6 et 12 ouvertures Live par jour sur 7 et 30 jours ; une Scène quotidienne, recyclage groupé hors Live, réclamation des missions/jalons/saisons, achat d'une carte Épique aux jetons et Craft d'une Rare ou Épique si possible. Les tirages sont seedés. Les anciennes 1 000 répétitions par scénario restent documentées dans [l'audit historique](audit-progression.md). Une correction de calendrier fait maintenant tenir les visites à heure fixe en heure locale Europe/Paris, comme le Prime Time ; 100 répétitions par scénario et 1 200 trajectoires ont été exécutées et consignées dans le même rapport. Aucun sablier n'est dépensé et aucun échange, présence réelle ou RPC Supabase n'est simulé. Ces chiffres décrivent les scénarios, pas les habitudes réelles.

**Problèmes à investiguer :** la mission « recycle un doublon » peut être impossible le premier jour selon le tirage ; la rentabilité du Craft en fin de collection doit être mesurée ; les variantes Live sont exclues du recyclage groupé ; les achats ciblés en jetons et le Craft utilisent des cartes Standard ; les gains en cloud ont une autorité différente du local. Les anciennes estimations Monte-Carlo indépendantes ne tiennent pas compte de ces nuances et ne doivent pas servir seules à modifier l'équilibrage.


### Scénarios quantitatifs simplifiés — 10 octobre 2026
### Monte-Carlo indépendant — collection et doublons (10 octobre 2026)

**Méthode :** 1 000 parties indépendantes pour chaque couple (2, 6, 12 Live Drop par jour) × (7, 30 jours), graine pseudo-aléatoire déterministe par partie. Reprise des cinq tables de rareté Live de `src/data/pull-rates.json`, du Perfect Live (1‰, 82 % Épique / 18 % Légendaire), de la garantie Légendaire au 12ᵉ booster sans Légendaire, et des effectifs actuels du catalogue (300 Communes, 300 Peu communes, 230 Rares, 120 Épiques, 50 Légendaires). Choix uniforme d'un créateur à l'intérieur de sa rareté. Chaque carte est « nouvelle » si le créateur n'a jamais été tiré ; sinon elle est comptée comme doublon et sa valeur de recyclage est additionnée à titre **potentiel**, pas comme crédit effectif.

| Profil | Durée | Live | Créateurs distincts (moyenne) | Doublons (moyenne) | Points de recyclage potentiels (moyenne) | Boosters avec Légendaire (moyenne) |
|---|---:|---:|---:|---:|---:|---:|
| Occasionnel, 2/j | 7 j | 14 | 67,4 | 2,6 | 131,5 | 1,9 |
| Occasionnel, 2/j | 30 j | 60 | 257,4 | 42,6 | 2 173,4 | 8,7 |
| Régulier, 6/j | 7 j | 42 | 188,6 | 21,4 | 1 083,1 | 6,0 |
| Régulier, 6/j | 30 j | 180 | 584,7 | 315,3 | 16 100,6 | 26,7 |
| Intensif, 12/j | 7 j | 84 | 339,6 | 80,4 | 4 099,3 | 12,3 |
| Intensif, 12/j | 30 j | 360 | 820,7 | 979,3 | 49 974,3 | 53,6 |

**Interprétation prudente :** l'accumulation de doublons s'accélère fortement après plusieurs centaines de tirages ; le Craft, les jetons et les échanges sont donc cruciaux. Les valeurs de recyclage supposent que chaque doublon de créateur puisse être recyclé, **ce qui ne reproduit pas exactement la règle réelle** : le moteur distingue les variantes (Standard/Live/Holo/Gold), et protège notamment les Live du recyclage de masse. Les points sont des valeurs théoriques maximales dans ce modèle, non des revenus réels. Pas de Paquet Scène, pas de ciblage familial, pas de variations Live/Holo/Gold, pas de bonus Direct, pas de Craft, pas de missions, pas de dépenses, pas de simulation Supabase. Les résultats ne sont pas des mesures du moteur ni de l'application en production.

**Suite de simulation locale réalisée depuis cette estimation :** le script décrit plus haut appelle désormais `game-engine.ts` et couvre variantes, Paquet Scène, recyclage réel, Craft, missions/jalons/saisons et achats en jetons, avec des tirages seedés. Les horaires ont été alignés sur l'heure locale et 100 répétitions par scénario sont consignées dans [l'audit](audit-progression.md). La comparaison de catalogues agrandis, la complétion moyenne par famille et l'acquisition d'une cible par rareté sont maintenant mesurées séparément dans [l'étude de croissance](audit-croissance-catalogue.md). Ces scénarios restent indépendants du moteur et du serveur ; aucun taux n'a été modifié.


Simulation exploratoire indépendante (et **non** exécution du moteur TypeScript ni du serveur). Hypothèses : stock initial 2, réserve maximale 4, recharge naturelle 1/30 min, visites fixes chaque jour (occasionnel 12 h/21 h, régulier 8 h/13 h/20 h, intensif 7 h/10 h/13 h/16 h/19 h/22 h), sans sabliers. Les ouvertures sont distribuées entre visites ; chaque scénario arrive à ouvrir ses 2, 6 ou 12 boosters Live quotidiens. Le Prime Time est compté seulement sur les ouvertures à 20 h. Points et jetons incluent les six petites récompenses de série, répétées chaque semaine, **sans** bonus de jalons, saisons, recyclage, missions, Paquet Scène, Perfect ni dépenses. Les chiffres sont des scénarios conditionnels, pas une prédiction des habitudes réelles.

| Profil | 7 j : Live / jetons / points | 30 j : Live / jetons / points |
|---|---:|---:|
| Occasionnel, 2/j | 14 / 109 / 658 | 60 / 460 / 2 600 |
| Régulier, 6/j | 42 / 263 / 994 | 180 / 1 120 / 4 040 |
| Intensif, 12/j | 84 / 473 / 1 498 | 360 / 2 020 / 6 200 |

**Lecture :** à 30 jours, le joueur intensif ouvre 6 fois plus de boosters que l'occasionnel ; les jetons progressent ici de 460 à 2 020 (×4,39) car les bonus fixes de série atténuent l'écart. Le régulier et l'intensif atteignent le coût de 400 jetons bien plus tôt, mais ce calcul n'intègre ni les autres récompenses ni les achats effectués. Ne **pas** interpréter le nombre de boosters divisé par 12 comme un nombre de Légendaires garanti : les tirages anticipés réinitialisent le compteur, et un Perfect peut aussi affecter le rythme.

**Limites bloquantes avant décision d'équilibrage :** absence de tirages aléatoires de créateurs, donc pas de doublons, taux de collection, gains de recyclage, dépenses d'artisanat ou répartition des raretés ; pas de modèle de présence réelle aux heures de visite, de l'usage des sabliers, des missions, du Paquet Scène ni de la synchronisation Supabase. La prochaine passe doit exécuter le moteur réel sur des trajectoires reproductibles et documenter les résultats statistiques, sans modifier l'économie avant validation.


**Portée :** revue statique des règles `src/lib/catalog.ts`, `src/data/progression.json`, `src/lib/progression.ts`, `src/lib/game-engine.ts`, `src/data/pull-rates.json`, `docs/taux-de-drop.md`. Pas de simulation exécutée, pas de test de production Supabase, aucune modification des règles.

**Boucle constatée :** Live Drop de cinq cartes, réserve max 4, recharge 30 min ; Paquet Scène quotidien de cinq cartes orienté famille, sans Légendaire ; 3 missions quotidiennes (1 sablier chacune) ; série de sept jours, avec Perfect garanti ou 3 sabliers au jour 7 ; collection, recyclage, artisanat et achat ciblé par jetons. Les cartes, points et jetons en ligne sont sous autorité serveur, à confirmer sur la base effectivement déployée.

**Ordres de grandeur vérifiables :** 5 jetons par Live Drop, 7 pendant le Prime Time (20 h–23 h selon l'heure locale de l'appareil), coût ciblé 400 jetons, soit 80 ouvertures hors Prime Time ou 58 si toutes les ouvertures rapportent 7 jetons (arrondi supérieur). 12 points et 18 XP par Live Drop ; 10 points et 14 XP par Scène ; 100 XP par niveau, 3 sabliers par niveau ; 1 sablier enlève 15 minutes de recharge. La réserve de 4 se remplit en 2 h à partir de zéro. Les gains de série, jalons, recyclage et saisons s'ajoutent : les chiffres ci-dessus ne sont **pas** une simulation complète.

**Hypothèses produit à tester, pas des bugs établis :** (1) écart de progression entre 1–2 visites quotidiennes et 4–8 visites ; (2) valeur réelle des points face aux doublons et coûts de craft ; (3) disponibilité de la mission de recyclage au début d'une partie ; (4) impact du Prime Time local sur l'équité entre profils et fuseaux ; (5) lisibilité des récompenses et de la prochaine action dans Drop/Binder/Craft/Toi.

**Dette documentaire constatée :** dans `src/lib/game-engine.ts`, le commentaire au-dessus de `openPack` mentionne encore un seuil de pity « 80 » et « 79 », alors que la condition exécutée utilise `PITY.threshold` et que `src/data/pull-rates.json` définit **12**. Vérifier puis corriger ce commentaire dans une passe dédiée ; ce n'est pas, en soi, une preuve de bug de tirage.

**Prochaine étape recommandée :** établir une simulation reproductible des profils occasionnel (2 ouvertures/jour), régulier (6/jour), intensif (12/jour) sur 7 et 30 jours, avec prise en compte du plafond de réserve, des missions, des séries, des jalons, des doublons, du craft et des gains de jetons. Confronter ensuite aux tests miroir TS/SQL et à l'expérience sur téléphone avant toute modification d'équilibrage. Garder le polish des boosters en attente de retour utilisateur.

## Référence de coordination — audit du 10 octobre 2026

Cette section décrit le **présent** ; les sections antérieures conservées plus
bas sont l'historique, avec leurs retraits et validations datées. Le code et les
tests priment sur une ancienne case cochée. Voir [passation](agent-handoff.md),
[décisions](decisions.md), [problèmes](known-issues.md) et [périmètre](perimetre.md).

**Vision :** jeu de collection Twitch mobile, quatre piliers Drop/Binder/Craft/Toi,
des ouvertures lisibles et tactiles, économie multijoueur tenue par Supabase.
La simulation « Ta chaîne » reste retirée de l'interface ; son moteur conservé
n'est pas une fonctionnalité à remettre par défaut. Aucune refonte dans cet audit.

**Révision auditée :** `4955d9bbd489777c6ffd74229613075a332cc9e9`, branche
`design/booster-reveal-polish`. [PR #8](https://github.com/GoodFight37/CreatorDeck/pull/8)
en brouillon, base réelle `arena/01a10c75-creatordeck` (`6c46e4bec37dc91a32f368b586e59ce109a44784`).
`main` (`ae5016f093c977e68943d92f5a7c3da17bca8021`) est beaucoup plus ancien.
Ces observations doivent être revérifiées à chaque reprise, pas utilisées comme
instructions de reset ou d'envoi vers main.

### Fonctionnalités présentes dans le code

| Ensemble | État constaté | Validation restante / référence |
|---|---|---|
| Catalogue 1000, tirage/Perfect/Gold/pity, jetons, missions et saisons | Implémenté en TS et SQL | Taux et tests miroir ; contrôler le build et la base cible |
| Collection, filtres/pagination, craft/recyclage, thèmes | Implémenté | Tests unitaires/écrans et usage mobile |
| Comptes, sauvegarde, échanges, amis, hôtel, Last Pack, arène | Implémenté côté client et migrations | Une implémentation ne prouve pas le déploiement Supabase actuel |
| Direct Twitch, notifications, fonctions Edge | Code présent | Configuration distante/FCM et appareil à vérifier |
| Tribunal des Bannis | Implémenté, migration `0042` présente | Présence de `0042` en production non vérifiée par cet audit |
| Simulation « Ta chaîne » | Retirée de l'interface, moteur/tests conservés | Retour hors roadmap sans décision produit |
| CI qualité, SQL et navigateur | Workflow `verification.yml` présent | État des runs GitHub à consulter séparément |
| Ouverture imprimée Live/Scène et révélation continue | Implémentée sur branche, **validation en cours** | PR #8 ; critères ci-dessous |

### Ancien tableau de priorités — remplacé le 11 octobre 2026

Le tableau ci-dessous est conservé comme trace de l’audit initial. Ses statuts,
compteurs et dépendances sont périmés ; le seul plan actif est le résumé en tête
de ce document.

| ID / priorité | Travail / statut | Dépendances | Critères d'acceptation |
|---|---|---|---|
| COORD-01 / P0 | Consolidation et coordination — terminées sur `main` (`2c9b6c4`) | Historique GitHub et documentation de passation | Une seule branche distante (`main`) ; PR #7 intégrée, PR #8 fermée ; anciens résultats et limites consignés ci-dessus |
| UX-01 / P1 | Première boucle de collection — implémentée, retour sur téléphone attendu | Binder, RevealOverlay, réserve de boosters | Vue « Obtenues » par défaut ; état vide sans compteur/page écrasants ; 12 cartes par page ; résumé des cinq cartes et découvertes ; réouverture directe si réserve disponible. Écrans 72/72, typecheck/lint/build OK ; avis tactile réel ouvert |
| VIS-01 / P1 | Validation humaine de la scène booster → cinq dos → révélations — encore ouverte | Téléphone réel ; `pack-tear`, `reveal-overlay`, CSS de continuité | Reste l'avis humain sur téléphone (soudure à une main, rendu, rythme, reflets et réduction d'animations). Le retour UX récent n’est pas une validation visuelle sur appareil |
| QA-01 / P1 | Contrôles locaux UX — code validé ; suite projet/CI partiellement établie | Environnement de test local et GitHub Actions | Écrans 72/72, typecheck/lint/build OK. `npm test` : 1102/1106, quatre échecs catalogue/saisons/SQL ; `catalog:ci` signale le seed 0003 dérivé. Vercel preview READY, production non vérifiée ; Actions non établies |
| UX-02 / P1 | Craft, profil et objectif court — implémentés sur `main` (`09487de`) | Retour produit du 10 octobre ; règles d’économie existantes | Avant 10 copies recyclables, Atelier montre une progression courte et le retour Drop ; Toi met en avant vitrine locale et série, sans zéros initiaux ; Drop met en avant une mission déjà définie. Pas de changement d’économie ou de règles serveur |
| VERSION-01 / P2 | Identifiant du build dans Toi — implémenté sur `152c217`, publication à vérifier | SHA fourni par Vercel/GitHub ou checkout Git local ; profil | « Version abc1234 » se calcule automatiquement depuis le commit réellement compilé ; fallback « locale » sans SHA. UI 5/5, helper 2/2, typecheck/lint/build et recherche SHA dans bundle réussis ; vérifier Vercel après push |
| UX-03 / P2 | Activité sociale mieux exposée — livrée sur `980bdf8`, CI verte | Vitrine du profil et ouvertures récentes dans le Carnet | CTA conditionnel vers le Carnet sous le Paquet Scène. DOM ciblé 7/7 ; CI `38164889818` verte. Les idées avatar/badge/fallback ne sont pas planifiées. |
| CLOUD-01 / différée | Vérifier les parcours et le schéma du projet Supabase distant — **hors périmètre sans autorisation explicite** | Accès autorisé au projet réel | Ne reprendre que si l'utilisateur demande explicitement cette vérification ; lire `schema_versions()` et tester les parcours sans appliquer de migration ni modifier les données |

Visite locale du 10 octobre, code `66b78d5` : Live bureau/téléphone, Scène et Perfect simulé examinés, réduction des animations observée. Validation humaine sur appareil réel encore requise. K-011 corrigé dans `d87b72c` : retour au titre Scène quand le bouton consommé est désactivé ; scénario Scène et scénario Live existant 4/4 réussis bureau/téléphone. K-010 Live reste corrigé. Aucun nouveau build ou run CI/E2E complet.

Retour humain reçu le 10 octobre : sachet trop grand, soudure difficile à
atteindre à une main et appui accueil inactif. K-012 / D-012 implémentés dans
`0beb6b3` : sachet compact, soudure centrale, appui accueil et tracé dans les deux
sens. E2E ciblés 20/20, tactile simulé 4/4, typecheck/lint code 0 ; captures
examinées. Nouvelle validation sur téléphone réel et CI du SHA publié attendues.
VIS-01 reste en cours ; les autres appréciations visuelles ne sont pas closes.

Les préférences encore ouvertes du dossier d'atelier (dos/halo, éclat, Perfect,
limites de sélection) sont des demandes de validation, pas des décisions prises
par cet audit. Ne pas modifier les probabilités ou ajouter un chantier sans demande.

### Historique conservé de la roadmap antérieure

Les statuts « En place & Validé » ci-dessous reflètent les livraisons de leur
date. En particulier, l'ancienne ligne « Suite de tests Playwright & Vitest »
ne signifie plus que ces suites seraient absentes : elles existent maintenant.

## 📱 Volet 1 : Application Principale (TCG & Cloud)

### En place & Validé
- [x] Moteur de tirage & Taux de drop publiés (pity à 12, Perfect, Gold à 1 %, Live)
- [x] Cloud Supabase sécurisé (comptes, inventaire, échanges atomiques, hôtel des ventes)
- [x] Statut Twitch en direct & notifications push FCM (APK)
- [x] Arène hebdomadaire, wishlist publique & Last Pack protégé
- [x] Export Vercel & contrôle automatique du cloud au build (`cloud-guard.mjs`)

### Chantiers en cours / Améliorations
- [x] **Drop, Atelier et séquence visuelle — ergonomie Android** (11 octobre 2026) : CTA rouge et sachet visibles au premier écran mobile compact ; doublon Tribunal retiré quand sa mission du jour ouvre déjà la même séance ; récompense de série annoncée une fois au récap ; verdict Tribunal auto-avancé après 600 ms ; chrome Binder compact ; recettes de craft consultables dès le début et achats bloqués au coût réel ; Studio de tirages absent de la build production ; lien « Taux officiels » ; reflets au pointeur sans capteur d'orientation. Le tirage, les prix, les plafonds et les durées restent inchangés. Captures visuelles Playwright du sachet scellé/déchiré ajoutées. Contrôles détaillés dans la passation courante.
- [x] **« Du jus » : les moments rares se voient** (8 octobre 2026) : un **éclat** sur une Épique, un grand **éclat** (une fois et demie plus large) et un écran blanc sur une Légendaire comme sur un Perfect (planches pixel-art découpées en CSS, partant **avec** le son, coupées par le réglage des reflets), l'**achat d'un palier** qui fait vraiment entrer l'objet dans la pièce — il tombe, et la fumée marque l'endroit — et l'**emblème d'Arène** posé sur l'étagère du Studio (le pont TCG → Studio : ce qui se gagne dans l'Arène se voit chez soi)
- [x] **Les crédits, et un carnet qui vise juste** (8 octobre 2026) : un écran **Crédits** discret sous « Toi » (Kenney pour le décor, unTied Games pour les effets — la ligne que sa licence demande —, Chequered Ink pour les bruits, Twitch, Lucide, les polices), et les notifications d'**échange** qui ouvrent la feuille de compte **sur la section des échanges**, panneau déjà ouvert et déjà à l'écran
- [x] **Les 1 000 cartes tiennent dans le DOM** (8 octobre 2026) : plutôt que de chronométrer (une durée en jsdom ne dit rien du téléphone), un banc **compte** — avec tout le catalogue possédé, la recherche qui matche des centaines de noms et le filtre par rareté, le classeur pose **9 cartes** (une page de 3 × 3) et l'Atelier **20 lignes**, portraits compris ; le seul endroit qui rendait la liste entière était l'onglet **Recycler**, qui posait ses ~330 doublons d'un coup — il se feuillette désormais comme le reste (et se **cherche** : nom, identifiant, région, rang ou variante), « Tout recycler » emportant toujours tout
- [x] **Les longues listes se feuillettent** (8 octobre 2026, le soir) : le **classement mondial** demande cent joueurs au lieu de vingt (le serveur en accepte cent) et en pose **vingt par page**, avec le pager du classeur, le retour à la première page quand on change de tri, et **aucun pager** quand il n'y a qu'une page ; aux **échanges**, « Tu donnes » s'arrêtait à 24 cartes **sans le dire** — elle se feuillette par 24 et annonce la tranche (« Cartes 1–24 sur 60 ») : les cartes suivantes existaient, le joueur ne pouvait ni les voir ni les choisir
- [x] **Le Tribunal des Bannis** (8 octobre 2026, au soir) : un mode **100 % interface** — cinq appels par journée de jeu, tirage déterministe par `(journée à 6 h UTC, joueur)`, verdict au pouce (grâce / maintien), **Karma de modération** et jusqu'à **40 points de craft** par séance (×2 si le créateur qui préside est en direct). La carte qui préside se choisit dans le classeur ; l'argent est versé par le **serveur** (`0042_tribunal.sql`, à coller : `npx supabase db push`), qui recalcule le karma — l'appareil n'en fabrique aucun. Cf. `docs/historique-livraisons.md` § 11.58
- [x] Suites Vitest/Playwright exécutées sur le commit courant via GitHub Actions #260 ; les jobs unitaires, écrans et E2E ont réussi.
- [x] **Polissage visuel & haptique** (8 octobre 2026, le soir) : le reflet Holo/Gold **suivait déjà le doigt** (écrit en direct sur le foil, sans re-rendu) et le tirage du booster **vibrait déjà** au franchissement du seuil — les deux sont maintenant **prouvés par un banc** (`navigator.vibrate` compté : une seule vibration, et zéro quand le son est coupé). Cf. `docs/historique-livraisons.md` § 11.56
- [x] **Finition UX « consumer-grade » (8 octobre 2026)** : plus un mot d'infrastructure à l'écran (`scripts/check-jargon.mjs`, gardé par `src/lib/jargon.test.ts` sur les composants, les pages et **tous** les modules qui portent des phrases), un **carnet de notifications dont chaque ligne mène au bon écran** (`KIND_TARGETS`), et un écran **Mon compte** sans boutons de sauvegarde : pastille verte « Progression synchronisée », adresse masquée, et le choix entre deux parties **seulement** quand il y en a deux

---

## 🎮 Volet 2 : Mini-Jeu "Ta Chaîne" (Streamer Simulator)

### En place & Validé
- [x] Mécanique pure (formats de vidéo, 5 paliers de notoriété, JSON)
- [x] Tables SQL Supabase & gestion des abonnés (`0036`)
- [x] Écran d'accueil & feuille de chaîne basique
- [x] Imprévus du jour (cartes à swipe) & « Ton setup » en 5 paliers de points (`0038`)
- [x] Mini-jeu interactif de 20 s (Live, chat qui défile, bulles d'alerte)
- [x] Invités sur le bureau (2 cartes du classeur, bonus Raid si le créateur est EN LIVE)
- [x] Bureau **visuel** : la scène du studio (objets qui s'allument avec le setup, vraies cartes sur socle, aura rouge du direct, bandeau « RAID ! ») et le **plateau** qui booste la vidéo du jour (`0041`, étape 8 de `docs/ta-chaine.md`) — **la scène est retirée depuis le 8 octobre 2026** ; le plateau, lui, booste toujours la vidéo du jour, et les invités vivent dans le bureau en cartes
- [x] **Refonte « jeu mobile » de l'écran « Ta chaîne »** : HUD (rang, jauge d'abonnés, rythme, jetons), socles, boutons bombés, notices remplacées par des badges — **le HUD est resté, en texte** depuis le retrait du 8 octobre 2026 (l'écran n'étant plus un onglet, il ouvre par la ligne « Ta chaîne » de l'accueil et gagne un bouton Retour)
- [x] **Le Studio s'habille et s'entend** (8 octobre 2026) : deux fenêtres posées sur les murs du kit (lumière froide), un second écran au palier *régie* — **les deux fenêtres sont parties avec la pièce** — et **15 bruitages embarqués** (cartes, pages, clics, feuilles, achats de setup, publication, raid) branchés sur les gestes — le bouton *Son* du profil les coupe tous (`docs/assets-sonores.md`)
- [x] **Le Studio devient un onglet plein écran, et la pièce passe aux vraies images** (étape 10 de `docs/ta-chaine.md`) : cinq onglets dans la barre du bas, plus de modale, et une **pièce isométrique du kit Kenney** (CC0) où chaque palier fait entrer son objet (`src/data/studio-room.json`, `src/lib/studio-room.ts`) — **retiré le 8 octobre 2026 au soir** : la barre revient à **quatre piliers**, la pièce, l'emblème d'Arène sur l'étagère et le kit Kenney (2,7 Mo) partent, le moteur ne bouge pas (`docs/ta-chaine.md` § 1)
- [x] Arbitrage du live de 20 s (scène d'immersion gratuite, tirage vidéo 100 % serveur)

### Anciennes suggestions — non planifiées

Les propositions suivantes proviennent d’un audit ancien et ne font pas partie
du plan actif. Ne pas les reprendre sans nouvelle demande de Malik.
- [x] **Paliers de setup avancés (Tycoon étendu) :** Financement des paliers 6+ via le sacrifice de doublons de cartes (Rares/Épiques) — livré le 8 octobre 2026 (`0040`, étape 7 de `docs/ta-chaine.md` : Rare = 1, Épique = 2, Légendaire jamais, une carte ne part qu'une fois)
- [x] **Retirer la simulation de streameur de l'application** (8 octobre 2026, le soir) : le décor isométrique ne rentre pas dans la direction que prend le jeu, et le joueur a demandé qu'on l'enlève **complètement** — plus d'onglet, plus de ligne d'accueil, plus d'écran. Le **moteur reste** (`src/lib/streamer.ts`, ses données, ses migrations, ses tests) : rien n'est perdu, rien n'est à recoller, et son dossier est `docs/ta-chaine.md`
- [ ] **Et ensuite ?** Rien n'est prévu pour la simulation : la remettre dans le jeu demanderait une direction visuelle ou un mode assumé — c'est une décision de produit, pas une dette
- [x] **Se déplacer ne sonne pas — jusqu'au bout** (8 octobre 2026) : onglets, portes, feuilles et réglages muets, puis les **deux derniers** sons de déplacement — le **filtre du Binder** et ses **pages** — retirés à la demande du joueur, le soir même. Il ne reste que ce qu'on **fait** : ouvrir un booster, révéler une carte, encaisser une récompense, refuser. Vérifié par un compteur dans le banc d'écrans (onglets, feuilles, filtre et pages : zéro son ; `docs/assets-sonores.md`)
- [x] **Les sons mesurés, et un volume réglable** (8 octobre 2026) : chaque bruitage est mesuré (RMS, crête) et ramené à sa cible de volume perçu — ce qu'on entend le plus souvent est le plus discret — et un réglage **Volume** (Discret / Normal / Fort) baisse toute l'application d'un cran, sous l'interrupteur *Son* (`docs/assets-sonores.md`)
- [x] **L'ouverture d'un paquet devient un moment** (8 octobre 2026, au soir) : entrée de carte avec rebond et halo par rareté, refus qui rougit, cascade sur le Perfect, et une **déchirure** de 700 ms entre le geste et la première carte (`src/components/pack-tear.tsx`). Rien ne boucle, tout est coupé par le réglage « Reflets des cartes » et par « moins d'animations » — un test le vérifie
- [ ] **Bilan & équilibrage des gains :** Ajustement des courbes de croissance (abonnés, vidéos, imprévus) après tests de jeu réels — **l'outil de mesure est là** (`npm run streamer:bilan`, 8 octobre 2026) : paliers et délais, gain moyen par format et par palier, choix d'imprévus, prix du setup, trente journées simulées (313 690 abonnés sans un point dépensé, 3 363 428 avec tout le setup). Il lit `src/data/streamer.json` par les fonctions du jeu et **n'équilibre rien** : la décision se prend en jouant
