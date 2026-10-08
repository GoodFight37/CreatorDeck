# Les assets graphiques

> **L'histoire de `public/streamer/`, et ce que le jeu en a fait.** Les images
> n'étaient pas toutes exploitables sur le web (modèles 3D, kits faits pour
> d'autres moteurs) : ce fichier dit ce qui a servi, où, sous quelle licence —
> puis ce qui est parti, en deux vagues, et pourquoi. Il sert de carte pour qui
> reprend le dépôt.

## Le dossier est vide, et c'est décidé (8 octobre 2026, le soir)

Le **kit Kenney** était son dernier habitant : `4/Isometric/`, 2,7 Mo et
560 fichiers, qui composaient la pièce du Studio. La pièce visuelle a été
retirée dans la soirée du 8 octobre 2026 — l'onglet, le décor, l'emblème
d'Arène, l'arrivée des paliers en fumée — et le kit est parti **avec elle** :
plus rien ne le référençait, ni le code, ni les tests, ni la feuille de style.
`public/` est donc passé de 23 Mo à **20 Mo**, et il ne contient plus que ce qui
se joue : les portraits (19 Mo), les bruitages (1 Mo), les deux planches
d'effets (32 Ko) et l'icône.

Pour le récupérer, il est dans l'historique Git, comme tout le reste de cette
page : `git checkout 6050cb2 -- public/streamer`. La licence est **CC0** : elle
n'a jamais demandé de le garder, et elle ne demande rien non plus pour l'avoir
retiré.

## Comment la pièce s'en servait (pour mémoire)

| Où | Quoi | Licence |
|---|---|---|
| **La pièce du Studio** (`src/data/studio-room.json`, retiré) | **Kenney — Furniture Kit, dossier `Isometric/`** : sol, murs (**dont les deux fenêtres**), mobilier, panneaux acoustiques | **CC0** (`public/streamer/4/License.txt`) |

Le kit Kenney « Isometric Miniature » est livré en PNG **indexés** (palette +
transparence) et se compose sur une **grille isométrique** :

* une **cellule** fait `104 x 76` pixels ; `iso(cell)` donne son centre ;
* une **tuile de sol pleine** (`floorFull_SE`) fait `208 x 152` : elle couvre
  2 x 2 cellules et se pose par son **centre** ;
* chaque sprite a un **point d'appui** (le bas du dessin) : c'est par lui qu'il
  touche la scène — le pied d'une lampe sur le sol, le bas d'un mur sur une
  arête de la pièce, la base d'un panneau sur le mur ;
* l'ordre du peintre se lit sur `layer`, puis du fond vers l'avant (`depth`).

Tout le calcul vit dans `src/lib/studio-room.ts`, et
`src/lib/studio-room.test.ts` **ouvre les fichiers PNG** pour vérifier que la
taille annoncée est la taille réelle, que le point d'appui tombe sur du dessin,
et que chaque palier de setup fait bien entrer un objet dans la pièce. Une image
remplacée par une autre casse le test, pas la pièce.

## Les deux fenêtres, et pourquoi elles n'étaient pas un décor de plus

