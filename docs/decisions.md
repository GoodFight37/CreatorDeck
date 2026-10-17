## D-137 — 17 octobre 2026 : écrire le nom du booster MEMES sans accent

Sur le Drop, le sélecteur de booster affichait `MEMES`, tandis que le bouton et
la réserve utilisaient `Mèmes`. Malik demande que le nom visible reste
`MEMES`, sans accent, même si la graphie française courante de « mème » en
comporte un. Les libellés du bouton et de la réserve suivent désormais le nom
du sélecteur. Aucun nom de carte ni contenu du catalogue n’est modifié.

## D-138 — 17 octobre 2026 : demander les chaînes suivies avant le premier booster

Pour la première session, demander au joueur de choisir 5 à 15 chaînes qu’il
regarde. Le premier booster cadeau est composé de cinq chaînes distinctes de ce
cercle ; sa dernière carte est Rare ou mieux selon la rareté locale calculée par
position dans la sélection. Cette rareté locale ne modifie jamais la rareté
catalogue enregistrée, les taux ordinaires, la réserve ni les monnaies. Un
joueur invité voit un aperçu sans écriture ; un compte connecté passe par la
fonction serveur `open_circle_gift_pack` et la migration additive `0054`.

Le Drop se simplifie pour un cercle déjà choisi : booster, action principale,
cinq cartes récentes et un panneau secondaire. Les autres activités restent
accessibles par leurs écrans existants. Les comptes déjà accueillis conservent
leur accueil actuel ; l’entrée pour définir ou modifier le cercle est reportée
à l’étape 3. Le plan et les limites sont consignés dans
[`plan-premiere-session.md`](plan-premiere-session.md). Les tests locaux ciblés
passent, mais la vérification SQL jetable Windows est bloquée par le compte
Administrateur et l’état de `0054` sur Production n’est pas établi ; aucune
application sur une base réelle n’est incluse dans cette décision.

## D-136 — 17 octobre 2026 : garder l’ouverture de secours hors du rituel visuel

Dans la scène scellée, « Ouvrir sans déchirer » restait un bouton de 44 px juste
sous le sachet. Le conserver comme solution de secours, mais le placer tout en
bas avec une opacité faible, hors du centre et du geste TIRE / RELÂCHE. Le
contraste revient au survol ou au focus clavier ; sa cible tactile reste de
44 px. Aucun texte d’instruction, peel, garde anti-saut, `PACK_TEAR_MS`, Drop,
réserve, taux, Binder, Craft ou audio ne change. Le scénario Playwright est
ajusté pour vérifier position, opacité, cible et ouverture effective ; il n’a
pas démarré localement à cause du verrou du serveur Next (PID 15724). Build
Webpack réussi ; les limites de vérification sont consignées dans le checkpoint.

## D-131 — 16 octobre 2026 : retirer la fiche Mèmes sans illustration

La fiche source `juventus-rose` (« Carte supprimée ») ne contenait qu’une image WebP de remplacement de 818 octets. Elle était consultable dans le classeur mais déjà non tirable. À la demande de Malik, retirer cette fiche du catalogue distribué et du catalogue serveur : le classeur et son compteur passent de 2 151 à 2 150, toutes tirables avec image.

Le synchroniseur filtre explicitement cet identifiant et vérifie que la source le décrit toujours comme « Carte supprimée » ; il s’arrête si elle change. La migration additive `0053` supprime la ligne uniquement si aucune collection ni aucun tirage historique ne la référence. Elle échoue avant suppression si une référence existe. Les migrations précédentes restent inchangées. Aucun visuel de remplacement n’est inventé et aucune autre fiche, règle de tirage ou donnée de collection n’est modifiée.

Preuves locales sur le diff initial : test catalogue `npm test -- src/lib/memes.test.ts` 1/1, écrans Mèmes 8/8, `npm run typecheck`, syntaxe du script d’import, `git diff --check` et build Webpack réussis. Le build standard Turbopack est resté silencieux plus de 90 s et a été interrompu ; la variante Webpack exporte `/memes` en statique. `npm run supabase:verify` n’a pas pu démarrer Postgres : le compte Windows administrateur est refusé par PostgreSQL. Les premières erreurs CI sur compteurs E2E et application du vérificateur SQL ont été corrigées dans `83d212c8` ; CI `38960335566` verte 6/6, puis workflow Supabase `38960850198` réussi : `0053` appliquée et historique/objets attendus vérifiés après application. Les deux spécifications E2E ciblées ont réussi dans cette CI. Le test E2E local n’a pas démarré à cause d’un verrou Next déjà présent. Aucune commande manuelle directe sur la base de production n’a été exécutée.

## D-130 — 16 octobre 2026 : concentrer Drop sur le booster choisi

Le premier carrousel affichait sous les boutons Live Drop/MEMES une instruction qui répétait déjà le geste et l’action disponibles. Pour alléger l’arrivée sur Drop, le sachet sélectionné devient le point focal : son format augmente légèrement, les boutons restent compacts avec une cible tactile de 44 px, et l’aide redondante est retirée. Le voisin reste visible et le choix reste possible au swipe, au clavier et avec les boutons (comportement ensuite remplacé par D-132).

Le swipe seul est écarté : les boutons rendent le changement d’univers visible et accessible. Les tranches 3D, la déchirure, la révélation, l’audio, les taux, les réserves et les règles restent inchangés. Le contrôle Playwright ciblé passe sur 320, 390 et 1024 px ; il vérifie que le sachet actif domine le voisin, que l’aide a disparu et que l’action reste au-dessus de la navigation. L’impression et le toucher sur téléphone réel restent à apprécier par Malik.

## D-132 — 16 octobre 2026 : une seule sélection et un rituel prioritaire

Le premier écran du Drop proposait simultanément pills, swipe, flèches et clic sur le sachet voisin. Cette redondance disperse l’attention alors que l’action attendue est d’ouvrir le booster affiché. Garder les pills Live Drop/MEMES comme unique moyen de sélection ; le sachet voisin devient une illustration secondaire non interactive, nettement atténuée et réduite. Le sachet actif reste le seul grand bouton qui prépare son propre booster. « Plus d’infos » perd du contraste et de la hauteur. Le hint de sélection reste absent.

Dans la scène scellée, « TIRE » / « RELÂCHE » reste la consigne principale. « Ouvrir sans déchirer » reste accessible comme lien bas discret, avec sa cible tactile de 44 px, et passe par les mêmes gardes d’ouverture. Le garde du bouton actif contre les clics synthétisés après un glissement reste en place, même si le swipe ne sélectionne plus l’univers. Ne pas toucher `PACK_TEAR_MS` (1 200 ms), les protections anti-saut de révélation, l’inclinaison du booster ou ses tranches. Aucun changement de son, taux, Binder, Craft, social, échanges, tirage ou données.

Le scénario Playwright ciblé vérifie la sélection par pills sans RPC de tirage, l’absence d’interaction du voisin, sa moindre présence sur 320/390/1024 px et la position secondaire du lien dans les viewports courts ; les tests du rituel contrôlent la révélation. La vérification sur téléphone physique reste à faire par Malik.

## D-133 — 16 octobre 2026 : garder les noms entiers pendant la révélation Mèmes

Capture mobile de Malik : des titres de cartes étaient visiblement coupés par des points de suspension pendant l’ouverture d’un booster Mèmes. La donnée source contient les noms complets ; la règle globale du cartouche de carte force une seule ligne. Pour la seule carte Mèmes montrée en grand pendant la révélation, permettre un retour à la ligne et réduire légèrement le corps du titre. Garder les règles de la collection et des autres cartes inchangées. Le correctif doit conserver la taille de carte, le compteur, le geste, le bouton suivant et le rituel d’ouverture. Test navigateur ciblé en attente car l’instance `next dev` existante bloque le lanceur Playwright local ; la capture de Malik reste la preuve du défaut initial, pas du correctif.

## D-129 — 16 octobre 2026 : choisir et préparer son booster depuis Drop

Malik demande un choix de boosters directement à l’arrivée sur Drop : Live Drop au centre, Mèmes partiellement visible derrière sur le côté, passage au doigt et présentation avec Retour avant l’ouverture. Sa démonstration distingue choix, préparation réversible et ouverture effective. Le premier lot envisagé de Binder unifié est remplacé par ce chantier de navigation ; le prototype fictif reste isolé.

Le carrousel propose Live Drop et Mèmes, avec boutons d’univers et flèches du clavier. Le scroll vertical reste celui de la page ; un glissement ne prépare ni n’ouvre un paquet. L’univers actif fournit son propre habillage, sa réserve, sa recharge et ses aides. Le Paquet Scène conserve son accès et son fonctionnement dédiés. Le classeur Mèmes est accessible depuis son panneau.

Le premier appui présente le sachet scellé avec Retour, Échap et prise en charge du retour natif via la pile existante. Il n’appelle aucun tirage. La déchirure validée au relâchement ou l’alternative « Ouvrir sans déchirer » engage le tirage une fois. Après engagement, le retour pendant une requête ne l’annule pas et ne relance rien. Live Drop conserve son hook et ses effets ; Mèmes utilise le même contrôleur sur Drop et /memes, avec sa clé idempotente conservée après perte de réponse. Les réponses d’un ancien compte sont écartées. Pendant la présentation d’un booster Mèmes, sur Drop comme sur /memes, la musique suit la scène « pack » puis revient à « hub » à la fermeture, comme pour Live Drop ; cela ne démarre pas une musique qui était arrêtée.

Les taux, réserves, économies et collections restent distincts ; aucune migration ni règle de jeu nouvelle. Aucun nouveau média ni nouvel univers. Les tests ciblés et preuves de rendu sont consignés dans la passation de ce lot. Revue Claude terminée ; la validation tactile physique reste à faire. Le lot est préparé pour un push normal sur `main` afin de permettre l’essai de Malik.

## D-128 — 16 octobre 2026 : faire lire le booster principal comme un sachet souple

Après D-117 et D-127, Malik ouvre un chantier distinct sur le rendu du booster principal, encore perçu comme trop plat. Les captures 390 × 844 et 320 × 568 de `main` montrent un objet lisible mais très rectiligne : la tranche rose et le bord de la face évoquent une boîte rigide, et le reflet peut sembler posé sur le dessin. La taille et l'action du Drop sont déjà satisfaisantes.

L'impression Live Drop existante est conservée : ses bords et soudures sont courbés, avec des ombres de film et des plis discrets dans le SVG original du jeu. Le masque foil épouse cette silhouette. Sur la scène d'accueil, la bordure rectangulaire de la face disparaît, les tranches reculent derrière le film, l'ombre de contact suit le format effectif et le reflet est moins blanc. Le mouvement idle, les préférences Reflets et mouvement réduit, le CTA et le peel restent inchangés. Les formats portrait, le tirage, les cartes et le son ne sont pas modifiés. Aucun nouveau média externe ni WebGL.

Captures comparables [avant/après sur 390 × 844 et 320 × 568](sachet-live-d128.md) inspectées ; elles montrent la silhouette et la lecture du CTA. Les tests de géométrie, le snapshot scellé/déchiré et le parcours d'ouverture vérifient l'intégrité technique, pas la sensation de foil sur téléphone physique. Garder cette appréciation ouverte.

## D-127 — 16 octobre 2026 : matière graduée des cartes Mèmes

Le paquet de référence MyMemeCards compte 59 observations d'animations (8 complètes, 51 partielles) et 35 familles de layouts annoncées. Son extrait contient 27 familles observées une seule fois, toutes `partial/resource_cap` : ce ne sont pas 27 modèles garantis. Les captures montrent une hiérarchie cadre/illustration/identité et une Full Art plus ouverte ; certaines captures ont des médias absents. Les boucles `mythic-glow` (2,8 s), `mk-sweep` (7 s) et `mk-jackpot-rim` (5 s, observations partielles) décrivent la source, sans prescrire leur reproduction. Voir [l'audit différentiel](audit-cartes-memes-reference.md).

CreatorDeck conserve le cartouche et le cadre Twitch de D-123. Pour les Mèmes uniquement, Commune reste mate, Rare reçoit une tranche froide, Épique une matière nacrée discrète, Légendaire une tranche chaude et Mythique un cadre plus dense. Full Art ouvre la fenêtre de l'illustration et allège le cartouche. Le reflet suit le doigt sur la grande fiche des cartes Épique et mieux ainsi que Full Art, avec écriture directe de variables CSS sans re-rendu React ; il est absent de la grille et coupé par Reflets désactivés ou `prefers-reduced-motion`. Aucun balayage lumineux perpétuel, jackpot copié, nouveau média, règle de tirage ou changement du booster physique. Les effets statiques restent peu coûteux, mais la lisibilité et la matière doivent être jugées sur téléphone réel.

## D-126 — 16 octobre 2026 : un seul rituel tactile pour les deux boosters

Les captures du joueur montrent que D-125 révélait les Mèmes dans une boîte fixe avec un bouton « RÉVÉLER », sans déchirure ni extraction des dos. Ce parcours paraît plus sec que le booster Twitch. La correction réutilise `PackTear` et ses seuils de peel, son délai d'extraction et son secours clavier, avec une impression Mèmes propre ; le sachet de l'accueil reprend cette même impression.

Après l'extraction, chaque carte Mèmes se retourne sans appui préalable. Le geste de glissement et le bouton avancent seulement quand le flip est fini ; Rare et mieux ont une pause de retournement et une lumière plus présente, tandis que Commune reste sobre. Le récap des cinq reste au moins 1,5 seconde. Les animations cessent selon `prefers-reduced-motion` et le réglage Reflets. Aucune règle de tirage, réserve, économie ni carte Twitch ne change. Le contrôle navigateur mobile avec RPC simulés vérifie le seuil du peel, les cinq cartes et le verrou du récap ; le ressenti physique reste à apprécier sur téléphone.

## D-125 — 16 octobre 2026 : univers Mèmes FR séparé

Malik demande toutes les cartes « Memes FR » dans un booster et une collection distincts de Twitch. Il affirme disposer d’un accord écrit, sans pouvoir partager ses clauses. L’étendue des droits et des crédits contractuels n’a donc pas été vérifiée par le dépôt ; les crédits présents dans la source sont affichés. La décision D-124, prise avant cette affirmation, est remplacée pour l’intégration.

Le catalogue source est figé à 2 151 fiches et 2 147 WebP distincts ; une fiche sans visuel exploitable n’est pas tirable. Le tirage et la collection vivent dans les tables et RPC propres à l’univers Mèmes. Chaque booster donne trois Communes, une carte variable (55 % Commune, 35 % Rare, 8 % Épique, 1,8 % Légendaire, 0,2 % Mythique) et une Rare ou mieux (82 % Rare, 15 % Épique, 2,5 % Légendaire, 0,5 % Mythique). Quatre boosters au maximum, recharge de 30 minutes, sans monnaie, XP ni passerelle avec les cartes Twitch. Un identifiant de requête permet de rejouer la réponse sans débiter deux fois. Ces taux sont propres à CreatorDeck et visibles dans la page Mèmes ; la sélection parmi les cartes d’une rareté est uniforme. Le statut « sortie » de la source ne retire pas une carte du tirage CreatorDeck, faute de saison Mèmes décidée. La migration ne touche ni `open_pack()` ni ses tables.

# Décisions CreatorDeck

## D-124 — 16 octobre 2026 : examiner MyMemeCards avant un univers mèmes séparé

Malik souhaite récupérer les cartes MyMemeCards pour diversifier CreatorDeck. Le site annonce 2 130 cartes pour « Memes FR » ; le ZIP remis recense 23 766 fiches sur plusieurs catalogues, sans illustration autorisée copiée. Les mentions légales attribuent le design et les textes à OGROUP SRL et les mèmes à leurs auteurs. La visibilité publique des pages et l'accès permis par `robots.txt` ne constituent pas une licence de republication. Ne pas confondre l'inventaire de métadonnées et un catalogue de jeu publiable.

