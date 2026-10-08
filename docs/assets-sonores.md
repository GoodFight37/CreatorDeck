# Les assets sonores

> **D'où viennent les bruitages du jeu, ce qu'il en utilise, et comment.** Les
> sons voyagent dans l'APK : la sélection est donc **courte et justifiée**, et
> `src/lib/sfx.test.ts` garde la main sur le budget.
>
> **Le pack d'origine n'est plus dans le dépôt** (8 octobre 2026) : après la
> sélection, `public/sound effects/` (400 fichiers, 87 Mo) a été **retiré** —
> c'est `public/sfx/` (15 fichiers, ≈1 Mo) qui est le livrable. Le tableau
> ci-dessous garde les **chemins du pack**, pour retrouver un son d'origine si un
> geste en réclame un nouveau.

## Ce que le jeu utilise

**15 bruitages**, copiés dans `public/sfx/` sous des noms d'URL simples (sans
espace ni accent — les packs d'origine ne sont pas nommés pour le web) :

| Bruitage | Fichier d'origine | Où il sert |
|---|---|---|
| `card-draw.wav` | `Card and Board/card_draw_1` | une carte se retourne (révélation), un paquet se déchire |
| `card-fan.wav` | `Card and Board/card_fan` | *en réserve* : faisait glisser une poignée de cartes |
| `card-turn.wav` | `Card and Board/card_fan_2` | une page du Binder se tourne — **le seul son de déplacement qui reste**, et il est voulu : on tourne un carton |
| `chip-place.wav` | `Card and Board/chips_place_1` | une carte qui claque (le « bang » d'une Épique ou mieux) |
| `click.wav` | `UI/click_double_on` | *en réserve* : le clic feutré des onglets — **plus joué** (voir « Se déplacer ne sonne pas ») |
| `select.wav` | `UI/select_1` | une sélection qui compte (un filtre du Binder, un cran de volume) |
| `menu-open.wav` | `UI/toggle_on` | *en réserve* : une feuille s'ouvrait — **plus joué** |
| `close.wav` | `Items/book_close` | le refus d'une carte (et, avant, la fermeture d'une feuille) |
| `pop.wav` | `UI/pop_1` | le booster s'ouvre |
| `coins.wav` | `Items/coin_jingle_small` | des pièces tombent (récompense de saison encaissée) |
| `gather.wav` | `Items/coins_gather_quick` | *en réserve* : ramassait un lot de jetons d'un coup |
| `equip.wav` | `Items/item_equip` | *en réserve* : l'équipement d'un palier de setup |
| `power-up.wav` | `Retro/power_up` | *en réserve* : un palier de notoriété franchi |
| `chime.wav` | `Musical Effects/8_bit_chime_positive` | une récompense tombe (palier réclamé, créateur rejoint) |
| `fanfare.wav` | `Musical Effects/brass_chime_positive` | *en réserve* : l'arrivée d'un raid |

> **Sept bruitages sont en réserve** (marqués ci-dessus) : cinq ont été choisis
> pour la simulation de streameur (**retirée de l'application le 8 octobre
> 2026**), et deux — `click`, `menu-open` — ont été mis de côté quand la
> navigation et les réglages sont devenus muets, le même jour. Ils restent dans
> `public/sfx/` et dans le catalogue : ils ne coûtent rien (moins de 400 Ko à eux
> sept), ils sont **réglés comme les autres**, et les retirer obligerait à refaire
> l'inventaire du pack le jour où un écran les redemanderait. Ce que la réserve
> change, c'est qu'ils ne sont **plus préchargés** au démarrage (`SFX_USUELS`) :
> rien ne se télécharge pour un son que personne n'entend.

## Se déplacer ne sonne pas (8 octobre 2026)

Deuxième retour du joueur, sur les sons : « enlève le son quand on clique sur des
onglets ou des paramètres ». La règle est maintenant nette, et elle vaut pour
toute l'application :

> **Le son accompagne ce qu'on fait, pas où l'on va.**

Ce qui est **muet** : les quatre onglets de la barre du bas, toutes les portes qui
mènent à un écran ou à une feuille (Objectifs, Atelier, Mon compte, Taux de drop,
Thème du classeur), l'ouverture et la fermeture de **toutes** les feuilles,
l'interrupteur *Son*, les trois crans de **Volume**, l'interrupteur *Reflets des
cartes*, la ligne *Crédits*, et le carnet qui ouvre l'écran visé.