Le kit fournit chaque mur en **deux versions** : pleine, et percée d'une fenêtre
(`wall_SE` / `wallWindow_SE`). Les deux se posent **au même point, avec le même
appui** — c'est la même face, une fois avec une ouverture. La fenêtre est donc
posée **exactement sur** le mur de sa cellule, jamais devant : elle le recouvre
au pixel près, et un test le vérifie (`studio-room.test.ts`, « pose les fenêtres
exactement sur le mur qu'elles remplacent »). Ce test a d'ailleurs attrapé la
première version, qui posait la fenêtre au centre de la cellule au lieu de
l'arête : elle ressortait du mur d'un demi-tile.

Elles ont aussi leur propre filtre CSS (`.chaine-sprite.fenetre`) : les murs du
studio sont assombris et bleutés, les fenêtres non — et quand l'éclairage est
acheté, ce sont elles qui s'allument le plus. C'est la seule lumière **froide**
de la pièce, et elle dit qu'il fait jour dehors.

## Ce qu'il contenait : un seul dossier

**`4/Isometric/`** — le **Kenney Furniture Kit** (140 meubles × 4 orientations,
PNG indexés, CC0) et son `License.txt`. La pièce en utilisait **une trentaine**
(`src/data/studio-room.json`), le reste attendait un meuble qui manquerait.
Tout est parti le 8 octobre 2026 au soir, kit et licence compris.

## Pourquoi le reste a été retiré (8 octobre 2026)

Le dépôt a longtemps porté **tout ce que le joueur avait fourni** — 209 Mo,
10 800 fichiers — dont 186 Mo que **aucune ligne de code** n'ouvrait. Après les
trois volets du « jus » (qui n'ajoutaient aucun asset), le dossier a été nettoyé :
ce qui n'est pas utilisé n'a pas à peser dans un clone, dans un APK, ni dans une
revue.

| Dossier retiré | Poids | Ce que c'était |
|---|---|---|
| `public/sound effects/` | 87 Mo | le « 400 Sounds Pack » brut, dont les 15 bruits du jeu sont extraits ([`assets-sonores.md`](assets-sonores.md)) |
| `Streamer/KayKit_Adventurers_2.0_FREE` | 23 Mo | décors et personnages 3D |
| `Super Pixel Effects Gigapack (Free Version)` | 28 Mo | le pack d'effets, dont **quatre images** sont gardées dans `public/fx/` |
| `KayKit_Skeletons_1.1_FREE` | 17 Mo | personnages 3D |
| `4/Models/` | 17 Mo | les versions GLB/FBX des meubles (l'écran est en DOM, jamais en WebGL) |
| `KayKit_Furniture_Bits_1.0_FREE` | 7,1 Mo | mobilier 3D |
| `Pixel Crawler - Free Pack` | 3,9 Mo | personnages pixel-art |
| `1/`, `5/`, `FBX/` | 4 Mo | salles et meubles 3D |
| `4/Side/`, `Preview.png`, `Sample.png`, les `.url` | 800 Ko | vues de face et vignettes du kit, jamais affichées |
| `2/`, `3/`, `DEMO_Cozy_UI_Pack_doboui` | 1,3 Mo | deux autres directions artistiques (pixel-art, UI dessinée) |
| `interior free`, `Farm RPG FREE 16x16` | 90 Ko | deux packs jamais ouverts |

Aucun de ces dossiers n'était référencé par le code, les tests, les scripts ou la
feuille de style (vérifié avant de retirer) : les seules mentions restantes sont
**cette page**. Ils restent dans l'**historique Git** si un jour il faut y
reprendre quelque chose.

**Deuxième vague, le même soir** : le kit `4/Isometric/` lui-même (2,7 Mo,
560 fichiers) et son `License.txt` sont partis avec la pièce visuelle du Studio
— cette fois parce que le jeu ne les référençait **plus**, la pièce ayant été
retirée. Même règle, même endroit : l'historique. Le fichier `src/data/studio-room.json`
(ses coordonnées) et `src/lib/studio-room.ts` (ses calculs) sont partis en même
temps qu'ils ne décrivaient plus rien.

## Ce que la pièce n'utilise pas, et pourquoi

* **Les modèles 3D** (les packs KayKit, `4/Models/`) : l'écran est en DOM, pas en
  WebGL. Passer à la 3D serait un autre chantier — et un budget de performance
  qu'un téléphone d'entrée de gamme ne tiendrait pas pour un décor fixe ;
* **le pixel-art** (le dossier `2/`, « Isometric Bedroom », Pixel Crawler) :
  c'est une autre direction artistique que le kit isométrique lisse. S'en servir
  demanderait de tout reprendre en pixel-art, pas d'en poser une pièce au milieu ;
* **les packs d'interface** (`DEMO_Cozy_UI_Pack_doboui`) : l'interface du jeu a
  son propre système de tokens (`src/app/globals.css`) et ses propres badges.
  Y mêler des boutons dessinés casserait la cohérence des onglets.

## Les effets de moment rare, et la couronne de l'Arène

Le pack d'effets fournit des **suites d'images** (une animation = quinze PNG). Le
jeu n'en embarque que ce qu'il affiche, recopié dans **`public/fx/`** : deux
**planches** (toutes les images d'une animation sur une seule ligne, découpées
en CSS par `steps()` — une requête, zéro JavaScript par image).

| Fichier | Contenu | D'où il vient |
|---|---|---|
| `public/fx/explosion.png` | 15 images de 192 px — l'explosion dorée | `PNG/Explosions/epic_explosion_002/epic_explosion_002_large_yellow` |
| `public/fx/eclat.png` | 13 images de 128 px — l'éclat orange | `PNG/Explosions/epic_explosion_001/epic_explosion_001_large_orange` |

Deux autres fichiers sont partis le 8 octobre 2026 au soir, avec la pièce :
`fumee.png` (21 images de 64 px, la bouffée qui marquait l'arrivée d'un palier)
et `couronne.png` (64 x 48, l'emblème posé sur l'étagère). Leurs lignes du
tableau ci-dessus disaient exactement d'où elles venaient
(`PNG/Smoke Bursts/directional_smoke_burst_001`,
`PNG/Symbols/symbol_crown_001`) : c'est là qu'il faut retourner les chercher si
la pièce revient.

(Les chemins sont ceux du pack d'origine, sous `public/streamer/` — il a été
retiré après extraction, voir plus haut.)
Le total pèse **32 Ko**, quand le dossier d'origine en pèse des dizaines de
mégaoctets : les planches sont **générées** (`montage` d'ImageMagick, puis
recadrage et compression), et `src/lib/fx.test.ts` lit l'en-tête de chaque PNG
pour vérifier que la largeur annoncée vaut bien `images × image` — une planche
recoupée de travers décale toute l'animation, et ça ne se voit qu'en jouant. Le
même test veille sur l'inventaire : `public/fx/` ne contient **que** ces deux
planches, parce qu'un fichier oublié là ne se chargerait jamais mais pèserait
dans l'APK.

> **Crédit demandé par la licence du pack d'effets** (il n'est pas CC0, lui) :
> « Super Pixel Effects Gigapack — Will Tice / unTied Games ». La licence autorise
> l'usage commercial et l'embarquement dans un jeu, interdit la revente des
> fichiers bruts, et demande cette ligne quelque part dans le produit ou sa
> documentation. **Elle est aux deux endroits** : ici, et **dans le jeu**, sous
> « Toi » → *Crédits* (`src/lib/credits.ts`, `src/components/credits.tsx`) — le
> même écran nomme aussi Chequered Ink (les bruits), Twitch (les portraits),
> Lucide (les icônes) et les deux polices d'écriture. La ligne de Kenney, elle,
> est partie avec le kit : un crédit pour un fichier qui n'est plus dans le jeu
> serait un mensonge poli.

> **À ne pas confondre :** `public/fx/` et `public/sfx/` ne sont **pas** des
> dossiers d'origine — ce sont les **livrables** du jeu (planches d'effets et
> bruitages choisis). Le nettoyage du 8 octobre 2026 a retiré les packs, jamais
> ceux-là.

## Voir la pièce sans navigateur (historique)

`src/lib/studio-room.ts` était pur : un script de composition hors ligne
(ImageMagick + un décodeur PNG minimal) reproduisait exactement la même
géométrie, et c'est ainsi que les coordonnées de `studio-room.json` avaient été
verrouillées — la seule preuve visuelle possible dans un environnement de travail
sans navigateur. Le module et le fichier sont partis le 8 octobre 2026 au soir ;
cette note reste parce que la méthode, elle, marchera encore si une scène
revient.