Le futur booster et le futur classeur mèmes restent séparés de Twitch. Aucun tirage, taux, économie, carte ou média tiers n'est importé tant que le périmètre des contenus utilisables et les règles du nouvel univers ne sont pas établis. Les constats et le chemin d'intégration figurent dans [l'étude de source](catalogue-memes-source.md). Ce choix protège aussi le jeu existant d'une fusion implicite de catalogues et de possessions.

## D-123 — 16 octobre 2026 : adapter la référence aux cartes Twitch existantes

Le paquet de référence MyMemeCards fourni par Malik sert uniquement à observer des principes visuels : hiérarchie portrait/identité, cadre de rareté et cartouche de lecture. Il n'est pas une source de catalogue, de texte, de médias, de règles ou de code à importer. Les captures et les observations d'animation ne fournissent aucune confirmation de droits ; aucun de ces contenus n'entre dans le dépôt.

Sur les cartes Twitch existantes, le bord imprimé gagne en présence avec une épaisseur plus marquée pour Épique et Légendaire. Le nom repose sur un cartouche sombre délimité, qui indique aussi la rareté et la région sur les grandes cartes. Les vignettes restent compactes. Une pose de 320 ms à l'ouverture de la fiche n'anime que luminosité et opacité ; elle s'arrête avec Reflets désactivés ou la réduction du mouvement. Les reflets au geste et l'animation de révélation déjà différenciée sont conservés, sans balayage perpétuel : la décision D-099 sur la lisibilité reste applicable. Aucun portrait, donnée de créateur, variante, taux ou économie n'est modifié.

Malik envisage un futur booster et une collection de cartes mèmes séparés des cartes Twitch, avec éventuellement un langage graphique voisin. La direction est notée comme intention produit, sans catalogue, droits des médias, règles de tirage ni parcours décidés. Le démonstrateur multi-univers D-076 reste isolé ; l'intégration n'est pas engagée par ce lot.

## D-122 — 16 octobre 2026 : fermer les vérifications autonomes et distinguer les décisions produit

Le correctif CSS du sachet publié dans `118b21f0` réduit l’angle et l’épaisseur des tranches sans changer la taille, l’animation idle, le reflet ni le CTA. Sa note joueur, omise à cause du périmètre CSS strict de cette livraison, est ajoutée rétrospectivement. Le rendu mobile local et les quatre scénarios navigateur avaient passé ; le jugement de matière au toucher appartient au joueur.

Le tutoriel D-121 a ensuite été rejoué sur le domaine public Vercel avec un compte invité neuf et un navigateur mobile 390 × 844 : pas de superposition pendant « Mon compte », tutoriel après fermeture, retour au Drop après « Terminer », aucune exception JavaScript. Une session de test éphémère a été fermée ; le compte invité reste dans la base de production. Cette preuve ferme la validation navigateur réelle de D-121, sans conclure sur le ressenti physique.

La roadmap active distingue désormais les essais de perception et les travaux qui exigent des ressources ou règles absentes. Le prototype multi-univers reste isolé conformément à D-076 ; soundbites, événements Twitch et Last Pack revanchard restent des idées non spécifiées. Aucun nouveau catalogue, son, événement, tarif ou mécanisme de vol n’est déduit de la demande de finir les chantiers existants.


## D-121 — 15 octobre 2026 : présenter le tutoriel après la feuille de connexion

En vérifiant le parcours social sur Vercel, un compte invité neuf a reçu sa réponse d’onboarding alors que « Mon compte » était encore ouvert. Le tutoriel est devenu visible derrière cette feuille et a intercepté des appuis après sa fermeture ; deux dialogues modaux coexistaient. Le problème découle du recalcul de `showTutorial` au changement de compte et de l’arrivée asynchrone de l’état d’onboarding, sans tenir compte de la présentation déjà ouverte.

Le tutoriel attendu est différé tant qu’une feuille ou une scène de présentation est ouverte, puis apparaît dès sa fermeture. Une reprise volontaire du tutoriel garde son accès direct. La musique ne démarre pas pendant cette attente, et « Terminer » replace le joueur sur Drop, conformément à la dernière étape. Le tutoriel par compte, son enregistrement serveur, les cadeaux, le tirage et les ressources restent identiques. Test de rendu et contrôle navigateur dans la passation.


## D-119 — 15 octobre 2026 : fiabiliser les feuilles sociales et les échanges

Le rapport IA Studio Lot 05 a été confronté au code de `main` (`39d17e55`). L’alerte sur la première carte du Last Pack est un faux positif : `_last_pack_cards` produit des index 1 à 5 via `WITH ORDINALITY`, et `last_pack_steal` refuse 0. La condition `index > 0` est correcte. Les feuilles Amis et Hôtel des ventes ne rechargeaient pas après une création de compte dans la feuille ; Last Pack avait le même défaut. Wishlist était déjà chargée à l’ouverture de Toi, mais sa propre feuille ne garantissait pas une lecture fraîche. Une réponse tardive des variantes pouvait survivre au changement de partenaire ; la comparaison avec une variable capturée, proposée dans le rapport, n’aurait pas suffi. Enfin, le bouton d’offre pouvait être réactivé pendant la requête réseau.

Les feuilles suivent maintenant le compte courant ; la Wishlist se recharge à son ouverture. Les réponses de variantes portent une génération invalidée au changement de partenaire ou de compte. Un verrou local synchrone couvre toute la soumission de l’offre. Le serveur conserve la décision finale sur le vol et l’échange. Aucun taux, coût, limite, possession ou règle économique n’est modifié. Les faux positifs listés dans le rapport ne nécessitent pas de code.


## D-118 — 15 octobre 2026 : enlever le jargon du panneau Échanges

La CI des chantiers D-114 à D-117 restait rouge : un contrôle de rédaction
signalait « serveur » dans l’aide du Trade Radar, puis deux tests de l’écran
Compte reprenaient ce même texte. Une autre phrase visible du formulaire
d’échange disait aussi « cloud » et « serveur ». La restriction temporaire de
ces anciens chantiers ne s’applique plus : Malik a demandé explicitement de
corriger la cause de la CI rouge.

Les deux phrases sont réécrites pour expliquer les souhaits publics et la
vérification des cartes que le joueur donne. Les gardes de vocabulaire restent
actifs. Aucun appel réseau, règle d’échange, possession, coût ou donnée de
collection ne change. Vérifications et déploiement dans la passation.


## D-117 — 15 octobre 2026 : stabiliser la présence tactile du sachet Drop

Le partage Claude du 15 octobre a été confronté à `main` avant modification.
L’animation d’entrée était retirée sous `:active`, puis redémarrait au
relâchement ; l’idle commençait après 380 ms sans appliquer son premier état.
Le sachet était désactivé lorsque la réserve rechargeable valait zéro même
avec un booster de test disponible, alors que le CTA pouvait ouvrir ce booster.
Sur écran court, la position de l’ombre suivait des valeurs de padding
indépendantes, effectivement divergentes.

L’entrée anime désormais `translate` et `scale` sans interrompre la pression,
l’idle applique son état pendant le délai, le sachet et le CTA utilisent la
même condition d’ouverture, et le padding/ombre partagent une variable CSS.
Taille du sachet, CTA, règles d’ouverture, économie et taux conservés. Les
autres suggestions Claude (extrusion, performance, perspective) n’étaient pas
des défauts prouvés et ne sont pas reprises ; le focus visible existait déjà
dans la règle globale des boutons.


## D-116 — 15 octobre 2026 : fiabiliser les parcours du lot Drop et annexes

Revue du rapport IA Studio Lot 04 sur `d12f155c`. Les cinq constats sont
confirmés dans le code : habillage du paquet affecté après le déchirement,
attente non protégée du Tribunal et de l’Arène, feuille de code sans retour,
libellé de semaine expirée incohérent. Le refus normal de paiement du Tribunal
est également traité comme un refus réessayable ; auparavant il masquait le
bouton de réclamation. Une régression D-115 du feuilletage Binder est corrigée
en autorisant le geste depuis le bouton d’inspection, sans l’autoriser depuis
les autres commandes. Les assertions de focus E2E suivent ce bouton réel.
Aucun calcul de récompense, taux ou coût ne change.


## D-114 — 15 octobre 2026 : les cartes Sortants suivent les filtres de collection

Dans le bilan IA Studio reçu après D-113, le signalement d’un plantage Atelier
pour les Sortants est réfuté : `CREATOR_BY_SLUG` inclut le catalogue courant et
les Sortants depuis `a06847c65`, avant le SHA audité. Deux problèmes d’interface
sont confirmés et corrigés : les Sortants possédés étaient absents d’Obtenues,
et le chemin Toutes contournait leur recherche/tri ; le compteur Toutes de
l’Atelier suivait à tort la liste déjà filtrée par rareté. La complétion du jeu
continue de compter le catalogue actif comme avant. Aucune règle économique,
de tirage, de fabrication ou de recyclage ne change.

La première pièce jointe était tronquée, puis Malik a fourni le rapport Lot 03
complet. D-115 traite ses quatre autres points confirmés. Les Sortants actuels
sont vides ; les tests ajoutent des fiches synthétiques. Voir
[la revue IA Studio Binder/Atelier](revue-ia-studio-binder-2026-10-15.md).

## D-115 — 15 octobre 2026 : terminer les corrections du rapport Collection et Craft

À la réception du rapport Lot 03 complet, vérifier les constats restants sans
élargir aux règles économiques. Corriger la fiche d’inspection qui promettait
un tirage pour un Sortant non artisanable ; séparer sémantiquement le bouton
d’inspection de la carte et le lien Twitch direct ; rendre le focus à l’Atelier
après « Choisir une carte » ; retirer l’import inutilisé `Radio`. Aucun nouveau
comportement de tirage, coût ou recyclage. Tests dédiés vérifient ces états.
Le rapport initial était incomplet ; sa revue complète tient lieu de bilan et
consigne les verdicts D-114/D-115.

## D-113 — 15 octobre 2026 : vérifier le deuxième bilan IA Studio

**Contexte :** cinq alertes externes sur l’architecture de `7be3914b`. Le bilan
visait notamment le focus des dialogues, le retour pendant le tirage, les
marqueurs locaux par compte, le polling Last Pack et l’annonce de la navigation.
[Vérification détaillée](revue-ia-studio-architecture-2026-10-15.md).

**Décision :** conserver `usePresentationFocus` : les dialogues concernés sont
portalisés hors de `.app-shell`, qui sert de fond inerte. Corriger le retour
Android pendant l’attente en quittant la scène sans annuler le tirage ; relire
les marqueurs tutoriel par clé de compte ; attendre `loadLastPacks()` avant de
planifier le prochain poll ; donner à la description de « Toi » une cible
présente dans l’arbre accessible. Ajouter une note joueur pour le changement
de retour pendant l’ouverture.

**Conséquences :** aucun taux, économie, contenu d’échange ou progression
serveur ne change. Typecheck, lint ciblé, build et navigation bureau/téléphone
réussissent. La suite DOM complète garde deux assertions connues sur le mot
« serveur » dans Échanges. Code `43e15f6d`, test d’intégration et passation
`2ab3adeb`, push normal sur main et production Vercel `READY` / HTTP 200. Les
deux CI étaient encore en cours ou attente au dernier contrôle ; détail et
limites au checkpoint.

## D-112 — 15 octobre 2026 : vérifier le premier bilan IA Studio avant correction

**Contexte :** cinq constats externes sur `7be3914b`, dont deux incertitudes
explicites sur le moteur et le fallback CSS. [Revue contradictoire](revue-ia-studio-2026-10-15.md).

**Décision :** corriger le focus du classement démo, donner des rôles nommables
aux compteurs et borner leur barre de niveau pour un import incohérent.
Conserver le workflow Supabase : son contexte d’événement fournit bien une
chaîne. Le fallback CSS et le masquage des SVG existent déjà ; aucun correctif
spéculatif. Aucun calcul de niveau, XP, économie ou nouvelle fonctionnalité.

**Preuves et conséquences :** typecheck/lint, notes 8/8, clavier navigateur
2/2 et trois rendus issus de sauvegardes assainies passent. État du build et
de Vercel dans la passation. Aucun verdict de CLS ou lecteur d’écran physique.

## D-111 — 15 octobre 2026 : rendre les contrôles de livraison exploitables

**Contexte :** D-110 est déployé, mais les trois shards navigateur et le job
qualité sont rouges. Le contrôle unitaire de vocabulaire Trades empêche
ensuite tous les contrôles qualité de s’exécuter ; les erreurs navigateur
ne sont pas exposées dans les annotations GitHub.

**Décision :** terminer la fiabilisation des vérifications des parcours
existants avant d’entamer le backlog produit non cadré. Après installation
réussie des dépendances, chaque contrôle qualité indépendant s’exécute même
si un autre a échoué ; chaque échec conserve son code et le job reste rouge.
Ajouter en CI les reporters GitHub et JSON aux rapports Playwright existants.
Aucune exclusion de scénario ni assertion affaiblie pour obtenir du vert.
Corriger seulement les attentes prouvées obsolètes et les cibles instables.
Après redimensionnement mobile, réessayer la même assertion de hauteur du
journal pour laisser son viewport dynamique se mettre à jour ; aucune
tolérance de dépassement ajoutée.
Le texte Trades reste hors périmètre ; sa détection doit rester active.

La première CI du lot a exposé trois autres assertions DOM anciennes
(Objectifs et confirmation Live) : elles sont adaptées au parcours existant,
avec 25 tests ciblés réussis. Le détail reproductible est dans
[le rapport D-111](verification-d111.md).

**Conséquences :** aucune modification du jeu ni note joueur pour ce lot de
vérification. SQL, taux, audio et écrans existants conservent leur comportement.
Les tests automatiques n’établissent toujours pas le ressenti tactile.
Preuves et état de publication dans la passation.

## D-110 — 15 octobre 2026 : donner vie et volume au sachet Drop

**Contexte :** après D-109, Malik trouve encore le sachet plat. Le mouvement
était surtout vertical et les ombres se fondaient en un seul halo.

**Décision :** conserver le format et l’art Live Drop. Oscillation CSS de
4,8 s : translation ±4 px, rotation Y ±3° et X ±1,5°. Face avancée à 14 px,
pans foil contrastés (36 px biseautés à 68°, environ 13 px avant perspective),
reflet de 4 s, ombre de contact serrée et ombre diffuse distincte. Spot
bordeaux renforcé ; scène sans clipping ; pression à 0,97 en 100 ms.
Les préférences de mouvement réduit et effets OFF gardent leur arrêt des FX.
Les paramètres du reflet sont des variables CSS afin de préserver les règles
existantes d’arrêt pendant le reveal. Aucun nouvel asset ni règle de jeu.

**Validation :** navigateur mobile simulé, matrices de rotation/translation
observées pendant trois secondes, capture 390 × 844 inspectée ; tests et
publication dans la passation. Le téléphone physique n’est pas validé.

## D-109 — 15 octobre 2026 : l’accueil Drop devient une scène de jeu

**Contexte :** capture locale avant changement à 390 × 844 : booster déjà grand
mais sur un rectangle presque noir, ticket crème à trous occupant le premier
écran, CTA encadré comme un formulaire. Malik demande un seul foyer visuel,
une lumière chaude, un sol, un objet foil et une action au pouce.

**Décision :** conserver l’art Live Drop et le format du booster (58 vw sur
mobile normal, 52 vw seulement à 320 × 568). Remplacer le fond uniforme par
une scène bordeaux en dégradés radiaux, sol diffus, ombre de contact et
vignette. Incliner légèrement le booster, rendre ses pans foil plus lisibles
avec CSS, ajouter une entrée de 380 ms et une respiration de 4 px. Le geste
de défilement ne lance toujours aucun pack ; un appui valide peut produire
la vibration courte existante si le navigateur et le réglage Son l’autorisent.
Le mouvement s’arrête avec la réduction des animations ou les reflets coupés.

Retirer l’apparence de ticket crème autour du CTA. Garder une seule commande
pleine largeur, avec pression visible ; la réserve reste discrète et les
informations de garantie, sabliers et jetons passent sous « Plus d’infos »
replié pour tous les joueurs. Une barre de chrome plus fine ne s’applique
qu’au Drop. Le direct, lorsqu’il est présent, est plus discret sous l’action.
Aucun taux, économie, autre pilier, art ou audio modifié.

**Preuves et limites :** capture locale avant/après à 390 × 844 et après à
320 × 568 inspectées ; géométrie mesurée sans débordement, CTA entier au-dessus
de la navigation basse. Tests et état Vercel dans la passation. Le ressenti sur
téléphone physique reste une validation joueur.

## D-108 — 15 octobre 2026 : finir le rythme du booster sans refaire le Drop

**Contexte :** Malik demande un rituel moins proche d’une page web : consignes
courtes, cinq dos visibles, rares qui frappent, récapitulatif durable, objet foil
plus présent. Sur `main`, D-097 et D-096 avaient déjà livré « TIRE / RELÂCHE »,
extraction JS/CSS à 1 200 ms, hit-stop Rare+ et récapitulatif manuel. La garde
du récapitulatif ne durait que 650 ms.

**Décision :** conserver le geste guidé et les timings du flip existants. Le
récapitulatif reste ouvert jusqu’à une action explicite et ses commandes de
retour sont verrouillées 1 500 ms, y compris avec les effets coupés ; le flip
reste immédiat dans ce mode. Renforcer légèrement le contraste et l’épaisseur
des côtés CSS, le reflet en boucle et aligner la largeur de l’ombre sur le pack
mobile. La structure et la taille du pack hero ne changent pas.

**Limite :** les essais DOM et navigateur vérifient les états et les timings,
pas la sensation du peel au doigt. Aucun tirage, pity, audio BGM, autre pilier
ou nouvel asset ne change.

## D-107 — 15 octobre 2026 : Trade Radar sur les souhaits publics des amis

**Contexte :** les échanges et la wishlist publique existent. Trouver un ami
qui cherche une de ses cartes en double demandait d'ouvrir ses fiches une par
une ; le formulaire savait déjà préparer et envoyer une offre, mais pas
suggérer un partenaire. Le backlog citait Trade Radar sans en fixer les règles.

**Décision :** recherche déclenchée par le joueur dans Compte → Échanges. Lire
la liste d'amis acceptés, puis leur seul souhait public via le RPC existant
`wishlist_slug()` par groupes de quatre requêtes. Rapprocher ces souhaits des
cartes locales possédées en deux exemplaires ou plus de la **même variante**.
Afficher les résultats et les échecs partiels ; aucun scan continu, aucune
copie de collection tierce ni nouveau RPC. Une piste prépare le partenaire et
la carte offerte, sans envoyer d'offre. Le joueur choisit la carte demandée ;
le serveur garde ses contrôles actuels sur la proposition et l'acceptation.
Changer de partenaire avec une offre en cours demande confirmation. Un
changement de compte invalide les résultats locaux du radar.

**Conséquences :** aucun prix, récompense, probabilité ou règle d'échange
modifié ; aucune migration. Une piste n'est pas une garantie que l'ami possède
la carte souhaitée en retour, ni que l'état local est synchronisé. Le scan
sur demande coûte une lecture d'amis et une lecture de souhait par ami ; pas de
nouveau service ni de notification. Détails et preuves : [Trade Radar](trade-radar.md)
et checkpoint courant.


## D-106 — 15 octobre 2026 : identité du Perfect jusqu'au récapitulatif

**Contexte :** le Perfect montrait déjà cinq cartes en cascade et jouait son
stinger. Les noms étaient difficiles à lire sur mobile et le récapitulatif
redevenait celui d'un booster ordinaire. Le backlog demandait un Perfect plus
marquant, sans nouvelle règle définie.

**Décision :** garder le tirage, le verrou de 2,6 s, la cascade, les sons et les
gains. Ajouter sous chacune des cinq cartes un nom et une rareté lisibles, plus
« Nouvelle » selon `isNew`. Le récapitulatif annonce explicitement Perfect,
cinq cartes Épiques ou mieux et le nombre réel de nouveautés. Aucun nouvel
effet bouclé, bonus, taux ou geste ; l'overlay 16:9 réutilise la même identité.

**Vérification :** test DOM du Perfect et du récapitulatif, rendu du HTML
capturé avec les CSS de l'application dans Chromium à 320, 390 et 1024 px.
Le récapitulatif défile à 320 × 568 jusqu'aux dernières cartes, CTA visible.
Les portraits du banc sont absents de ces captures ; ressenti tactile du peel
hors de ce lot.


## D-105 — 15 octobre 2026 : Story verticale depuis la fiche publique

**Contexte :** l'affiche de profil 4:5 et son téléchargement existaient. Le
backlog proposait un export Story sans format ni surface définis. La fiche
publique fournit déjà les cartes de vitrine et les chiffres vérifiés par le
serveur ; elle est accessible depuis le classement ou un lien de profil.

**Décision :** proposer sur cette fiche deux exports PNG : l'affiche 4:5
existante et une Story 9:16 (1080 × 1920). Dessiner la Story sur l'appareil à
partir du même `posterModel`, sans nouveau calcul de progression, appel réseau
ou partage automatique. Prévoir vitrine vide, portrait indisponible, noms longs,
aperçu mobile et nom de fichier distinct. Garder le focus dans l'aperçu et le
restituer au bouton de format après fermeture. Conserver le téléchargement manuel ;
le navigateur ou l'application sociale choisit ensuite comment partager.

**Limites :** le canvas ne peut exporter un portrait externe sans droit CORS ;
les portraits locaux manquants ont un fond de rareté. Les chiffres reflètent la
fiche reçue, sans mise à jour après génération. Aucun nouveau format de carte,
gain ou permission n'est créé.


## D-104 — 15 octobre 2026 : accès permanent à la chaîne depuis la fiche carte

**Contexte :** la roadmap gardait le lien permanent Twitch dans le backlog. La
fiche proposait déjà un lien, mais seulement lorsqu'un direct était détecté.
Une carte possédée ou manquante reste consultable sans direct dans le Binder ;
la vitrine de Toi réutilise la même fiche.

**Décision :** afficher le lien de chaîne dans chaque fiche de carte, séparé
de l'indicateur de direct. Nommer l'action « Voir la chaîne sur Twitch » sans
promettre un live. L'ouvrir dans un nouvel onglet avec `noopener noreferrer`,
encoder le login dans l'URL et annoncer le nouvel onglet au lecteur d'écran.
Conserver le lien de la pastille Live sur la carte, l'état du direct et le
reste de la fiche. Aucun appel réseau, règle de jeu ou permission supplémentaire.

**Preuve et limite :** test DOM de la fiche avec et sans direct, y compris le
nom accessible et l'URL. La disponibilité d'une chaîne externe dépend de Twitch.


## D-103 — 15 octobre 2026 : un parcours Objectifs complet et un bilan de réclamation fiable

**Contexte :** lot Objectifs et saisons autorisé après Nouveautés. Dans la base
`51323720`, Tout réclamer ne comprenait pas les jalons ; un refus des familles
était absorbé par le parent, puis le groupe annonçait les familles prévues.
L'écran empilait le quotidien, les jalons et toutes les saisons détaillées.

**Décision :** conserver GameView, barèmes et caisse existants ; organiser
quotidien, collection et saisons avec accès directs, jauges natives et états
reçu/en cours/prêt distincts. Missions et remise à zéro restent pilotées par
la configuration. Planning mobile quatre puis trois cases pour lire les gains.
Saisons : prêts d'abord, filtres, huit lignes/page, détail des paliers replié,
prochaine étape et gains de chaque palier. Pas de nouveau mode de jeu.

Les callbacks parent rendent `PointsOutcome`, y compris le refus. Un seul
verrou synchrone protège les commandes de l'écran ; le groupe réclame missions,
jalons puis saisons en série, s'arrête au premier refus et garde le bilan des
réponses déjà reçues, avec message, focus et attente accessibles. Le choix de
série Perfect/sabliers reste séparé du groupe ; ses erreurs sont aussi affichées.
Les missions prêtes restent réclamées ensemble, comme dans le moteur existant.
Un delta nul conserve le message déjà payé. Les points rendus par le serveur
priment sur l'ancienne estimation ; emblème annoncé seulement si acquis dans
l'état après la demande. Les gains attendus du récapitulatif ne sont pas un
nouveau calcul de versement. Aucun audio, SQL, économie ou règle modifié.

**Preuves :** DOM 10/10, note joueur testée 8/8, trois scénarios navigateur
uniques passent ; soldes locaux exacts après double activation et rechargement.
Une fixture non finançable a été corrigée via une saison réelle, sans modifier
le seuil. Build/publication et limites serveur au checkpoint courant. Le
bilan de groupe ne détaille pas les RPC internes d'un palier de saison refusé.


## D-102 — 14 octobre 2026 : un journal joueur livré avec chaque mise à jour

**Contexte :** Malik demande des patch notes consultables, puis autorise un
projet complet sans nouvelle étape de confirmation. Les lots précédents sont
publiés mais leur historique se trouve surtout dans les documents techniques.

**Décision :** entrée Nouveautés dans Toi, accessible sans compte, historique
récent en premier, détail, filtre non lu et marquage explicite individuel/global.
Repère discret dans la navigation Toi, séparé de Last Pack. Aucun popup imposé.
Sept notes initiales résument journal, Toi, Atelier, Binder, rituel, Drop et audio.
Elles ne prétendent pas reconstituer tout Git ni déclarer le peel parfait.

**Publication :** source statique typée dans `release-notes.ts`, livrée avec le
code. Ajouter une note à chaque changement joueur (consigne permanente dans
AGENTS et procédure `nouveautes.md`), sans badge pour un commit de documentation
ou de test seul. Identifiants publiés stables ; pas de notes automatiques issues
des commits techniques, CMS, nouveau flux réseau ou migration.

**Lecture :** préférence locale indépendante de la sauvegarde, liste versionnée
d’identifiants lus, nouveaux identifiants non lus. Store unique abonnable pour
navigation/profil/feuille ; persistance, événements entre onglets et relecture
avant écriture. Stockage invalide toléré ; si bloqué, repli session explicitement
signalé. Ne pas promettre une synchro entre appareils ou une écriture atomique
entre onglets. Aucune carte, monnaie, préférence audio ou compte modifié.

**Accessibilité :** portail hors app inerte, focus captif, retour/Escape et
restauration du défilement/focus. Focus replacé dans la feuille lorsqu’un
marquage fait disparaître/désactive la commande. Mobile 320/390 et bureau
1024, sans animation requise. Preuves et déploiement au checkpoint courant.


## D-101 — 14 octobre 2026 : terminer le pilier Toi en un seul lot

**Contexte :** après les lots Drop/ouverture, Binder et Atelier, Malik autorise
le profil complet. Vitrine et série existaient ; les objectifs locaux étaient
rangés dans « Fonctionnalités en ligne », la progression était surtout repliée
et les petites cartes exposées ne permettaient aucune inspection.

**Décision :** conserver les trois emplacements et la priorité aux épinglées
possédées de D-044, dédupliquer les slugs, compléter avec les meilleures cartes
réelles. Montrer noms complets/rareté/variante sous les cartes, emplacements
vides décoratifs quand la collection est partielle et accès Drop si vide.
Réutiliser la présentation de carte du Binder pour consulter variantes et
quantités exactes ; aucune préférence de favori concurrente ajoutée.

Le parcours montre XP/niveau, collection et objectif du jour à partir de
`GameView`, avec accès direct aux objectifs et au Tribunal. La collection
Binder mémorisée, les accomplissements, les statistiques détaillées et la
série restent conservés. Compte/en ligne puis réglages/informations sont
repliés ; reset derrière « Gestion de la progression », confirmation existante
conservée. Aucun changement du mécanisme de reset, des sons ou de l’économie.

**États et accessibilité :** statut compte/sauvegarde/conflit dérivé du store,
erreur réelle visible, commandes wishlist bloquées pendant son retrait.
Inspection via portail existant, app inerte, focus captif et restauré, Escape
et retour. Barres de progression natives nommées, contrôles au clavier, noms
longs et layout mobile ; pas de nouvelle animation permanente.

**Preuves :** 18/18 tests DOM ciblés ; cinq scénarios navigateur uniques passent
après reprise sur le serveur actif et correction d'un titre attendu par le
test (« Progression »). Variantes et collection possédée testées avec fixtures
locales seulement. Vérifications statiques/build, publication et parcours
invité Vercel consignés au checkpoint courant. Aucun nouveau backend ni écran.


## D-100 — 14 octobre 2026 : terminer le parcours Atelier avant de changer de chantier

**Contexte :** lot Craft / Atelier autorisé par Malik après clôture du Binder.
Les petites lignes dépensaient immédiatement ; création et recyclage ne
laissaient qu'une notification, sans aperçu, attente commune ou résultat durable.

**Décision :** conserver les recettes, filtres, prix et `usePoints`, et ouvrir
une présentation dédiée avant toute dépense ou recyclage. Aperçu Standard,
monnaie/solde/coût réels, manque affiché et confirmation explicite. Résultat
visible avec la carte créée et accès au classeur, ou points réellement gagnés
et retour aux recettes. Recyclage individuel et groupé confirmés ; Live toujours
exclu du groupé, dernière copie protégée par le moteur existant.

**Fiabilité :** verrou synchrone anti-double clic jusqu'à la réponse, commandes
et fermeture neutralisées pendant l'attente, refus/exception visibles sans
succès anticipé. Le bilan groupé restitue le nombre, delta et éventuel arrêt
partiel retournés par le hook. Pas de second moteur, changement SQL, prix,
récompense, audio ou animation d'ouverture. La création respecte OFF/réduit.

**Accessibilité :** portail hors app rendue inerte, focus captif, Escape/retour
hors attente, retour au déclencheur ou titre si la recette a disparu.

**Preuves :** 14/14 tests DOM ciblés ; trois scénarios navigateur uniques passent
(recettes, recyclage → création → classeur, aperçu/focus). Un premier échec
navigateur venait d'un sélecteur trouvant notification et résultat ; corrigé en
ciblant le dialogue. Un test jetons utilisait 100 pour un coût réel de 400,
corrigé avec un solde suffisant, sans changer le prix. Captures/mesures à
320/390 px, vérification TypeScript/ESLint/build ; détails et publication au
checkpoint courant. Aucun achat ni recyclage réel en production pour les tests.


## D-099 — 14 octobre 2026 : terminer un lot Binder cohérent et vérifiable

- Malik demande de cesser les livraisons de deux ou trois retouches suivies
  d'une proposition de reprendre le même écran. Le périmètre d'un lot couvre
  interface, états, gestes, accessibilité, responsive, tests adaptés, docs et
  publication ; ensuite passer à un autre chantier, sauf défaut concret.
- Clore le Binder en intégrant aux pages livrées : finitions de pochettes et
  dos, reflets différenciés par rareté/variante, fiche de consultation physique
  et accès aux variantes réellement possédées. Pas de nouvelles récompenses,
  achats ou mécanisme d'obtention de sleeves ; ce sont des protecteurs visuels.
- Une lumière dirigée par le geste, jamais un balayage en boucle. Commune mate,
  rares plus réfléchissantes, variantes Holo/Gold/Live distinctes. Le masque
  du reflet protège le nom ; OFF/réduit coupe reflets/inclinaison. Une feuille
  de 12 cartes et un seul gestionnaire de lumière, sans WebGL ni capteurs.
- La fiche Binder utilise le focus existant dans un portail et rend le focus
  à sa carte ; les autres usages de CardInspectModal gardent leur présentation.
  Les variantes se consultent sans mutation du jeu. Quantités exactes par
  variante et total séparé : l'ancien texte attribuait abusivement le total
  à la meilleure variante. Calcul depuis les cartes déjà chargées.
- Alternative écartée : nouveaux sons, règles de jeu, faux doublons, variantes
  inventées, ou styles qui changent les cartes du Drop/reveal. Ressenti réel
  non certifié par les scénarios Chromium. Preuves/version dans la passation.

Validation D-099 : DOM ciblés 31/31 ; 11/12 E2E initiaux puis test de timing
corrigé/retenté 1/1, finitions finales 5/5 ; types, lint, diff-check et build
réussis. Publié à `7d127c0f`, Vercel Production `READY` / `success`. Site invité
parcouru à 320/390 px : pages, dos, fiche, focus, fermeture conformes ; variantes
possédées vérifiées localement. Aucun run Actions retourné. Lot clos, pas de
micro-chantier Binder restant à reproposer automatiquement.

## D-098 — 14 octobre 2026 : feuilleter le Binder sans gêner la consultation

- Autorisation de Malik pour le chantier UI recommandé : feuilletage physique
  et lisibilité. Garder 12 cartes/page, Obtenues par défaut, objectifs et tris.
- Remplacer la translation de 8 px par une entrée directionnelle de feuille
  en perspective (340 ms). Glissement horizontal possible sur la feuille,
  seuil max(48 px, 18 % de largeur) et capture après intention horizontale
  seulement ; le scroll vertical et le zoom restent natifs. Petit glissement
  ou annulation : retour à la pose, sans fiche ouverte. Bords résistants.
- Flèches et clavier restent disponibles. Le tour ignore les répétitions tant
  qu'il n'est pas posé (secours 420 ms), les filtres annulent le tour et
  reviennent à la première page. Sans effets/mouvement réduit : immédiat.
- Ajouter des étiquettes lisibles sous les pochettes : nom complet avec retour
  à la ligne et rareté en texte + point coloré. Les libellés internes de région
  ne recouvrent plus les portraits compacts dans le Binder ; cartes et inspect
  ailleurs inchangés. Les cartes manquantes gardent un dos, jamais de portrait.
- Limiter les styles au Binder, garder une seule feuille/12 cartes montées ;
  pas de WebGL, de sleeve à gagner, nouveau son ou réglage. Le son de page
  existant se déclenche sur un changement effectif, les filtres restent muets.
- Alternative écartée : simuler deux pages complètes avec des cartes clonées,
  agrandir globalement CreatorCard, changer la densité ou les règles du jeu.
  La validation Chromium couvre les gestes et la géométrie, pas le ressenti
  au doigt du joueur. Preuves/version dans le checkpoint courant.

Validation D-098 : DOM Binder/catalogue/son 29/29 ; Chromium mobile nouveaux
scénarios 7/7 et Binder existants ciblés 3/3 ; TypeScript, ESLint, diff-check et
build réussis. Publié sur `main` à `da48f70c`, Vercel Production `READY` / contrôle
`success`. Parcours invité réel (catalogue non obtenu) : pages, swipe, tap,
recherche de nom long et largeur 320/390 px conformes. Aucun run Actions
retourné au relevé ; aucune CI globale ni sensation physique certifiée.

## D-097 — 14 octobre 2026 : donner un temps physique au rituel d'ouverture

- Demande : faire sentir peel → extraction → reveal comme un objet manipulé,
  avec un temps fort pour les rares et un récapitulatif lisible.
- Cause prouvée : le timer JS de 720 ms précédait la fin CSS à 920 ms. Décision :
  unifier JS/CSS à 1200 ms, éventail bref des cinq dos puis pose à l'échelle et
  au centre du reveal. Garder le passage immédiat sans effets/mouvement réduit.
- Conserver les seuils et le tracé libre D-092 : ne pas durcir arbitrairement
  un geste déjà jugé perfectible. Le déplacement du rabat résiste progressivement
  (courbe saturante), sa progression suit les deux seuils, lueur et vibration
  unique signalent « RELÂCHE ». Pas de minuterie tactile ni ouverture avant
  relâchement ; tap/petit trait et annulation continuent de replier.
- Rare/Épique/Légendaire : flip 840/960/1120 ms, pause à face visible entre
  48 % et 60 %. Le SFX déjà disponible et la lumière partent à 48 %, après
  le silence existant et, si applicable, la pose du cinquième dos. Séparer délai
  de flip et délai d'impact évite d'accumuler les retards. Commune : flip
  simple, reflet moins intense. Le Perfect et l'overlay OBS gardent leur rituel.
- Le récapitulatif existant reste obligatoire dans le parcours séquentiel
  normal : trois puis deux cartes sur téléphone, noms non tronqués, animation
  courte, défilement en fenêtre basse, sachet retiré du fond. Garde de 650 ms
  pendant la pose (effets ON), afin que le double tap de « Ranger » ne ferme
  pas le résumé immédiatement. Retour explicite ; pas de fermeture auto.
- Alternative refusée : refonte de l'accueil, WebGL, particules, nouveau lecteur
  ou musique, et changement des tirages. Seul le titre « LE DROP » redondant
  est supprimé ; ESSAYER/Plus d'infos reste compact. Le feeling tactile reste
  une validation joueur ; les tests ne le déclarent pas résolu.

Validation D-097 : logique 16/16, écrans effets/tutoriel 28/28 et écrans généraux
11/11, lots Chromium mobile 6/6 puis 8/8, snapshots bureau/téléphone 2/2,
TypeScript, ESLint, diff-check et build réussis. Code `aabd4169` publié ; Vercel
`READY` / `success`. Tutoriel parcouru sur Production à 390 × 844 (cinq dos à
1 s, reveal à ~1,21 s, résumé lisible, largeur 390). Aucun run GitHub Actions
retourné au relevé ; pas de CI globale ni de ressenti physique déclarés validés.

## D-096 — 14 octobre 2026 : plans latéraux orientés vers le joueur

- Constat vérifié sur la Production Vercel en viewport 390 × 844 : le Drop
  gardait la taille/hiérarchie attendues, mais le flanc du sachet restait un
  filet. Les règles orientaient les plans latéraux à l'opposé du signe de la
  rotation Y du pack; ils se retrouvaient derrière la face imprimée.
- Décision : conserver le tilt du pack `rotateY(-8deg) rotateX(5deg)` et
  tourner les faces latérales dans le sens où le bord gauche s'extrude vers la
  caméra. Leur profondeur passe de 16 à 20 px avec un foil bordeaux clair; le
  bord droit complète le volume. Intensifier modérément le sheen 5 s.
- Réduire le ticket tutoriel à l'action « Essayer » et un seul lien « Plus
  d’infos »; taux, sablier et jetons restent accessibles dedans. Le joueur
  normal garde ces éléments visibles et les jetons déjà repliés.
- Preuve : E2E Chromium téléphone 4/4 (Drop compact/390 × 844 et continuité
  PackTear), tests d'écran 14/14, TypeScript, ESLint et diff-check. Les faces
  dépassent 12 px au rectangle transformé en 390 × 844 sans débordement.
  Poussé sur `main` au SHA `08785e43`; Vercel Production est `READY` et son
  contrôle `success`. Chromium a ensuite confirmé sur cette Production à
  390 × 844 la face latérale (14,4 px), le CTA « Essayer », les infos tutoriel
  repliées et l'absence de débordement horizontal.

## D-094 — 14 octobre 2026 : le Drop est une scène d’ouverture de booster

À la demande de Malik, traiter le Drop comme une scène TCG tactile : conserver
le sachet à `min(58vw, 220px, 34dvh)`, exposer ses côtés en CSS 3D (aucun
WebGL), ajouter un sheen léger qui boucle en 5 s et une ombre au sol. Retirer
la phrase tuto sous le sachet, garder son nom et ses cinq cartes en petit label,
puis mettre l'action d'ouverture avant les compteurs du ticket. Le compteur de
jetons est consultable dans un volet secondaire ; les autres actions existantes
restent accessibles. En tutoriel, le seul CTA principal est « Essayer ».

Les filtres sur le bouton aplatissent les enfants `preserve-3d`, donc la
profondeur doit être rendue sans filtre sur le bouton. La taille du pack et ses
côtés restent visibles dans le test 390 × 844, sans réduire le booster pour
faire tenir toute la page dans l'écran. Les tests navigateur vérifient la
géométrie, l'animation, l'absence de hint long, le ticket et le débordement ; ils
ne remplacent pas l'impression de jeu vérifiée sur le Vercel mobile.

## D-093 — 14 octobre 2026 : un seul propriétaire de la musique et garder le grand booster

`creator-deck-app.tsx` est l'unique propriétaire des scènes musicales. Le
préchargement SFX peut créer l'AudioContext, mais ne démarre pas la BGM ;
`setMusicScene()` met seulement à jour la scène et le gain d'une source déjà
existante. Seules les actions qui ouvrent un booster ou le cadeau tutoriel
démarrent la boucle, dans leur gestionnaire de geste utilisateur. Les
composants enfant d'ouverture ne pilotent ni l'atténuation ni le retour au hub.
Cela évite l'autoplay pendant l'onboarding et une restauration de scène au
démontage. Garder les préférences Son de l'application et Musique distinctes ;
le mute musical interrompt aussi un chargement en cours. Gains conservés : hub
`0,9`, pack/reveal `0,018`, Tribunal `0`. Les tests instrumentés contrôlent une
seule boucle et le retour au hub après fermeture.

Pour le Drop, garder le booster à `min(58vw, 220px, 34dvh)` également sur les
écrans courts. Les CTA peuvent être atteints par le défilement de la page ; ne
pas réduire la pochette pour forcer tout l'accueil au-dessus de la navigation.
À 390 × 844, vérifier labels, hint, absence de débordement horizontal et au
moins 12 px entre la scène et le ticket. Le rendu des côtés sur un vrai appareil
et le ressenti tactile restent des validations joueur.

## D-092 — 14 octobre 2026 : laisser le joueur dessiner la coupe librement

Après le test Vercel, Malik confirme que le sachet paraît encore « dur comme du
bois » : la coupe doit être tracée au doigt au lieu de ressembler à un rail. La
version précédente retriait les points par X, les ramenait à une médiane et
exigeait 88 % de la soudure ; ce choix est remplacé. Garder l'ordre tactile,
les retracés X et la variation Y dans la bande haute, avec seulement un filtre
léger anti-jitter. Couverture minimale 64 %, zone Y 6–26 % et effort minimal
`0,22` pour écarter les taps ; ouvrir uniquement au relâchement. Le rabat suit
le déplacement du doigt. Ajouter un discret slit/lueur/points, sans réactiver
PackFoil3D ni déplacer le travail vers Drop, Binder, Craft, Toi, SQL ou le pity.
Les cartes doivent commencer à apparaître automatiquement après la coupe,
sans clic bloquant « Afficher les cartes ».

Le critère principal est le ressenti du joueur sur le site Vercel : si un swipe
franc ne l'ouvre pas ou si son tracé n'est pas reconnaissable, le travail reste
inachevé même si les tests passent. Vérifications navigateur requises pour
régressions seulement, jamais pour contraindre le tracé à être monotone. Tests
locaux de cette itération : géométrie 3/3, E2E sachet 49 réussis/1 scénario
cloud ignoré, écrans 130/130, typecheck, lint ciblé et build statique réussis.
Publié sur `main` au SHA code `3fec7895fae6bbed0eb05bf4baa6e246f55fefdc` ; CI
[`38573481379`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38573481379)
verte (6/6) et Vercel Production `READY`.

## D-091 — 14 octobre 2026 : n'ouvrir le rabat qu'après une coupe presque complète

Les captures montrent qu'une petite coupe locale peut afficher « Relâche pour
ouvrir » et que son trait persiste après un geste trop court. Comme l'animation
de libération plie le rabat entier, exiger simultanément l'effort d'ouverture
existant et au moins 88 % de couverture de la largeur tactile réelle de la
soudure. Cette marge permet de relâcher avant le bord tout en empêchant une
coupe à gauche ou au
milieu de déplier tout le haut. La trajectoire demeure libre en Y dans la bande
de soudure ; elle n'est pas remplacée par une barre de progression. Un relâché
avant seuil efface le trait et replie le sachet, avec retour visuel bref. Code
publié sur `main` au SHA `8619f461792bc55f77aab826907e4025f866f097`, confirmé
sur le distant ; Vercel Production READY. Tests E2E bureau/téléphone simulé :
47 réussis, 1 scénario cloud conditionnel ignoré. La CI initiale `38569239104`
a relevé une ancienne assertion du banc d'écrans qui interdisait le texte de
version déjà présent dans Toi ; assertion corrigée pour vérifier son format,
suite d'écrans locale 130/130. CI de reprise `38569853793` verte (6/6 jobs).
Le correctif de test est au commit `13f471e5`. Aucun essai sur téléphone
physique.

## D-090 — 14 octobre 2026 : couper dans la soudure sans effet de gribouillage

La capture de Malik montre qu’un tracé chronologique retrié par X produit des
dents lorsqu’on fait des va-et-vient, et que le trait blanc/halo trop lumineux
ressemble à un gribouillage. Construire la fente depuis une médiane de points
par tranches horizontales de 2 %, puis appliquer un lissage pondéré court. La
géométrie visible n’accepte que la bande supérieure (Y 10–21 % du sachet) ;
descendre sur l’illustration ne la déforme pas. Le mouvement de soulèvement
au-dessus de la soudure compte encore pour l’effort mais ne dessine pas hors de
la bande. Garder le seuil et l’ouverture au relâchement inchangés. Réduire le
trait champagne à 1,6 px et son halo rose à 5 px/42 % d’opacité. Tests unitaires
2/2 et E2E bureau/téléphone simulé 45 réussis, 1 scénario cloud ignoré ;
typecheck, ESLint ciblé, build réussis. Publié à `0c4c7b9f`; Vercel READY.
Pas d’essai sur appareil physique.

## D-089 — 14 octobre 2026 : conserver le guidage du peel jusqu'au relâchement

Après la correction des va-et-vient, Malik constate que la coupe semble plus
rigide et plus linéaire. Le seuil `span >= 38` armait la coupe tôt, puis
`gesture.ready` bloquait entièrement `pointerMove` : plus de suivi du doigt,
plus d'influence Y ni de retouche de la fente avant le relâchement. Le seuil est
maintenant fondé sur l'ouverture combinée (étendue horizontale, variation Y et
soulèvement), sans règle de longueur horizontale seule. Après armement, le
doigt continue de déplacer le rabat et de guider la fente jusqu'à `pointerUp`.
Un seul Y courant par tranche X, trié en profil monotone, guide la géométrie
sans réutiliser une polyline temporelle comme clip auto-croisé. Le paquet reste
fermé pendant le toucher ; `pointerUp` ouvre si le seuil a été atteint ;
annulation/perte de capture replie. Tests bureau/téléphone simulé : E2E complet
du peel 45 réussis, 1 scénario cloud conditionnel ignoré ; typecheck, ESLint
ciblé et build statique réussis. Commit `abcd2d0a` ; état de publication dans
la passation. Aucun test sur téléphone physique revendiqué.