Ce qui **sonne** encore, et seulement ça : ouvrir un booster (le geste de
déchirure, puis le pop), une carte qui se révèle (le papier **plus** la gamme de
sa rareté), le « bang » d'une Épique ou mieux, le refus d'une carte, une
récompense encaissée (les pièces), une page du Binder qu'on tourne, et un filtre
qu'on change.

C'est vérifié **pour de vrai**, pas par intention : le banc d'écrans instrumente
l'audio (chaque oscillateur et chaque bruitage joué passe par un compteur), et
`src/ecrans-sons.test.tsx` parcourt les quatre onglets, ouvre et referme les trois
feuilles de l'écran *Toi*, puis constate que **zéro son** a été déclenché — avec,
juste après, un test de contrôle qui ouvre un booster et vérifie que le compteur,
lui, bouge.

## Les vibrations : le son qu'on sent (8 octobre 2026)

L'haptique du jeu vit dans `src/lib/haptics.ts` — une fonction, `buzz()`, qui
appelle `navigator.vibrate` quand l'appareil veut bien. **Les motifs, eux, sont
purs** et vivent avec la mécanique qui les décide (`src/lib/reveal.ts`), donc ils
se relisent sans téléphone.

Où le téléphone vibre, et **une seule fois par geste** :

| Geste | Motif | Ce que ça dit |
|---|---|---|
| Le tirage du booster **arme** (le doigt a franchi le seuil : 88 px, ou 80 px en moins de 200 ms) | `TEAR_HAPTIC` — 16 ms | « c'est prêt, lâche » |
| Une carte se révèle | `revealHaptic(rareté, variante)` — plus long à mesure qu'on monte | la rareté, avant de la lire |
| Une révélation **Perfect** | `PERFECT_HAPTIC` | le tirage rare par excellence |
| On insiste sur une carte refusée | `resistHaptic()` | « non » |

Le tirage ne vibre **pas à chaque pixel** : le motif part au franchissement du
seuil, une fois. Un doigt qui redescend sous le seuil puis le repasse est un
**nouveau** franchissement, donc une nouvelle vibration — c'est la bonne lecture.

Trois silences volontaires, les mêmes que pour le son : pas d'API (iOS, ou un
aperçu de bureau) → rien ne se passe, sans erreur ; un navigateur qui refuse
l'appel (permission, onglet en arrière-plan) → l'exception est avalée ; et
**l'interrupteur *Son* coupe aussi les vibrations** — un joueur qui coupe le son
dans le métro ne veut pas que son téléphone bourdonne.

C'est **compté**, comme le reste : le banc d'écrans remplace `navigator.vibrate`
par un enregistreur (`src/ecrans.setup.ts`) et `src/ecrans-tactile.test.tsx`
vérifie qu'un tirage de trois mouvements après le seuil ne produit **qu'une**
vibration, et qu'aucune ne part quand le son est coupé.

Et le **reflet des cartes Holo/Gold suit le doigt** (`--px`/`--py` écrits en
direct sur le `.card-foil`, sans re-rendu React) : ce banc-là le prouve aussi,
y compris que le réglage *Reflets des cartes* éteint l'effet entier.

## Le volume : mesuré, pas réglé au doigt mouillé

C'est la correction du 8 octobre 2026, et elle vient d'un constat du joueur :
« les sons sont trop forts et pas forcément en rapport avec ce que je clique ».
Les deux moitiés du problème avaient la même cause — **les fichiers**. Ils
viennent de six dossiers d'un même pack et sont tous livrés à leur maximum
(crête à 0 dBFS), puis étaient joués avec un gain écrit à la main :

| Bruitage | RMS du fichier | Gain écrit | Ce qui sortait |
|---|---|---|---|
| `card-draw` | −15,6 dB | 0,50 | **−21,6 dB** — le papier d'une carte, joué à chaque révélation |
| `pop` | −15,8 dB | 0,38 | −24,2 dB |
| `click` | −22,8 dB | 0,30 | −33,3 dB |

Neuf décibels entre le papier d'une carte et un clic d'onglet : le son le plus
fort du jeu était celui qu'on entendait **le plus souvent**. Deux règles le
corrigent, et elles vivent maintenant dans `src/data/sfx-niveaux.json` :

