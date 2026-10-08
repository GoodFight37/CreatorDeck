# Les assets graphiques

> **Ce que contient `public/streamer/` et ce que le jeu en utilise.** Les images
> ne sont pas toutes exploitables sur le web (il y a des modèles 3D et des kits
> faits pour d'autres moteurs) : ce fichier dit lesquelles servent, où, et sous
> quelle licence. Il sert aussi de carte pour qui reprend le dépôt.

## Ce que le jeu utilise aujourd'hui

| Où | Quoi | Licence |
|---|---|---|
| **La pièce du Studio** (`src/data/studio-room.json`) | **Kenney — Furniture Kit, dossier `Isometric/`** : sol, murs (**dont les deux fenêtres**), mobilier, panneaux acoustiques | **CC0** (`public/streamer/4/License.txt`) |

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

## Les deux fenêtres, et pourquoi elles ne sont pas un décor de plus

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

## Ce que contient `public/streamer/`

| Dossier | Contenu | Exploitable en web ? |
|---|---|---|
| `1/` | Une salle en **FBX** (+ textures) | **Non** : format de moteur 3D, rien ne le charge ici |
| `2/` | ~150 PNG **pixel-art isométrique** (palette ARCHIMEDES 64 / lumeish), planche `all_furniture.png` | Oui — utilisé nulle part pour l'instant |
| `3/` | « Isometric Bedroom » pastel : `Individuals/` (lit, bureau, chaise, armoire × 4 directions, fenêtre, tableaux, plante) et `Bedroom_Total.png` | Oui — non utilisé |
| `4/` | **Kenney Furniture Kit** : `Isometric/` (140 meubles × 4 orientations), `Side/` (vues de face), `Models/` (GLB/FBX), `Preview.png`, `Sample.png` | **Oui — c'est la pièce du Studio** |
| `5/` | Modèles **GLB/FBX** (meubles) | Non (3D), lisible seulement par un moteur |
| `DEMO_Cozy_UI_Pack_doboui` | UI « cozy » : boutons, cartes, hotbar | Possible, pas utilisé (l'interface est maison) |
| `Pixel Crawler - Free Pack` | Personnages pixel-art | Possible, pas utilisé |
| `Super Pixel Effects Gigapack (Free Version)` | Effets animés (éclairs, explosions, fumées, symboles) en suites de PNG | **Oui — c'est le pack des effets** (voir plus bas) |
| `KayKit_*` | Décors et personnages (Adventurers, Furniture Bits, Skeletons) | Possible, pas utilisé |
| `interior free` | Intérieur low-poly | À inspecter |
| `Farm RPG FREE 16x16` | Tuiles 16×16 | Possible, pas utilisé |

Les tailles sont telles que le clone est lourd (≈ 100 Mo) : c'est **le prix des
assets**, et ils partent dans l'APK via `public/`.

## Ce que la pièce n'utilise pas (et pourquoi)

* **Les modèles 3D** (`1/`, `5/`, `4/Models/`) : l'écran est en DOM, pas en
  WebGL. Passer à la 3D serait un autre chantier — et un budget de performance
  qu'un téléphone d'entrée de gamme ne tiendrait pas pour un décor fixe.
* **Le pixel-art** (`2/`, `3/`, `Pixel Crawler`) : c'est une autre direction
  artistique que le kit isométrique lisse. S'en servir demanderait de tout
  reprendre en pixel-art, pas d'en poser une pièce au milieu.
* **Les packs d'interface** (`DEMO_Cozy_UI_Pack_doboui`) : l'interface du jeu a
  son propre système de tokens (`src/app/globals.css`) et ses propres badges.
  Y mêler des boutons dessinés casserait la cohérence des cinq onglets.

## Les effets de moment rare, et la couronne de l'Arène

Le pack d'effets fournit des **suites d'images** (une animation = quinze PNG). Le
jeu n'en embarque que ce qu'il affiche, recopié dans **`public/fx/`** : trois
**planches** (toutes les images d'une animation sur une seule ligne, découpées
en CSS par `steps()` — une requête, zéro JavaScript par image) et une couronne.

| Fichier | Contenu | D'où il vient |
|---|---|---|
| `public/fx/explosion.png` | 15 images de 192 px — l'explosion dorée | `PNG/Explosions/epic_explosion_002/epic_explosion_002_large_yellow` |
| `public/fx/eclat.png` | 13 images de 128 px — l'éclat orange | `PNG/Explosions/epic_explosion_001/epic_explosion_001_large_orange` |
| `public/fx/fumee.png` | 21 images de 64 px — la fumée blanche | `PNG/Smoke Bursts/directional_smoke_burst_001/directional_smoke_burst_001_large_white` |
| `public/fx/couronne.png` | 1 image de 64 x 48 — l'emblème d'Arène | `PNG/Symbols/symbol_crown_001/symbol_crown_001_large_yellow` (image 19) |

(Les chemins de la dernière colonne sont ceux de
`Super Pixel Effects Gigapack (Free Version)/`, juste sous `public/streamer/`.)
Le total pèse **44 Ko**, quand le dossier d'origine en pèse des dizaines de
mégaoctets : les planches sont **générées** (`montage` d'ImageMagick, puis
recadrage et compression), et `src/lib/fx.test.ts` lit l'en-tête de chaque PNG
pour vérifier que la largeur annoncée vaut bien `images × image` — une planche
recoupée de travers décale toute l'animation, et ça ne se voit qu'en jouant.
La pose de la couronne, elle, est calculée sur la pièce
(`src/lib/studio-emblem.ts`) : elle est **posée sur la face du haut de
l'étagère**, pas collée à des coordonnées écrites à la main.

> **Pour le nettoyage des assets :** `public/fx/` et `public/sfx/` ne sont **pas**
> les dossiers d'origine — ils sont à garder tels quels, même quand
> `public/streamer/Super Pixel Effects Gigapack (Free Version)/` sera supprimé.

## Voir la pièce sans navigateur

`src/lib/studio-room.ts` étant pur, un script de composition hors ligne
(ImageMagick + un décodeur PNG minimal) reproduit exactement la même géométrie :
c'est ainsi que les coordonnées de `studio-room.json` ont été verrouillées, et
c'est la seule preuve visuelle disponible quand l'environnement de travail n'a
pas de navigateur. Les tests, eux, lisent les vrais fichiers (en-tête PNG et
canal alpha de la palette).