## D-088 — 14 octobre 2026 : dessiner la coupe du booster avec un vrai contour SVG

La vidéo de Malik montre le seuil « Relâche pour ouvrir » sans fente visible,
avant que les cartes apparaissent. Le tracé avait été converti en `polyline`
SVG, mais gardait des propriétés de barre HTML : un `background` ne peint pas
le chemin SVG et aucun `stroke` n'était défini. La coupe géométrique était
calculée, mais invisible. Le tracé occupe désormais la surface du sachet et
dessine la trajectoire du doigt en trait clair, doublé d'un halo rose. Il reste
figé quand l'ouverture suffisante est atteinte, puis s'efface avec l'animation
de déchirure au relâchement. Aucun changement du seuil, du moment d'ouverture,
des tirages ou des timings de reveal. Un E2E vérifie le contour SVG. L'état de
publication et les résultats exacts figurent dans la passation.

## D-087 — 14 octobre 2026 : séparer les interrupteurs audio et choisir la BGM à l'écoute

Malik indique que la boucle actuelle ressemble à un son de fond plutôt qu'à
une musique, et veut contrôler séparément la musique et les sons de jeu. Toi
présente maintenant deux interrupteurs persistants : « Son de l’application »
(bruitages et synthèse) et « Musique » (BGM). Ils sont activés par défaut pour
les nouveaux joueurs. Un ancien choix Son ON/OFF est recopié aux deux au
premier démarrage après mise à jour ; ensuite chacun est mémorisé séparément. Le
volume passe par les boutons physiques du téléphone, donc l'interface ne propose
plus de niveaux Discret/Normal/Fort. La liste de candidats et leurs licences
est dans [audio-assets.md](audio-assets.md). Aucune piste externe n'est encore
intégrée : Malik l'écoutera et choisira avant remplacement. Le ducking du pack,
le silence du Tribunal, les timings de reveal et les effets restent inchangés.
Les interrupteurs et le mix séparé passent les tests ciblés (22 unitaires audio,
6 tests d'écran), le typecheck, ESLint ciblé et le build cloudless. Publié sur
`main` au SHA `ee62de9e95fdccad513a0435956bf816927a345a`, Vercel Production
READY. La CI `38499177407` a révélé une attente E2E utilisant le nom exact
obsolète « Son » ; le scénario adapté au nouveau nom passe en local sur mobile
(2 réussis, 1 scénario cloud ignoré). Correctif E2E et documents publiés au
SHA `28af5919f1565e9867db13fe4d6f9e7032607c7c` ; nouvelle CI `38499499108`
était en attente/en cours au dernier relevé. Le rendu des candidats et le nouvel
asset restent à choisir et à écouter sur téléphone.

## D-086 — 14 octobre 2026 : retirer la pulsation percussive de la BGM

Malik entendait un « tac-tac » régulier quand Son était activé. Le MP3 servi par
Vercel était identique à celui du dépôt ; la pulsation se trouvait dans la
composition et n'était pas un défaut de mise en boucle (la piste boucle toutes
les 24 s). Remplacement du prototype par une nappe synthétique douce sans
percussion, accents rapprochés ni samples tiers. Nouveau fichier : 24 s, MP3 mono
64 kbit/s, `-22,7 LUFS`, crête vraie `-11,5 dBFS`; au gain de scène et volume
Normal, niveau estimé `-26,1 LUFS`. Le ducking, le mute, les SFX et les timings
de jeu ne changent pas. Génération reproductible dans
`scripts/generate-hub-music.py`, détails dans `audio-assets.md`. Écoute physique
encore nécessaire avant de figer l'asset final. Générateur rejoué et MP3
identique au hash ; décodage FFmpeg valide. Tests : fichier audio 23/23, projet
1 169/1 169, E2E audio 2/2 (bureau/téléphone simulé), typecheck, ESLint ciblé,
build cloudless et `git diff --check` réussis. Publié sur `main` au SHA
`67a9319452e27cb792032584e28448a6c6cc7fe7`. CI
[`38497830790`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38497830790)
verte (6/6), Vercel Production READY ; le MP3 servi par Vercel a le même
SHA-256 que l'asset local. L'écoute physique reste à faire.