1. **Chaque fichier est mesuré** (RMS et crête, en dBFS) par
   `npm run sfx:niveaux`, et reçoit une **cible de volume perçu** : le clic, qu'on
   entend cent fois, se tient à −32 dB ; les gestes du quotidien à −30 ; le
   papier et le paquet à −29 ; ce qui se gagne (pièces, carillon, fanfare) à
   −28. **Ce qu'on entend le plus est le plus discret** — l'écart de quatre
   décibels suffit à distinguer une récompense sans monter le volume.
2. **Le gain se calcule** (`sampleGain`) : le chemin entre la mesure et la
   cible, **borné par la crête** — aucun bruitage ne dépasse −6 dBFS à la
   sortie, même les plus percussifs. `src/lib/sfx.test.ts` relit les vrais .wav
   et vérifie que chaque bruitage tombe bien sur sa cible : remplacer un fichier
   par un autre niveau casse le test, pas l'oreille du joueur.

Et par-dessus, **un seul volume pour tout** : les bruitages, la synthèse et les
effets de la révélation passent par le même nœud de sortie (`masterBus`), donc
trois crans — **Discret, Normal, Fort** — suffisent à baisser l'application
entière (voir « Toi » → *Réglages* → *Volume*, sous l'interrupteur *Son*).
L'interrupteur, lui, coupe tout ; les deux réglages se mémorisent.

Le **plan de notes synthétisé** reste par-dessus pour ce qu'un bruitage ne sait
pas dire : la **rareté** d'une carte (l'accord qui monte, la note en plus pour
une variante spéciale) et le **bang** après le silence d'une Épique.

## La licence

Les fichiers viennent du **« 400 Sounds Pack » de Chequered Ink**
(`https://ci.itch.io/400-sounds-pack`, téléchargement libre, +400 sons répartis
en 14 familles — ce sont exactement les dossiers de `public/sound effects/`).

> « You may use these game assets for ANY and ALL uses including commercial use,
> with or without giving credit, except that you may not sell or redistribute the
> unaltered assets as your own game assets. »

Autrement dit : **usage commercial libre, crédit non obligatoire, revente des
fichiers bruts interdite**. Le crédit est donné quand même, à l'écran
(« Toi » → *Crédits*) et ici. C'est cette dernière clause qui impose la forme
retenue : on embarque une **sélection de 15 fichiers** dans le jeu (usage
normal), on ne redistribue pas le pack — le dossier brut (400 fichiers, 87 Mo,
`public/sound effects/` avant le 8 octobre 2026) n'est **pas** un livrable du
jeu, et la sélection seule part dans l'APK (≈1 Mo). Il a donc été **retiré du
dépôt** : le pack reste téléchargeable chez son auteur, et cette page dit
exactement quels fichiers en viennent.

## Pourquoi une sélection, et pas les packs entiers

Le dossier d'origine pesait **87 Mo** et 400 fichiers. L'APK, lui, embarque tout
`public/` : y verser le pack entier coûterait plus cher que tous les portraits
du catalogue réunis, pour des sons de combat, de pas et de vaisselle qu'un jeu
de cartes n'utilise jamais. D'où la règle :

1. **on choisit un bruitage pour un geste**, pas l'inverse ;
2. on le copie sous un nom d'URL propre dans `public/sfx/` ;
3. `src/lib/sfx.test.ts` vérifie l'en-tête RIFF/WAVE, la durée (entre 50 ms et
   2,5 s : un bruitage de geste, pas une musique) et le **budget total**
   (moins de 3 Mo).

Ajouter un bruitage, c'est donc trois lignes : le `cp`, une entrée dans
`SAMPLES` (`src/lib/sfx.ts`), et une fonction de geste qui l'appelle.

## Les sons qu'on n'a pas pris

| Famille | Pourquoi |
|---|---|
| `Combat and Gore`, `Weapons`, `Human` | aucun geste du jeu ne frappe, ne blesse ou ne crie |
| `Footsteps` | on ne se déplace pas |
| `Environment` (11 Mo) | ambiances longues : le studio a ses néons et sa musique intérieure, pas de pluie |
| `Musical Effects` (111 fichiers, 38 Mo) | on n'a gardé que deux carillons ; le reste est de la musique de fond qu'on n'a pas demandée |
| `Machines`, `Materials` | utiles plus tard (un bruit de déchirure de paquet synthétisé, par exemple) |
