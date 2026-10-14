# Décisions CreatorDeck

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
47 réussis, 1 scénario cloud conditionnel ignoré ; CI GitHub `38569239104` en
cours au relevé. Aucun essai sur téléphone physique.

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