## D-085 — 14 octobre 2026 : relever la BGM du hub devenue inaudible

Le prototype `hub-late-night.mp3` mesurait `-26,4 LUFS` intégrés. Le gain de scène
`0,24` était appliqué au canal musical, puis le volume Normal `0,75` au canal et
au bus partagé : cette double atténuation ramenait la boucle à environ
`-43,8 LUFS`. Le gain de scène passe à `0,9` et le volume global est appliqué
une seule fois sur le bus (mix Normal estimé à `-29,8 LUFS`, crête
`-14,1 dBFS`). Le ducking pack reste à `0,018`, le Tribunal reste muet. Aucun
nouvel asset, bruitage ou changement de timing. Mesure source avec ffmpeg ; test
Web Audio simulé vérifiant une boucle unique, les trois scènes et le mute.
Écoute physique encore requise. Vérifications locales :
`npm test` 1 169/1 169, `npm run ecrans` 129/129, test E2E audio 2/2
(bureau et téléphone simulé), typecheck, ESLint ciblé, build statique cloudless
et `git diff --check` réussis. Publié sur `main` au SHA
`861870ee66054646b3215bb360ca48b74ab1ff01` ; CI
[`38496749379`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38496749379)
verte (6/6), Vercel Production READY.

## D-084 — 14 octobre 2026 : figer la coupe armée pendant le maintien du doigt

Malik a montré qu'un mouvement répété de va-et-vient pouvait faire paraître le
sachet cassé. La coupe conserve désormais le premier point tracé sur chaque
portion horizontale, ce qui empêche les retours de réécrire la fente. Dès que
l'ouverture suffisante est atteinte, le sachet et son tracé restent fixes tant
que le doigt est posé ; le booster s'ouvre toujours uniquement au relâchement.
Une annulation ou perte de capture replie encore le sachet, y compris après le
seuil. Aucun changement des tirages, timings de reveal, effets ou autres écrans.
E2E ciblés de la coupe guidée, du maintien avec va-et-vient et de l'annulation
après seuil : 6/6 bureau/téléphone simulé. Suite `e2e/pack-tear.spec.ts` :
43 réussis, un scénario conditionnel ignoré ; écrans 129/129, typecheck,
ESLint ciblé et `git diff --check` réussis. Publié au SHA
`b6a3605ce8b77e41244f4fef9f8e9300fd7ec634`, CI `38494377386` verte (6/6) et
Vercel Production `READY`. Essai sur téléphone physique encore requis.

## D-083 — 14 octobre 2026 : codes de test séparés de la réserve normale

La limite de quatre boosters est celle de la recharge normale, pas un obstacle
à conserver pour les récompenses promo de test. Une récompense longue est
stockée dans `pack_state.promo_packs`, distinctement et côté serveur ; un tirage
ne dépense ce solde qu'après épuisement de la réserve normale. Le code demandé
`MALIK` est prévu pour 50 ouvertures, une seule rédemption, avec `recipient_id`
lié au compte Supabase du joueur. Aucun tirage, carte, point, jeton ou formule
d'économie n'est modifié. La migration est additive ; elle ne doit être
appliquée qu'après tests et CI verte. Migration 0051 publiée sur `main` au SHA
`5bdf9f21317a2d6b6557c1cc70f968a3379236e6`, CI GitHub `38490854882` verte
(6/6), Supabase `38491098387` l'a appliquée et a vérifié les objets ; Vercel
Production est READY. Postgres jetable, unitaires, écrans, typecheck, ESLint et
build réussis. Aucun code promo n'a encore été créé : Malik doit insérer `MALIK`
avec son email de compte dans SQL Editor, selon `docs/booster-test-access.md`.

## D-081 — 14 octobre 2026 : le cloud fait foi dès qu'un compte est connecté

À la demande de Malik, une sauvegarde en ligne existante remplace
automatiquement toute copie locale différente à la connexion, au démarrage, au
retour de l'application au premier plan et au retour du réseau. Aucune boîte de
choix ne bloque les sabliers. Si le serveur refuse un envoi automatique parce
qu'une autre version vient d'être écrite, le client adopte la sauvegarde que le
serveur renvoie. Un compte sans sauvegarde distante conserve son initialisation
locale et l'envoie. Les actions transactionnelles (échange, vente, etc.) gardent
leur garde : elles ne se poursuivent pas si leur synchronisation explicite
échoue. Conséquence assumée : une progression faite hors ligne sur un compte
connecté est remplacée par la version en ligne au prochain retour du réseau.
La reprise d'un tirage concurrent relit le serveur avant d'adopter son état.

Validation locale : 1 168 tests unitaires, 128 tests d'écran, TypeScript,
ESLint ciblé et build de production réussis ; build cloudless sans variables
Supabase, donc il n'exerce pas une vraie session. Le code de sync est publié sur
`main` au SHA `fc5b47ff0793e8ff273dfccd381f50b158bd4fa4`. Le premier run
`38487628741` a échoué sur le rechargement après un tirage ; le suivi est décrit
en D-082. Aucune sauvegarde de compte ni donnée de production n'a été inspectée
ou modifiée.

## D-082 — 14 octobre 2026 : conserver les missions après un tirage serveur

`open_pack()` écrit les cartes et la réserve côté serveur, tandis que les
compteurs de missions du Drop sont calculés localement. Après adoption de la
sauvegarde du tirage, l'application enregistre donc l'état fusionné par un push
normal fondé sur une relecture serveur (`force=false`). Les identifiants des
cartes générées par le serveur et la séance locale v9 sont préservés. Une
réponse de conflit n'autorise jamais un écrasement forcé. Le rechargement reprend
ensuite cet état et ne déclenche pas de second push. Tests locaux : suite cloud
simulée E2E 2/2 bureau/téléphone. Le contrôle TypeScript distant a d'abord
relevé deux paramètres de callback implicites dans les assertions de test ; ils
sont typés dans `c3ab397e`. Vercel pour ce SHA est READY ; CI GitHub
[`38488559202`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38488559202)
verte, 6/6 jobs.

## D-080 — 13 octobre 2026 : faire voir le sachet actuel et démarrer la musique au premier appui

L’accueil Drop utilise désormais le même visuel mat que la scène d’ouverture
(`live-opening.svg`) au lieu de l’ancienne façade (`live-foil.svg`). Sur mobile,
le navigateur attend un geste explicite avant d’autoriser la musique ; le
premier appui clavier ou tactile sur un contrôle du jeu (hors tutoriel) démarre
donc la boucle du hub, même si la réserve ne permet pas encore d’ouvrir un
booster. Le geste d’ouverture conserve ensuite le mix réduit du pack. Aucun
effet sonore de navigation n’est ajouté. Motif : la version précédente laissait
l’ancien sachet sur l’accueil et le hub silencieux tant que le joueur n’avait
pas pu lancer un tirage. Publié `8bf36ba0`, CI `38485767846` verte (6/6) ; à
valider à l’écoute sur téléphone physique, car les tests automatisés ne mesurent
pas le volume perçu.

## D-079 — 13 octobre 2026 : revalider un conflit avant l’usage d’un sablier

Après un blocage dû à deux sauvegardes différentes, une tentative de sablier
refait la comparaison en lecture seule. Si elles sont désormais réconciliées,
le parcours automatique normal reprend ; si elles divergent encore, le débit
reste bloqué jusqu’au choix dans Mon compte. Aucun push, pull ou merge forcé
n’est ajouté. Motif : éviter qu’un ancien diagnostic de conflit persiste après
une resynchronisation, tout en protégeant une progression potentiellement
différente. Cette règle est remplacée par D-081 à la demande de Malik. Store
cloud 159/159 et navigateur cloud simulé 2/2. Publié
`1ebc6415`, CI `38482257038` verte, Vercel success ; aucune migration SQL en
attente. Téléphone réel et sauvegarde du compte de Malik non inspectés.

## D-078 — 13 octobre 2026 : première couche musicale et rythme de jeu

Le premier geste de booster déverrouille l'audio mobile et démarre une boucle
originale discrète du hub, encodée dans `public/music/hub-late-night.mp3`. Le
réglage global Son et ses trois crans pilotent BGM, bruitages et synthèse ; la
boucle est fortement baissée pendant le pack et coupée au Tribunal. De courts
stingers renforcent la Légendaire, le Perfect et le bilan du Tribunal sans
déplacer les délais de silence, les flips, le Perfect ou le tear. La musique est
un prototype synthétisé, pas un asset final ; procédure de remplacement dans
[la note d'assets audio](audio-assets.md). Le gain BGM du hub était fixé à `0,24`,
ducké à `0,018` pendant le pack et nul au Tribunal ; l’écoute réelle sur
téléphone reste à faire. Reflets sont activés par défaut ; `prefers-reduced-motion` neutralise les animations
même lorsque le réglage Reflets est actif.

Le Binder reste sur 12 cartes par page (dans la plage voulue de 12–18), ajoute
un mouvement d'entrée discret et joue le son de page existant lors des flèches ;
les filtres restent muets. La vitrine/streak du profil passe avant les statistiques
(qui sont repliées), les fonctions en ligne sont repliées, et le thème du Binder
teinte aussi le Drop. Le Tribunal quotidien, ses verdicts visuels et son bilan
existaient déjà ; cette passe les conserve et son stinger se joue après le
paiement du bilan. Tests unitaires/écrans, types, lint, build et E2E bureau/
téléphone simulé vérifiés localement. Le sachet n’initialise aucun moteur WebGL.
Commit `00b22d4b`, CI `38480069643` verte (6/6 jobs) ; détails et limites dans la
[passation](agent-handoff.md#sensation-de-jeu-a--e--vérification-locale-13-octobre-2026).

## D-077 — 13 octobre 2026 : créer un bref temps d’anticipation avant la carte garantie

Après le retrait du corner peek, la cinquième carte d’un reveal séquentiel
ordinaire attend 360 ms avant son retournement automatique habituel. L’attente
est absente du Perfect, de Reflets désactivés et du mouvement réduit. Aucun
geste, contrôle ou changement de règle de tirage n’est ajouté. Arena a livré
`1ae5f2c8`, vérifié par la CI complète `38464097660` (6/6 jobs) et intégré à
`main` par fast-forward. La validation du ressenti par Malik reste nécessaire ;
si elle échoue, le changement est isolé et réversible par un revert ciblé.

## D-076 — 13 octobre 2026 : démonstrateur de classeur multi-univers isolé

Créer `/catalogue-demo` comme prototype d’interface autonome pour comparer un
même classeur mêlant créateurs Twitch fictifs et personnages fictifs, avec un
classement et une progression distincts par univers. Les noms, handles,
collectionneurs, scores de progression et univers sont des fixtures inventées ;
les illustrations CSS abstraites portent chacune le marquage « Visuel temporaire ».
La route ne lit ni n’écrit le catalogue, les sauvegardes, Supabase, les boosters
ou l’économie du jeu et n’active aucun choix artistique/licence pour une version
produit. L’objectif est de tester la hiérarchie d’écran et la comparaison mobile,
pas de préjuger des règles finales d’un catalogue étendu.

## D-075 — 13 octobre 2026 : sélection des portraits sur la qualité visuelle

Pour remplacer les portraits actuels, la source ou l’absence de crédit ne sert
pas de filtre. Le choix se fait en comparant l’image : créateur reconnaissable,
netteté, absence de pixelisation gênante, rendu naturel et cadrage. La détection
automatique de visage, les dimensions annoncées et le score de netteté restent
des indices ; aucun n’accepte ou ne rejette seul une photo. Les 300 choix
manuels et les portraits déjà validés restent protégés. Une galerie prépare les
comparaisons et exporte des brouillons, sans changer automatiquement les assets
du jeu. Voir le pilote et le checkpoint qualité-first du 13 octobre.

## D-073 — 13 octobre 2026 : distinguer carte obtenue en direct et stream actif

La variante persistée `live` reste un souvenir utile à de futurs designs. Son
badge devient « Obtenue en direct » (libellé compact « Acquis live »), et la
fiche précise qu’il s’agit de la provenance du tirage. Le direct actuel demeure
un état distinct, affiché seulement à partir d’un snapshot frais, avec un lien
vers l’URL Twitch de la chaîne. Pas de dépendance à un schéma de données ni de
perte de variante ; aucun stream actif n’est simulé si les données sont périmées.
Les vérifications et limites sont dans le checkpoint du 13 octobre.

## D-074 — 13 octobre 2026 : ouvrir une chaîne depuis le badge de direct actuel

Quand une carte a un snapshot live frais, son badge « Direct » est aussi un
lien HTTPS vers `https://www.twitch.tv/<login>` qui s’ouvre dans un nouvel
onglet/contexte avec `noopener noreferrer`. Ainsi, l’appareil peut ouvrir le
site ou l’application Twitch via ses liens universels, selon sa configuration.
La variante souvenir « Obtenue en direct » reste non cliquable, et aucun lien
vers un live terminé ou périmé n’est fabriqué. On n’impose pas de schéma privé
`twitch://` ni n’affirme un lancement natif garanti. La règle générale suivie
est de lier vers la destination publique Twitch sans incorporer son lecteur ;
cela ne constitue pas un avis juridique ni une garantie de Twitch. Test écran
ciblé dans le checkpoint du 13 octobre.

## D-072 — 13 octobre 2026 : corner peek sur la carte garantie — retiré

Après le flip des quatre premières cartes d’un booster ordinaire, la cinquième
reste face cachée et son coin supérieur droit peut être tiré vers le centre
pour dévoiler un petit aperçu. L’ouverture complète se fait au relâchement après
un seuil court ; un geste interrompu replie le coin. Perfect, OBS, autres cartes
et flux d’ouverture restent inchangés. Mouvement réduit/effets désactivés
utilisent le reveal direct existant. Le CTA « Retourner la carte » et le bouton
accessible au clavier contournent l’aperçu ; le raccourci de révélation complète
reste disponible. GPU reste désactivé par défaut. Tests DOM/E2E, suites, build et
limites sont consignés dans la passation du 13 octobre. Les cadeaux de
bienvenue conservent aussi le parcours direct : ils partagent la scène Live,
mais ne sont pas des boosters ordinaires pour cette interaction.

Le 13 octobre, Malik a demandé de retirer cette mécanique après essai : la
languette paraissait artificielle et son apparition variable prêtait à
confusion. Le code, le geste et l’attente spéciale de la cinquième carte sont
supprimés. La carte garantie reprend le retournement automatique ordinaire.
Une éventuelle nouvelle proposition doit être conçue séparément par Arena ;
aucune nouvelle interaction tactile n’est décidée à ce stade.

## D-069 — 13 octobre 2026 : hiérarchie Drop et priorité des recettes accessibles

Demande limitée aux UI Drop/Craft ; Binder/Toi réservés à Gemini, ouverture
interdite. CTA du Drop avant le ticket d’information. Atelier : vue à portée
par défaut, recettes bon marché à préparer si solde insuffisant ; exploration
complète/recherche possibles sans rendre l’achat autorisé. Règles et raretés
repliées, liste paginée conservée pour limiter le DOM. Recycler zéro doublon
montre la boucle et propose le Drop. Aucun changement de l’économie.
[Preuves et fichiers](drop-craft-priorites-2026-10-13.md).

## D-068 — 13 octobre 2026 : ouvrir uniquement au relâchement

Demande explicite de Malik : une coupe suffisante ne déclenche plus finish
pendant pointerMove. Elle arme l’ouverture, effectuée uniquement au pointerUp.
Cancel/perte de capture replient. Pour stabiliser la languette, repère de coupe
figé au début du geste, angle du déplacement global borné à ±12°, interpolation
50 ms désactivée dans les modes sans effets. La trace reste pilotée en X/Y.
Le ressenti sur téléphone doit encore être jugé par Malik.

## D-067 — 13 octobre 2026 : coupe guidée plutôt que rail horizontal

Malik refuse le ressenti de jauge G→D. La bande haute devient une zone tactile
qui accepte des départs libres et conserve les échantillons X/Y du doigt.
La trace découpe les deux pièces imprimées ; déplacement vertical et angle
pilotent le rabat. Le seuil mesure une ouverture suffisante (largeur fendue et
soulèvement), sans alignement parfait. Relâchement précoce/cancel/perte de
capture replient ; clavier et bouton de secours conservés. Continuum inchangé,
GPU non activé par défaut ; aucun chantier sur les autres écrans.
[Spécification et vérifications](booster-peel-guide-2026-10-13.md).

## D-066 — 13 octobre 2026 : pilote de recherche/cadrage automatisé puis revue

Malik demande d’automatiser le reste du catalogue et de corriger les exceptions
après coup, ses 300 choix manuels étant conservés. Carte blanche pour le pilote
de vingt : SerpApi Google Images, détection de visage locale non générative,
galerie avant/après exportant seulement des brouillons. Les portraits existants
restent actifs jusqu’à vérification des propositions. Résultat réel : six
propositions techniques sur vingt, pas une garantie pour les 697 restants ;
les critères de personne et de droits restent distincts du score technique.
Cache des recherches/images, limites explicites et protections du périmètre.
[Preuves, commandes, coûts observés et limites](portrait-pilot-2026-10-13.md).

## D-065 — 13 octobre 2026 : ne plus afficher les versions Upscayl

Malik observe des détails de visage artificiels dans les portraits agrandis
par IA et choisit de revenir aux images Twitch d’origine. Les fichiers WebP
Upscayl et leur registre restent conservés comme archives, mais la sélection
des portraits ne les active plus. Les portraits manuels, les sélections Commons
avec provenance et la photo fournie de Diverron gardent leur priorité.
Vérification locale adaptée : sélection de l’image sur le catalogue, crédits
et build ; [état du correctif](portrait-upscale-review-2026-10-13.md).

Ce registre est autonome, mais ne remplace pas le code ni les décisions
détaillées existantes. Ajouter des entrées datées ; marquer une décision
remplacée plutôt que l'effacer. Une proposition en attente n'est pas adoptée.
Les décisions et statuts ci-dessous sont des instantanés datés. Pour savoir ce
qui attend aujourd’hui une réponse du joueur, consulter uniquement les repères
A–F en tête de [la roadmap](roadmap.md#retours-utilisateur-à-rapprocher--liste-unique).

| ID / date | Décision et contexte | Justification / conséquences / preuve |
|---|---|---|
| D-057 / 2026-10-12 | Atelier portraits v1.5 : sélection linéaire image par image avec garder, rejeter et passer au créateur suivant. | Retour direct de Malik : modèle Tinder, toutes les commandes visibles à l’écran, détails secondaires repliés et import personnel depuis le carrousel. Garder/rejeter s’applique à une image ; passer ne marque pas le créateur comme terminé. Les choix restent provisoires « droits à vérifier » et exclus du patch publiable. Images <300 px refusées ; 300–899 px conservées sans agrandissement. Tests serveur/updater 6/6 et navigateur simulé couvrant navigation, rejet, import, choix provisoire et export séparé. Windows physique non testé. |
| D-056 / 2026-10-12 | Un appui sur « Révéler la suivante » pendant le flip est mis en attente et avance d’une carte à la fin de cette animation. | L’ancien verrou `disabled` avalait le premier toucher ; le bouton devenu actif annonçait la suite, mais la fermeture du flip ne voyait pas cet appui. La référence synchronisée consomme un seul appui par carte ; Perfect inchangé. Régression DOM 16/16, suite écrans 109/109, unitaires 1162/1162, TypeScript/ESLint, SQL jetable, catalogue/build, E2E bureau/téléphone 64 réussis (10 scénarios serveur ignorés) et parcours cloud simulés 10/10 validés localement. Code publié `3f33b19` ; CI GitHub `38251607393` verte (4 jobs). |
| D-055 / 2026-10-12 | Malik demande explicitement de refaire les portraits des 1 000 créateurs avec de belles images. | Remplace la restriction précédente aux grands et la conservation systématique des petits ; lots de recherche et d’intégration pour tout le catalogue. Fonctionnalités existantes conservées. Style choisi par Malik : photos nettes, visage visible, cadrage individuel cohérent. Aucune validation générale des images annoncée. Suivi complet dans portrait-suivi-complet.csv. Instruction suivante : conserver Rubius/Shroud déjà faits, rechercher les 998 restants et avancer au maximum sans attendre Malik pendant son sommeil. |
| D-054 / 2026-10-12 | Reprise portraits à lecture courte, demandée par Malik pour économiser le quota. | AGENTS + passation-portraits.md remplacent les lectures générales uniquement pour ce chantier. Recherche seule sans clone/audit/tests ; intégration avec fichiers et vérifications ciblés. Archives conservées pour questions précises, règles de protection/publication inchangées. CI produit 433ee06 verte, 4/4 jobs. |
| D-053 / 2026-10-12 | Portraits sélectionnés séparés des avatars Twitch ; crédits dans Toi → Réglages, jamais sur les cartes. | Accord de Malik. Rubius/Shroud en WebP 900 px, provenance conservée dans le registre des remplacements. Carte, affiche et préchargement partagent la même adresse ; scripts Twitch ignorent le sous-dossier curated. Licences d’après le manifeste fourni, pas revérifiées sur les sites dans cette session. Tests ciblés verts ; la recherche du reste demeure ouverte. |
| D-051 / 2026-10-11 | Séparer explicitement le plan courant du journal de tâches historiques. | À la demande de Malik, le haut de la roadmap devient la source unique du plan actif ; les anciens statuts et cases à cocher restent comme historique daté, sans compter comme tâches. Code produit `980bdf8`, checkpoint documentaire `b3828d5` sur `main` ; CI `38164889818` verte (4 jobs), statut Vercel success, aucune PR ouverte. Le parcours sablier réel est confirmé. Les vérifications utilisateur sont désormais regroupées A–F dans la roadmap et attendent le statut de Malik ; elles ne sont pas des bugs actifs. Aucun correctif, code ou SQL supplémentaire planifié. |
| D-047 / 2026-10-11 | Faire sortir visuellement l’emballage pendant l’élévation des cinq dos. | Le sachet qui restait derrière la pile paraissait ouvert et cheap. Raccourcir cap/corps, faire disparaître profondeur/ombre ; modes Reflets OFF et mouvement réduit masquent l’emballage sans cacher la pile. Inspiré du principe de transition visible dans les vidéos envoyées ; aucun asset, nom ou effet Pokémon repris. Timer 1900 ms, Reveal/Perfect/silence/tear inchangés. Playwright ciblé 4/4 bureau/téléphone simulé ; téléphone physique non testé. K-038. |
| D-036 / 2026-10-11 | Séparer politique des fichiers et plan issu de l'historique réel pour K-034. | Demande ciblée et publication main autorisée. Le baseline prouve les empreintes, pas les migrations en attente ; approbation exigée uniquement pour manual à appliquer. Modes/versions contrôlés même si enregistrés. Cible/TLS/historique/contrôles finaux conservés, aucun SQL ni K-031 modifié. 28/28 tests locaux ; log automatique 38140833700 désormais lu et refus manual confirmé. Code ee10a6d, CI 38142506934 quatre jobs verts ; automatique 38142681999 success, log base à jour vérifiée sans SQL de migration. |
| D-048 / 2026-10-11 | Corriger le report erroné de la recharge ordinaire dans `_pack_refresh` via 0049 additive. | 0048 contient un calcul prouvé faux : N boosters gagnés avançaient l’ancre de N ms. Nouvelle définition du helper privé, multipliant N par l’intervalle ; aucune ancienne migration modifiée. Tests TypeScript/Postgres jetable verts. 0049 `automatic` a été appliquée et vérifiée par `38163920425` après CI `38163674938` ; aucun autre SQL d’application attendu actuellement. |
| D-050 / 2026-10-11 | Sortir l’activité récente des amis du panneau replié du Drop. | UX-03 : le nombre d’amis ayant ouvert récemment est déjà disponible et le Carnet possède le détail ; afficher un CTA direct sous le Paquet Scène uniquement si le compte dépasse zéro, sans alourdir l’écran au repos. La vitrine reste dans le profil. Aucun badge, notification, stockage ou système serveur ajouté. Test DOM ciblé 7/7 ; CI `38164889818` verte (4 jobs), commit `980bdf8`. |
| D-035 / 2026-10-11 | Transférer dans un nouvel environnement choisi par Malik et documenter K-034 avant reprise. | Incident d’interface historique. L’accès Git/API/logs a ensuite été testé, K-034 corrigé et vérifié automatiquement ; 0047 n’a pas été rejouée. L’acceptation du risque sans sauvegarde concernait uniquement l’application passée. |
| D-034 / 2026-10-11 | Isoler le CLI de migration des réglages locaux et vérifier l’historique/objets après application. | Erreur invalid keys du CLI 2.39.2 avant SQL ; correctif `5832b5d`, CI `38140313000`, application 0047 `38140515537` et contrôle final `38140562490` réussis. Le retour téléphone sablier a depuis été confirmé par Malik (K-030/K-031). |
| D-033 / 2026-10-11 | Exécuter les scénarios cadeau et sablier dans le job cloud simulé, puis appliquer uniquement 0047 après CI verte et dry-run. | Reprise demandée par Malik (« Fais tout ça »). Échecs sans cloud reproduits, assertions conservées ; configuration publique chargée comme Next dev. Malik confirme l’absence de sauvegarde gratuite et accepte explicitement le risque de perte ; cette acceptation remplace le blocage sauvegarde, sans prétendre disposer d’une récupération. Cible du script : CreatorDeck yzxchpybqrfegvecihxf. Aucune application avant contrôles ; aucun reset/historique 0001–0046 rejoué. |
| D-032 / 2026-10-11 | Raccorder la dépense des sabliers au serveur sans migration globale de leurs récompenses ni XP/niveau. | 0047 manual : gains synchronisés, débit/recharge atomiques, UUID rejouable par compte et garde contre les anciennes sauvegardes. Les gains restent calculés localement, leur provenance n’est pas certifiée par ce RPC. Remplacement global refusé par auto-review ; helper ciblé retenu. Code `aded8ff`, CI et application vérifiée `38140515537`, parcours téléphone confirmé par Malik ; recharge ordinaire corrigée ensuite par 0049/K-031. |
| D-031 / 2026-10-11 | Une ouverture Live côté serveur doit préserver les compteurs de mission calculés localement. | `open_pack()` reste l'autorité pour cartes/réserve et le Paquet Scène reste exclu de la mission « Ouvre un booster ». Le JSON serveur ne contenant pas ces missions locales, le client reprend uniquement `missionDay`/`missions` de son état calculé après tirage. Test `cloud-store.test.ts` 135/135, typecheck/ESLint ciblé réussis. Correctif publié sur main, bd97f71 ; aucune règle de mission/SQL changée. Les sabliers restent locaux et ne modifient pas la réserve serveur conformément au périmètre. |
| D-001 / 2026-10-10 | Quatre documents de coordination + AGENTS communs à Codex Cloud, PC et ChatGPT | Demande utilisateur de continuité sans conversation ni quota ; mêmes règles pour tous, checkpoints réguliers, code/tests comme preuves. Le quota n'est pas observable de façon fiable. |
| D-002 / 2026-10-10 | Documenter sur design, maintenir la base réelle de PR #8 | Git/page de PR : design `4955d9b`, base arena, main ancien. Aucun merge/main autorisé ; cette mission ne change pas le jeu. |
| D-003 / 2026-10-10 | Un écrivain par branche, relecture distante avant chaque checkpoint/push | Préserver les travaux alternés et éviter l'écrasement ; passation indicative, aucun faux verrou technique. Push normal, fichiers ajoutés explicitement. |
| D-004 / 2026-10-10 | Garder les historiques et séparer implémentation, validation et déploiement | La roadmap et les compteurs antérieurs ont vieilli ; leur contexte reste utile. Les runs actuels sont dans la passation, avec limites et SHA. |
| D-005 / 2026-10-10 | SHA du code audité explicite ; commit du document retrouvé dans Git | Un fichier ne peut contenir le hash du commit qui le contient. `git log -1 --format=%H -- docs/agent-handoff.md` retrouve le checkpoint documentaire sans SHA fictif. |
| D-006 / 2026-10-10 | Audit documentaire seulement : documenter K-007 sans changer le jeu ou son banc ici | La coordination est l'objet de la mission. Le test SQL dépend de la date réelle ; la prochaine tâche ciblée doit le rendre déterministe, sans masquer l'échec ni changer la règle arène. |
| D-007 / 2026-10-10 | Garder la lecture du lock dans `dev:setup` | Désactiver `package_lock` a fait dériver Next/Playwright ; correction par `npm ci` puis setup normal, versions comparées et contrôles rejoués. E2E et production non exécutés restent non validés. |
| D-008 / 2026-10-10 | Scénarios de draft fermés/ouverts imposés seulement dans la base SQL jetable | Reprise autorisée par l’utilisateur après la mission documentaire (D-006 achevée). Supprime la dépendance au jour réel ; garde les dates explicites pour la règle calendaire, la vraie RPC pour les parcours et la restauration exacte en `finally`. Aucun changement du jeu ou de migration. Contre-épreuve : suppression temporaire de la garde dans une copie externe, jamais dans les fichiers produit. |
| D-009 / 2026-10-10 | Capturer la cible du focus avant la désactivation du bouton et la conserver entre déchirure et révélation | K-010 reproduit dans Chromium : désactiver le bouton avant la capture tardive fait perdre le déclencheur. Cible en état React, transmise aux deux scènes, hook avec cible optionnelle ; même capture Live/Scène et focus OBS toujours désactivé. Pas de temporisation ni sélection du bouton par son texte. E2E existant inchangé : 2 échecs avant, 2 réussites après, écrans 9/9, typecheck/lint ciblé réussis. Correctif `4b9fcca`. |

| D-010 / 2026-10-10 | Visite Chromium locale pour avancer sur VIS-01, puis validation humaine sur téléphone réel | Choix explicite de l’utilisateur après blocage du preview protégé. Même code produit que le preview `2d933c9`, HEAD documentaire `66b78d5`. Visites, captures et gestes simulés prouvent les comportements observés ; elles ne prouvent ni l’accès au déploiement, ni la fluidité, le son ou l’haptique d’un vrai téléphone. Pas de changement d’hébergeur ou de recréation d’environnement. |

| D-011 / 2026-10-10 | Après consommation Scène, retour clavier au titre de sa section si le déclencheur ne reçoit plus le focus | Cible explicitement marquée, tabIndex=-1 : contexte conservé sans nouvel arrêt Tab ni réactivation du paquet consommé. Live continue de rendre le focus au bouton disponible. K-011 reproduit avant correction (2/2 échecs), puis Scène/Live bureau/téléphone 4/4 réussis ; code `d87b72c`. |

## Décisions héritées, retrouvées dans le dépôt

Les dates ci-dessous sont celles des sources/commits, pas des décisions
inventées par cet audit. Consulter les liens avant de réouvrir un sujet.

| ID / date source | Décision | Justification / source |
|---|---|---|
| H-001 / 2026-10-07 à 09 | Jeu en ligne ; tirage, points, jetons tenus par serveur ; dev sans cloud autorisé | Intégrité des échanges/classements. Règles miroir TS/SQL. Pas de repli silencieux en client cloud. [Périmètre](perimetre.md), [revue](revue-externe-2026-10.md), migrations `0019` à `0035`. |
| H-002 / 2026-10-08 | Quatre piliers Drop/Binder/Craft/Toi ; simulation de streameur retirée de l'interface | Direction produit, pas une dette à réactiver. Moteur et migrations conservés. [Ta chaîne](ta-chaine.md), [journal](historique-livraisons.md), roadmap historique. |
| H-003 / 2026-10-08 | Déplacements et navigation silencieux ; sons réservés aux actions | Préférence joueur et fatigue sonore. Interrupteur/volume existants ; [sons](assets-sonores.md) et tests d'écran/son. |
| H-004 / 2026-10-07 à 09 | Pas de Server Actions, secret de service dans l'APK, refonte relationnelle ou promesse 100 % en ligne | Export statique, transport Capacitor/web et intégrité. i18n/analytics différés, découpage dynamique mesuré puis refusé. [Périmètre](perimetre.md), [revue § 3](revue-externe-2026-10.md). |
| H-005 / 2026-10-09 | Sachet en image imprimée ; WebGL et slider retirés | Visibilité garantie et geste tactile de soudure ; les expériences WebGL précédentes ne représentent plus la direction active. Commits `135376c`, `27965c7`, `beadb63` ; `pack-tear.tsx`, images foil Live/Scène. |
| H-006 / 2026-10-09 | Microphone de diffusion gravé plutôt que chevron rejeté | Identité visuelle imprimée du paquet. Commits `57fafef`, `6996172`, images `public/packs/`. Ne pas réintroduire le motif refusé. |
| H-007 / 2026-10-09 | Fallback DIVERRON honnêtement nommé | Ne pas présenter le visuel de remplacement comme un portrait officiel ; commits `799a533`, `25970c1`, `diverron-fallback.svg`. |
| H-008 / 2026-10-10 | Ouverture et révélation dans une scène cinématique continue | Éviter une rupture de scène entre geste, cinq dos et faces ; commit `4955d9b`, CSS `booster-continuity.css`. L’appréciation physique de cette séquence est regroupée sous A dans la roadmap ; ne pas redemander les détails séparément. |

## D-012 — 10 octobre 2026 : sachet compact et ouverture au toucher

Demande explicite du joueur après capture mobile et vidéos Pokémon TCG Pocket :
réduire le sachet de l'écran noir et atteindre sa soudure à une main ; rendre
l'appui sur le sachet accueil effectif. Le sachet est désormais un bouton,
avec tirage vers le haut conservé et exclusion du clic après glissement.
Cette demande remplace pour l'appui immobile la préférence historique qui
exigeait un tirage ; la règle pure `pullVerdict` ne change pas et les gestes
retirés n'ouvrent rien. Le bouton sous la réserve reste disponible.

Le paquet a une taille indépendante des cartes, sa soudure est placée près du
milieu de l'écran, le tracé fonctionne dans les deux sens avec un seuil relatif.
Les dos rejoignent la taille/position de révélation pendant l'extraction.
Aucune reproduction d'assets Pokémon, refonte générale, règle de tirage ou
économie modifiée. L'ancien sachet presque plein écran est rejeté par le joueur.
Code `0beb6b37027ced0630ed828604754aed17f7ffb7` ; E2E ciblés 20/20, tactile simulé 4/4,
TypeScript/lint code 0. Approbation et ergonomie sur appareil réel encore ouvertes.

## D-013 — 10 octobre 2026 : petits viviers du Paquet Scène

Décision explicite du joueur : cinq créateurs différents d'une famille, jamais
Légendaires ; Scène pleine conserve 0,3 %, utilise cinq Épiques si possible,
sinon tous les Épiques disponibles et complète avec les raretés autorisées.
La garantie Rare/Épique reste au cinquième emplacement. Les tirages ordinaires
réservent le dernier candidat de cette garantie. Une famille avec moins de
cinq candidats non légendaires ou sans Rare/Épique est incompatible : exclue
du ciblage automatique et refusée explicitement par le moteur de tirage.

La décision corrige une impossibilité du moteur, sans changer de poids nominal,
récompense, coût ou seuil. Régressions synthétiques de 0 à 6 Épiques, garantie
unique Rare/Épique, épuisement ordinaire et frontière 3/1000 ; preuves et
limites du chemin Supabase dans [l'audit](audit-progression.md). Aucun déploiement.

L'audit utilise un RNG déterministe dans son seul processus, un fuseau imposé
et compare épargne / craft-et-jetons ; ne pas remplacer le RNG du jeu ni
conclure à un rééquilibrage sur ces seuls horaires et stratégies.

## D-014 — 10 octobre 2026 : parité SQL du Paquet Scène

Ajouter la migration additive `0043_scene_pack_eligibilite.sql` au lieu de
modifier `0016_sortants.sql`, déjà publié. Le serveur garde les poids déclarés
et le seuil 3/1000, exclut les Légendaires, sert les Épiques disponibles lors
de Scène pleine et réserve un candidat distinct pour le dernier slot. Une
famille de moins de cinq créateurs non légendaires ou sans Rare/Épique est
refusée. Le vérifieur exercera les cinq familles réelles à peu d’Épiques, les
deux branches déterministes et l’acceptation par `open_scene_pack()` sur une
base reconstruite. Aucun déploiement n’est autorisé par cette décision.

Preuve actuelle : tests Vitest ciblés 35/35, TypeScript et syntaxe Node OK.
`npm run supabase:verify` n’a pas pu démarrer PostgreSQL sous le compte
Administrateur Windows ; **aucune migration ni aucun contrôle d’intégration
SQL n’a été exécuté**. La parité reste non validée jusqu’à un run PostgreSQL
jetable réussi (local non administrateur ou CI Linux).

## Questions ouvertes

L'appréciation du dos → face, du halo, de l'éclat, du Perfect et des limites de
sélection reste à valider au pouce. Les anciens timings du dossier d'atelier ne
doivent pas remplacer les constantes actuelles. Aucune décision de réintroduire
le simulateur, publier en magasin ou refondre l'application n'est prise ici.

## Format d'une nouvelle décision

ID, date (Europe/Paris), agent/opérateur, demande et contexte, options examinées,
décision et pourquoi, conséquences/réversibilité, preuves (fichier/commit/test),
statut adopté/proposé/remplacé et lien vers l'entrée qui remplace la décision.

## D-015 — 10 octobre 2026 : volume et poids de l’ouverture

La demande est de rapprocher la sensation de l’ouverture d’un objet foil manipulé,
en gardant la direction artistique bordeaux et les créateurs CreatorDeck. Le
chantier est CSS/SVG uniquement, sans WebGL ni dépendance nouvelle. L’objet suit
le doigt seulement si Reflets des cartes et le mouvement ne sont pas désactivés.
Les flaps plient, une lumière traverse la fente, cinq dos sortent sous une seconde,
puis RevealOverlay s’ouvre selon le relais déjà en place. Le Rare reçoit un halo
bordeaux et un punch distincts des Communes ; aucun flash blanc ne lui est ajouté.

La déchirure gagne un glissement de hauteur plus long. Le silence Épique (520 ms),
le verrou Perfect (2,6 s), le bang calé sur le début du flip et le relais de
1,9 s restent inchangés. Pas de changement d’économie, de taux, de récompense ou
de backend. Adopté à la demande utilisateur ; validations et limites actuelles
sont consignées dans [la passation](agent-handoff.md).

## D-016 — 10 octobre 2026 : première collection et boucle post-ouverture

Le retour joueur décrit le classeur vide et l’absence de conclusion après
l’ouverture comme deux ruptures de la boucle de collection. Le Binder ouvre
maintenant sur « Obtenues » ; quand aucune carte n’est encore possédée, il
remplace les compteurs à zéro et la pagination par une invitation à ouvrir un
booster et un accès volontaire au catalogue. Le catalogue reste disponible,
mais n’est plus le premier écran. Les pages du catalogue affichent au plus
12 cartes.

Après les cinq révélations, l’écran présente les cartes du paquet, le nombre de
nouvelles et un bouton « Rouvrir un booster » qui relance réellement le tirage
si la réserve Live le permet. Sinon, le bouton revient au Drop. L’overlay OBS
garde son flux existant ; les sons de révélation, verrous et minutages ne
changent pas.

Le son et les reflets sont déjà actifs par défaut lorsqu’aucun choix local
n’est enregistré. Un choix explicite « OFF » reste respecté ; les reflets
restent coupés par `prefers-reduced-motion` sauf choix explicite prévu par le
réglage, tandis que les animations lourdes suivent toujours le garde-fou de
mouvement réduit. Aucun choix stocké n’est écrasé automatiquement. Décision
adoptée à partir du retour joueur ; tests et état de validation sont consignés
dans [la passation](agent-handoff.md) et [la roadmap](roadmap.md).

## D-017 — 10 octobre 2026 : objectifs précoces, Craft et identité

Le retour joueur pointe les premiers jours comme la période où l’Atelier, les
menus de réglages et les objectifs trop nombreux peuvent noyer la collection.
Le pilier Craft reste accessible, mais avant 10 copies recyclables il montre
seulement la progression `N / 10` et un retour au Drop ; les listes de 1000
créateurs et de recyclage ne s’affichent pas. À partir de 10, l’Atelier existant
reprend sans changement de règles.

Drop met en évidence une mission quotidienne déjà définie dans le moteur et
ouvre le panneau d’objectifs existant. Toi place en tête une vitrine locale des
trois meilleures cartes possédées (rareté, puis variante), avec l’état actuel
de la série ; aucune donnée n’est publiée sans le parcours cloud existant. Les
missions, leur économie et les récompenses restent inchangées. Décision adoptée
sur le retour joueur ; critères et limites dans la passation et la roadmap.

## D-018 — 10 octobre 2026 : version visible liée au commit Git

Le joueur doit pouvoir distinguer un ancien build d’un build récent sans
deviner le comportement de la mise à jour automatique. Le profil affiche donc
un identifiant court dérivé du SHA Git embarqué : Vercel/GitHub transmettent le
SHA du commit pendant la compilation, et le checkout local sert de repli pour
les builds locaux/Android. Aucun numéro n’est incrémenté à la main ; un build
sans dépôt Git affiche « locale ». Le SHA complet reste disponible dans
l’infobulle et aucun secret n’est exposé. La preuve de compilation et l’état de
publication sont consignés dans la passation.

**Complément du 14 octobre 2026 :** l’audit a trouvé l’utilitaire et le style,
mais aucun JSX qui les affichait ; cette intention n’était donc pas livrée à
l’écran. L’indicateur est maintenant rendu dans Toi → Réglages, sous la forme
« Version Android/Web · <7 caractères du commit> », avec le SHA complet au
survol. Il renseigne l’identité du code installé ; boosters de test et codes
réclamés restent des données cloud séparées.
Le rendu est publié au SHA `7e5ecbd2859ae734c772703b1e291650d18c5b1e` ; le
déploiement Vercel Production est `READY`. Une APK préexistante n’est pas mise
à jour par Vercel.


## D-019 — 11 octobre 2026 : reset global, tutoriel et cadeau de reprise

À la demande explicite de Malik, réinitialiser une seule fois la progression de tous les comptes, y compris le sien, pour le lancement du tutoriel. Préserver comptes, identités, profils, amis et historique des ventes/échanges terminés ; annuler les échanges en cours et retirer les annonces actives. Effacer collections, réserves/journaux de tirage, monnaies/ressources, missions/série, Paquet Scène et progression d’arène. Chaque compte pourra réclamer **cinq boosters** une fois, uniquement après le tutoriel ; le texte de cadeau attribue la décision à Malik. Le stock cadeau reste distinct de la réserve normale et le tirage passe par le moteur serveur existant. Le récapitulatif d’ouverture se ferme sur « Retour au Drop », sans CTA de réouverture directe.

Les règles de tirage et les récompenses existantes ne changent pas. L’implémentation doit être additive et testée sur PostgreSQL jetable ; aucune migration de production n’est comprise dans le travail de code. Avant une application réelle, vérifier le projet cible, le schéma, une sauvegarde et la possibilité de récupération. Au checkpoint du 11 octobre, cette décision est adoptée mais **aucune ligne de code de cette demande n’est encore implémentée**. Le scope détaillé et les critères de validation figurent dans la [roadmap](roadmap.md) et la [passation](agent-handoff.md).


## D-020 — 10 octobre 2026 : tutoriel avant le cadeau de reprise

Le reset global est one-shot, via migration additive, et garde comptes, profils,
amis et historiques terminés ; il annule les échanges ouverts et retire les
annonces actives. Le tutoriel précède l'accès au cadeau. Une table de cinq
ouvertures cadeau est séparée de la réserve de boosters ordinaire ; chaque appel
sert cinq cartes au moyen des fonctions serveur de tirage courantes, puis la
réserve cadeau diminue d'un. Le cadeau ne change ni le barème ni la récompense
des tirages ordinaires et n'accorde pas d'XP/points/jetons. Le récapitulatif
retourne au Drop.

Preuve locale du commit `f97ea42` (docs de checkpoint à part): 1 109 tests projet, 73 tests
écrans, SQL jetable avec reset/données préservées/idempotence/ordre/claim unique
et cinq ouvertures, typecheck/lint/build webpack réussis. Le build Turbopack est
bloqué par l'interdiction de bind un port dans le Cloud. Production et téléphone
réel non vérifiés ; le reset réel est interdit sans projet cible, schéma et
sauvegarde récupérable explicitement vérifiés.


## D-021 — 11 octobre 2026 : accès et préparation du reset réel

Malik autorise le reset réel après publication du code, avec vérification maintenue
de la cible, du schéma et d'une sauvegarde récupérable. L'accès Cloud effectif
refuse Supabase en CONNECT 403 et n'a aucun identifiant de gestion prêt. Le
brouillon réseau/secret est sauvegardé mais non publié. La voie directe par le
tableau de bord Supabase sur téléphone permet de commencer les vérifications
sans déplacer de secrets ou contourner le proxy. Aucune écriture réelle exécutée.

Le helper cadeau est isolé pour éviter de remplacer `_save_add_pack_cards`,
utilisé par les boosters ordinaires. Les tests vérifient la conservation exacte
de ce helper et l'absence de droits clients sur le nouveau helper cadeau.
Validation locale : 1 109 tests projet et SQL jetable réussis.

## D-022 — 11 octobre 2026 : claim cadeau rejouable après la première ouverture

En production, le premier appui réclame les cinq boosters puis en ouvre un.
Le client appelait encore `claim_return_gift()` aux appuis suivants ; la base
refusait « déjà réclamé » alors que quatre boosters restaient. Le claim garde
une seule transition de stock, mais un appel répété renvoie un succès sans
ajouter de boosters. Le statut serveur expose `gift_claimed` à partir de
`claimed_at`, et l'interface transforme ensuite l'action en ouverture directe
d'un booster cadeau. Ainsi les anciennes versions du client passent aussi la
barrière serveur après application de la migration. Le tirage cadeau et ses
poids restent inchangés. La migration 0045 a ensuite été appliquée et vérifiée ;
le contrôle réel de l’ouverture des cadeaux restants fait partie du retour E
regroupé dans la roadmap.

| D-023 / 2026-10-11 | Une réinitialisation individuelle rejoue le tutoriel, tout en préservant le cadeau unique | Demande de Malik : rejouer la séquence depuis le bouton reset. 0046 efface la fin du tutoriel du seul compte authentifié ; le client retire ses deux marqueurs et revient au Drop. Le stock cadeau et le claim restent intacts : reset n'accorde pas cinq nouveaux boosters et ne touche pas les autres comptes. Malik a confirmé le replay du tutoriel sur téléphone ; les cadeaux restants sont inclus dans le retour E de la roadmap. |

| D-024 / 2026-10-11 | Automatiser les nouvelles migrations via GitHub Actions après CI verte sur main, avec CLI officiel Supabase | Demande explicite utilisateur. Secret PostgreSQL réservé au workflow, cible projet/TLS/historique vérifiés, anciennes migrations figées et jamais rejouées. Mode automatic/manual appliqué et exercé ; run automatique `38163920425` confirme 0049 et ses objets. Aucun repair automatique. Vérifier les migrations futures selon cette même procédure ; Vercel reste indépendant. |

| D-025 / 2026-10-11 | Les tests navigation/tirage commencent avec un joueur ayant terminé le tutoriel | Corriger la fixture après ajout du tutoriel, sans clic forcé ni suppression du tutoriel produit. RPC onboarding simulé renvoie un état valide ; assertions de cartes serveur, absence de push et persistance inchangées. Scénarios tutoriel séparés dans les tests d'écran. |

## D-026 — 11 octobre 2026 : diagnostic PostgreSQL sûr et rapide

Le log fourni après changement du mot de passe reste générique, car le script efface tous les codes du pilote. Classer les erreurs de connexion par messages fixes (authentification, DNS, TCP, TLS, pooler, timeout), jamais par impression de message/detail brut. Tests de non-divulgation et erreurs agrégées. La cause production ne peut pas être déduite rétroactivement du message masqué.

Le dry_run manuel sur main courant fait uniquement les lectures existantes et peut donc précéder la CI complète ; le CLI de migration n’est pas installé dans ce mode. Déploiement automatique et validation manual restent conditionnés à une CI verte et à la bonne révision. Choix motivé par les attentes inutiles du propriétaire ; pas de désactivation TLS, de migration, de changement de secret ni de politique réseau.

## D-027 — 11 octobre 2026 : autorité TLS Supabase explicite

Le nouveau log GitHub établit SELF_SIGNED_CERT_IN_CHAIN avant authentification. Accepter le certificat CA PEM officiel via SUPABASE_DB_CA_CERT, conservant rejectUnauthorized=true et verify-full. Le même certificat sert au contrôle pg et au CLI (sslrootcert privé temporaire, supprimé dans finally). Sans CA fournie, la confiance système actuelle reste utilisée ; aucun bypass TLS. La documentation officielle indique Database Settings → SSL Configuration → Download Certificate. Connexion réelle non validée tant que le certificat n’est pas configuré et le dry_run réussi.

## D-028 — 11 octobre 2026 : certificat CA public intégré au dépôt

Malik fournit le fichier prod-ca-2021.crt téléchargé du tableau de bord après SELF_SIGNED_CERT_IN_CHAIN. La CA publique est versionnée dans supabase/certificates et chargée par défaut via un chemin relatif au script, ce qui évite une manipulation de secret sur téléphone. SUPABASE_DB_CA_CERT reste un override optionnel. Empreinte et expiration vérifiées et testées ; même CA Node/CLI avec vérification TLS/hôte. Une signature CA valide ne prouve pas le succès d’une connexion réelle ; prochain contrôle dry_run requis. Aucun nouveau secret ou bypass TLS.

## D-029 — 11 octobre 2026 : le Drop comme table de collectionneur

Demande explicite de Malik : refaire l’accueil avec une âme, puis améliorer le
Binder pendant son absence. Direction : fond sombre chaud, lettres condensées,
sachet réel et ticket crème où ouvrir ; les objectifs et activités viennent
après. Les dernières cartes deviennent consultables et donnent accès au Binder.
On conserve les visuels, le moteur et les quatre piliers existants : pas de
dépendance ou d’image inventée, pas de refonte générale. Le ticket regroupe la
réserve, le prochain réapprovisionnement et les garanties ; jetons/sabliers se
déplient sans déplacer l’action principale au milieu de liens secondaires.

Le Binder invite à finir une page déjà commencée, calculée à partir des saisons
et des slugs réellement configurés. Seule la page la plus proche est visible
par défaut ; les suivantes se déplient. Son bouton filtre les vrais manquants.
« Dernières reçues » retrouve les cartes possédées et le classeur vide retourne
au Drop. Doublons, compteurs, tri, pagination de 12 cartes et règles restent
ceux du moteur. 999/1 000 vaut 99 %, sans faux accomplissement.

Choix écartés : tableau de bord de panneaux identiques, carrousel automatique,
nouvelles récompenses pour compléter une page. La mise en page privilégie les
cartes et une action d’ouverture. Fiche récente rendue dans un portail hors de
l’app-shell pour éviter les conteneurs transformés ; focus piégé, retour au
déclencheur et bouton retour utilisent les hooks existants.

Preuves et commandes finales dans la passation ; captures et Chromium local
ne remplacent pas une validation esthétique et tactile sur téléphone réel.

## D-030 — 11 octobre 2026 : ne pas masquer l’action suivante du cadeau

Le scénario E2E tutoriel + cinq boosters, repris depuis le brouillon de session,
a montré que le toast vert « Cadeau réclamé » reste au-dessus du bouton
« Ouvrir un booster cadeau » après la révélation. Il répète le message/la quantité
que la boîte met déjà à jour et oblige à le fermer pour continuer. Retirer ce
toast de succès seulement ; conserver le message officiel du cadeau, le solde et
le toast des autres notifications. Aucun RPC/serveur/règle de jeu modifié.
Parcours Playwright avec RPC interceptées : 2/2 bureau et téléphone simulé,
réserve ordinaire intacte ; voir le checkpoint pour les autres contrôles.

## D-037 — 11 octobre 2026 : sablier visible et booster bonus 5/4

Après le retour de Malik sur l’écran Drop, le sablier ne doit plus être caché
dans un détail replié ni désactivé uniquement parce que la réserve ordinaire
est pleine. Le bouton est visible sous l’action d’ouverture ; garanties,
compteur légendaire et texte « réserve pleine » redondant sont retirés de cette
carte ; les jetons restent consultables dans une section repliée distincte.

Règle choisie par Malik : à 4/4, dépenser un sablier crée un booster bonus à
5/4. Un seul dépassement est admis ; un second sablier attend l’ouverture du
bonus. L’ouverture ramène à 4/4 et reprend la recharge ordinaire. Le moteur
local, la sauvegarde et le RPC restent alignés dans 0048. Celle-ci est `manual`.
Base jetable jusqu’à 0048, tests ciblés et CI sont décrits dans la passation.
Après l’autorisation permanente de Malik, le run manuel 38146774310 a appliqué
0048 seule ; cible CreatorDeck, TLS, historique et vérification après
application ont réussi. Le rendu réel sur téléphone et la version effectivement
servie restent à constater avant de qualifier l’expérience de livrée.

## D-038 — 11 octobre 2026 : autorisation permanente de publier les changements demandés

Malik demande de ne plus être interrompu pour redonner son accord aux commits
ciblés et pushes normaux sur `main` correspondant à ses demandes de code ou de
documentation, ni aux migrations Supabase nécessaires en production après CI
automatique verte. `AGENTS.md` porte cette autorisation permanente, pour réduire
les allers-retours ; les résultats et contrôles GitHub restent à observer et à
consigner après chaque publication/opération.

Cette autorisation ne vaut pas pour force-push, réécriture d’historique,
suppression de branche, fusion de PR ni modification destructrice des données.
Les migrations classées `manual` exigent le paramètre `approve_manual` et une CI
automatique verte ; cette autorisation permanente les couvre lorsqu’elles sont
nécessaires à la demande. La migration 0048 a été appliquée par 38146774310
après CI verte ; voir D-037. Restent hors autorisation : resets/réparations,
force-push, réécriture/suppression de branches et fusion de PR.


## D-039 — 11 octobre 2026 : audit produit P0/P1

Malik demande l’implémentation de son audit, en autorisant les changements de
périmètre produit concernés. Un pack tutoriel fixe permet d’essayer l’ouverture
avant compte ; ses cartes restent un aperçu, sans collection, récompense ni RPC.
La limite d’un essai par navigateur sert le parcours, pas une protection économique
(un stockage effacé permet de revoir un aperçu sans valeur). La connexion reste
nécessaire pour démarrer la collection serveur et accéder au cloud/social.
Les choix son/Reflets mémorisés sont conservés ; sans choix ils étaient déjà ON,
et les animations continuent de suivre prefers-reduced-motion et Reflets OFF.

Tribunal et objectif sont placés avant le sachet. Après un booster, l’objectif
priorise les cinq dossiers du Tribunal. Cette quatrième mission paie le même
sablier local que les missions existantes, une seule fois par journée ; les
points de la séance restent calculés et payés par le serveur. Aucun nouveau SQL
n’est nécessaire pour ce compteur JSON. Le bilan n’efface plus la cinquième
réaction, et le calcul d’annonce inclut désormais les cinq verdicts.

Taux/activités et Paquet Scène sont repliés. La vitrine de trois cartes, série,
faces CSS, flaps, cascade et hiérarchie de rareté déjà présentes sont conservées.
Ombre du sachet renforcée ; aucun WebGL ni modification des timings de silence,
Perfect et déchirure. Validation courante et limites dans la passation ; aucun
essai sur téléphone physique affirmé. P2 et K-031 restent hors de ce lot.

## D-040 — 11 octobre 2026 : séparer scroll de Drop et déchirure

Malik signale une ouverture involontaire en essayant de défiler. La zone entière
capturait le pointeur et le seuil vertical déclenchait l’ouverture. Décision :
retirer le tirage de l’accueil et autoriser le scroll/pincement natifs. Un appui
sur le sachet ou le CTA prépare la scène dédiée ; le clavier reste disponible.
Un mouvement de plus de 8 px ou pointercancel neutralise le clic tactile/souris
qui pourrait suivre sur le sachet. Aucun pointer capture ni preventDefault sur
Drop. Le geste de déchirure est conservé dans la scène, ses timings et Perfect
restent inchangés. Garder le tirage en réduisant sa zone a été écarté : cela
laisserait le même conflit lorsqu’un scroll commence sur le sachet. Preuves et
limites dans la passation ; validation physique du téléphone encore requise.

## D-041 — 11 octobre 2026 : petits objectifs de collection dans le Binder

Malik autorise à commencer par le Binder, avant Craft et identité du profil.
Les saisons existantes sont de grands objectifs ; les présenter en pages de
12 cartes maximum rend la prochaine étape atteignable et les manquantes lisibles.
Les vagues existantes sont regroupées par famille avant ce découpage d’affichage.
Le critère est le créateur unique possédé, indépendamment des copies/variantes.
Un créateur actuel appartient à une seule petite page ; les Sortants restent
consultables dans les vues existantes mais hors de ces objectifs actuels.

Une page commencée proche de la fin est suggérée ; un choix explicite prévaut
et est gardé sur cet appareil, par édition du catalogue. Il ne se synchronise
pas au compte et n’ajoute pas de champ à la sauvegarde. Les cartes affichées au
démarrage restent les Obtenues. Aucun gain ajouté, aucun palier de saison ni
règle serveur modifié ; ces pages sont des objectifs de collection visuels.
Le choix par jeu est écarté : les catégories changent, les familles par langue
existent déjà (seasons.ts). Preuves et limites dans la passation.

Malik demande aussi le mode économie : tests adaptés, documentation dans le
même commit, suites longues sur GitHub sans surveillance continue. L’agent
transmet des liens et des instructions compréhensibles ; état pending conservé
comme tel. Protections SQL/TLS/historique et autorisations existantes inchangées.

## D-042 — 11 octobre 2026 : rendre Craft compréhensible avant le seuil

Malik demande d’enchaîner sur Craft après le Binder. La progression existait,
mais le panneau ne montrait ni la future carte ni l’utilité des doublons.
Décision : conserver le seuil de dix copies recyclables et montrer trois aperçus
Standard manquants, coûts et écart au solde actuel, plus la valeur estimée du
recyclage groupé. Cette valeur suit duplicateGroups/unitValue existants et
exclut les Live, comme bulkRecyclableIds. La dernière copie reste protégée.

Priorité aux cartes artisanables de la collection Binder choisie, puis aux
moins coûteuses ; sans choix, réutiliser la suggestion de page commencée. Une
page déjà réunie ou sans manquante artisanable ne promet pas un achat ciblé :
le texte annonce les autres idées. Les aperçus montrent le résultat Standard,
ne sont pas des cartes possédées et ne déclenchent aucune dépense. Au-dessus
du seuil les actions existantes sont conservées. Aucun taux, coût, gain ou SQL
modifié. Accès Binder ajouté pour choisir la collection ; moteur/cloud inchangés.
Validation DOM/navigateur ciblée dans la passation, pas de validation physique.

## D-043 — 11 octobre 2026 : Scène doit refléter le serveur avant ouverture

Malik signale faux état disponible, déchirure fugace, refus répété et mise à
l’écart du paquet. Le statut RPC existe déjà, mais ses champs Scène étaient
ignorés. Décision : statut dédié au compte/jour, inconnu pendant vérification
ou panne, adoption du jour serveur en lecture et nouvelle vérification avant
toute déchirure. Réponses anciennes ignorées ; succès/refus déjà ouvert ferment
le bouton. Le refus normal devient une notice lisible. Aucun SQL ajouté, aucune
réinitialisation pour rendre un paquet disponible. Les protections serveur et
la règle un paquet par jour restent intactes. Section visible après Live et avant
les activités secondaires, rôle de complétion expliqué, aucun timing reveal changé.

## D-044 — 11 octobre 2026 : profil de collectionneur avec les données existantes

Pseudo et trois cartes sont au premier plan. Les cartes épinglées dans l’éditeur
public existant sont prioritaires si possédées, les meilleures cartes complètent
la vitrine ; le profil public conserve ses quatre emplacements. L’accès à la
personnalisation ouvre Compte. Pages réunies et Légendaires uniques sont calculées
sur la collection réelle, pas des récompenses nouvelles. Collection Binder
mémorisée/suggérée et série existante restent visibles ; état vide avec accès Drop.
Version technique descend près des crédits et menus sous l’identité. Pas de
nouvelle préférence concurrente avec la vitrine publique, pas de migration.
Preuves et limites dans la passation, suites GitHub en suivi selon mode économie.


## D-045 — 11 octobre 2026 : prérequis montrés dans le menu Toi

Arène indique les cinq cartes distinctes requises pour composer et la présence
d’au moins un créateur en direct au dépôt ; le compte est nécessaire aux
fonctions en ligne. Hôtel indique compte requis, nombre de doublons vendables et
solde de points. Les feuilles restent consultables même avant ces conditions,
pour expliquer le système sans écran mort. Valeurs dérivées de la collection et
des fonctions existantes (`sellableCards`, solde joueur) ; aucun seuil inventé,
aucun soft-lock ou migration ajouté. Vérification DOM ciblée 6/6, lint ciblé.


## D-046 — 11 octobre 2026 : récapitulatif des missions piloté par la liste

Le nombre de missions vient de la configuration ; le texte d’achèvement ne doit
pas coder « trois » quand le Tribunal a porté le total à quatre. La mission
Tribunal garde sa cible de cinq verdicts distincts et l’explique dans Progression.
Aucune règle/récompense changée. DOM ciblé 2/2, lint ciblé.


## D-047 — 11 octobre 2026 : accès direct aux recettes et reflets sans capteur

L’Atelier montre les recettes et coûts dès son ouverture ; chaque achat reste
bloqué par le coût réel en points ou jetons. Le reflet de carte suit le pointeur
et n’interroge aucun capteur d’orientation. Le Studio de tirages n’est pas
disponible dans le build joueur. Le geste de déchirure reste en CSS avec les
timings existants ; aucune règle économique ni SQL ne change.

## D-048 — 11 octobre 2026 : reprise cloud automatique

À la demande de Malik, lancer la synchronisation dès qu’un compte est retrouvé
ou connecté, avant de lire ses compteurs. Garder sur l’appareil une référence
par compte (version serveur et empreinte locale), pour envoyer les changements
locaux seuls et charger les changements cloud seuls sans détour par Compte.
Une copie au compteur de dépenses sablier périmé reprend la sauvegarde serveur
avant tout envoi ; le registre de dépenses reste l’autorité. Sans référence,
protéger les cartes locales absentes du cloud ; une vraie divergence ou une
action pendant la lecture conserve le choix explicite. Bloquer les envois
automatiques quand ce choix est en attente. La clé d’une dépense à réponse
perdue survit à la reprise. Tests du magasin, DOM et E2E à RPC simulées dans la
passation ; aucune fusion de ressources ou modification de règle de jeu.

## D-049 — 11 octobre 2026 : densité Drop/Binder, swipe de révélation et effets bornés

Réduire les états répétitifs sous l’ouverture à une note conditionnelle et
utiliser la notice existante pour expliquer le résultat du sablier. Garder la
collection conseillée et le choix des pages, en condensant le chrome pour
remonter la grille. Ajouter un balayage horizontal ou vers le haut uniquement
après `flippedCardId`, avec le bouton en repli ; Perfect/verrouillage restent
inchangés. Neutraliser l’inclinaison pendant le geste. Distinguer plus clairement
les groupes du menu Toi sans déplacer les fonctions.

Le sachet conserve son art imprimé et son geste existant. Le mouvement réduit
coupe le reflet infini avant ouverture ; les réglages Reflets et le retrait de la
scène continuent de couper les reflets actifs. Déchirure, flip, silence, Perfect
et relais 1,9 s inchangés. CSS de continuité scopé à `.booster-presentation` ;
contrôle des quatre feuilles : aucun sélecteur exact ni keyframe en double. Le
geste lent suit le doigt ; recul/relâchement à mi-course annule et « Ouvrir sans
déchirer » reste visible. Scan ciblé : 1 000 WebP décodés, seule source verte
`diverron.webp`, déjà remplacée à l’affichage par le fallback existant. Aucun
SQL, nouvelle monnaie, moteur ou règle de jeu. Adoptée à la demande du joueur ;
preuves et limites dans la passation courante.


## D-052 — 11 octobre 2026 : reflet borné et pity serveur après adoption

Le reflet du sachet partage la silhouette polygonale du SVG, effectue un seul
passage discret, et ne se relance pas pendant l’interaction, le reveal ou Perfect.
La pile de cartes passe devant le corps du sachet mais reste sous son rabat jusqu’à
la sortie. Après un tirage connecté, adopter le `pityCounter` calculé depuis le
journal serveur même quand le blob de sauvegarde renvoyé est en retard. Les heures,
le plafond, le tirage, la réserve et les autres règles restent inchangés.
SolaryHS et trois autres fichiers sont des avatars génériques malgré des chemins
valides : ne pas remplacer une identité par le portrait d’un autre créateur ;
remplacement réel suspendu à des sources d’image autorisées.

## D-060 — 12 octobre 2026 : conserver les avatars génériques sans photo

Instruction explicite de Malik : si un créateur n’a pas de photo de profil,
son avatar générique convient et ne constitue pas un problème. SolaryHS,
j0niq et toaststix sortent donc du plan de remplacement et K-044 est clos par
acceptation du choix visuel. Aucun portrait inventé ni nouvelle collecte
requise, aucune modification du code ou des images. La roadmap et le brief
Grok reflètent cette décision.

## D-061 — 12 octobre 2026 : une scène persistante pour l’ouverture

Malik impose le continuum avant le polish, sans Three.js/WebGL/Unity ni autre
moteur ou dépendance 3D. PackTear reste propriétaire du portail, du fond et du
focus jusqu’au récap/fermeture ; RevealOverlay est intégré comme enfant pour
les paquets manipulés. La fin d’extraction dépend d’animationend, avec filet
borné, et ne commande plus le remplacement du sachet par un nouvel écran.
La coque se retire visuellement en fondu après l’arrivée des cartes.

Le reflet appartient aux morceaux imprimés, masqués/découpés comme le sachet,
et suit le doigt sans cycle. La carte se déplace dans le plan après son flip ;
aucun inspecteur 3D libre. Les pauses de rareté, le Perfect, le bouton de secours,
les gains et RPC existants restent conservés. [Rapport et preuves](booster-continuum-2026-10-12.md).

## D-062 — 13 octobre 2026 : 3D autorisée uniquement pour le sachet ouvert

Malik clarifie que l'interdiction de 3D était une contrainte externe et autorise
Three.js pour l'ouverture. Cette demande remplace la restriction 3D de D-061,
sans abandonner sa continuité. Choix : un moteur Three.js chargé à la demande,
maillage léger du sachet, matériau physique et peel piloté par le glissé ; dos
et faces HTML existants conservés dans le même portail. Mouvement réduit,
effets coupés ou perte GPU utilisent le continuum 2D. Pas de moteur physique,
Unity, refonte des écrans, des règles ou de SQL. [Livrable, essais et limites](booster-3d-2026-10-13.md).

## D-063 — 13 octobre 2026 : 2D propre par défaut après retour téléphone

Malik juge le sachet GPU trop brillant et instable sur Vercel/téléphone. Priorité
à un parcours jouable : 3D désactivée par défaut, prévisualisation explicite
seulement, impression d'ouverture plus mate et aucune bande CSS ajoutée.
Le continuum et le swipe sont conservés. Fin d'extraction indépendante du
son/vibration, annulation d'animation et secours manuel couverts. Sortie
volontaire d'une attente réseau sans rejouer le tirage ni perdre les cartes
retournées ensuite. D-062 reste une autorisation de 3D, pas son activation par
défaut. [Diagnostic, preuves et limites](booster-clean-2026-10-13.md).

## D-064 — 13 octobre 2026 : vague visible sur le sachet et le peel (locale)

Malik demande une différence perceptible en dix secondes et exclut les menus.
Choix : impression d'ouverture contrastée, rabat directement piloté par la
progression du doigt, coque conservée à la première face et swipe rendu principal.
Les tailles ergonomiques initiales restent conservées. Pas de 3D GPU réactivée,
chrome ou nouvel effet perpétuel. Avant/après réels et vidéo de neuf secondes
servent de preuve ; l'avis du joueur reste à recueillir. [Rapport](booster-visible-2026-10-13.md).
Cette décision et le code sont locaux, non publiés, l'accès GitHub étant indisponible.


### Reprise de D-064 — 13 octobre 2026

L’indisponibilité GitHub ci-dessus concernait uniquement la session exportatrice.
Dans la nouvelle session, main distant est à la base annoncée, patch récupéré
sans conflit et tests adaptés rejoués ; code publié dans `93626653`, SHA distant
confirmé et CI de reprise en cours au relevé. Aucun nouveau choix visuel ni réactivation
GPU ; [publication et contrôles](reprise-zip-2026-10-13.md).

## D-070 — 13 octobre 2026 : répartir Playwright sans réduire la couverture

Le run `38397134313` durait 10 min 12 s ; Playwright seul occupait 8 min 42 s
avec un seul worker. Conserver ce worker pour éviter que `next dev` se batte
avec plusieurs onglets, et séparer ses deux projets bureau/téléphone en deux
jobs indépendants. Chaque shard reçoit 46 cas, les deux s’exécutent en parallèle,
aucun test n’est retiré. Deux partitions locales ont passé 41 tests chacune
(cinq scénarios cloud ignorés comme prévu) en 1 min 48 s et 2 min. Le run GitHub
`38400588529` a réussi les cinq jobs ; durée 2 min 31 s (shards de 2 min 12 s
et 2 min 25 s), contre 10 min 12 s avant, soit environ 75 % de moins sur cet
échantillon. Les pushes limités à Markdown/docs peuvent omettre la CI produit ;
les pull requests gardent les vérifications.

## D-071 — 13 octobre 2026 : préserver la provenance Live des cartes — clarifié

Malik veut garder l’information qu’une carte a été obtenue pendant un direct,
pour pouvoir proposer plus tard un design ou portrait alternatif. Le modèle a
déjà `variant: "live"` persisté ; le direct actuel vient d’une autre source,
`liveStream`, et expire quand l’état serveur devient périmé. Garder ces deux
notions distinctes. Le libellé provisoire « Live » a ensuite été remplacé par
« Obtenue en direct » / « Acquis live » dans D-073. Le badge de direct actuel
ouvre la chaîne Twitch via HTTPS selon D-074. Aucun changement du Binder ni du
schéma de données n’a été requis.
## D-095 — 14 octobre 2026 : scène visuelle du Drop

- Contexte : retour utilisateur sur la direction trop plate et le ticket trop
  proche d'un formulaire. L'objectif est une sensation de booster TCG, sans
  changer le gameplay ni le moteur d'ouverture.
- Décision : garder le sachet à `min(58vw, 220px, 34dvh)`, donner la
  perspective au conteneur parent sans filtre qui aplatit `preserve-3d`, rendre
  les faces latérales bordeaux/foil plus larges, ajouter un reflet doux en
  boucle de 5 s, une ombre elliptique et une vignette. Supprimer le texte
  tutoriel sous le pack, remonter le CTA et replier l'explication des jetons.
  Le mode tutoriel n'affiche que « Essayer » comme CTA principal.
- Alternatives refusées : rétrécir la pochette sur viewport bas, ajouter du
  WebGL/particules, modifier les règles ou l'audio.
- Preuve/limite : tests d'écrans 13/13, TypeScript, ESLint ciblé et
  `git diff --check` passent. Les deux scénarios Playwright téléphone
  s'arrêtent avant lancement faute de Chromium headless dans l'environnement;
  le rendu et l'épaisseur perçue des côtés ne sont pas confirmés. Correctif
  publié sur `main` (`47f5f4fa`), Vercel Production READY / contrôle `success`;
  validation visuelle mobile à 390 × 844 encore ouverte.
## D-134 — 16 octobre 2026 : renforcer le contraste de l’univers sélectionné

La revue ciblée Claude du sélecteur Drop a calculé un contraste de 4,17:1 pour
le texte blanc 13 px sur l’accent `#e8382c`, sous le seuil WCAG AA de 4,5:1.
Garder le texte blanc et assombrir uniquement le fond/bordure de la pill active
à `#d52820` (contraste calculé : 5,06:1). Les couleurs des autres actions, les
taux, le sachet et les autres piliers restent inchangés. Le contrôle local sur
le diff du SHA `7c069711` : écrans Drop/Binder 17/17, typecheck et diff-check
réussis. Le contraste est calculé selon la formule WCAG ; aucun outil d’audit
visuel, lecteur d’écran ni téléphone n’a été exécuté.
## D-135 — 17 octobre 2026 : garder la sélection visible en couleurs forcées

La revue ciblée Claude avait signalé que le contraste de couleur seul ne
garantit pas la distinction de la pill active lorsque le système impose une
palette (`forced-colors`). Ajouter un contour système `Highlight` autour de la
pill `aria-pressed="true"`, sans neutraliser les couleurs forcées ni modifier
les autres actions. Vérification isolée dans Edge avec `forcedColors: active` :
contour `solid 2px`, décalage `2px`, fond Highlight et texte HighlightText.
`npm run ecrans -- drop-binder` 17/17, typecheck, garde-jargon et
`git diff --check` réussis. Le scénario Playwright de l’application est ajouté
mais n’a pas démarré : le serveur Next préexistant occupe le port 3000 sans
répondre. Les règles du jeu et les autres piliers restent inchangés.

\n
