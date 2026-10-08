# Les assets graphiques

> **Ce que contient `public/streamer/` et ce que le jeu en utilise.** Les images
> ne sont pas toutes exploitables sur le web (il y a des modèles 3D et des kits
> faits pour d'autres moteurs) : ce fichier dit lesquelles servent, où, et sous
> quelle licence. Il sert aussi de carte pour qui reprend le dépôt.

## Ce que le jeu utilise aujourd'hui

| Où | Quoi | Licence |
|---|---|---|
| **La pièce du Studio** (`src/data/studio-room.json`) | **Kenney — Furniture Kit, dossier `Isometric/`** : sol, murs, mobilier, panneaux acoustiques | **CC0** (`public/streamer/4/License.txt`) |

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
| `Super Pixel Effects Gigapack (Free Version)` | Effets animés (éclairs, explosions…) en suites de PNG | Possible, pas utilisé |
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

## Voir la pièce sans navigateur

`src/lib/studio-room.ts` étant pur, un script de composition hors ligne
(ImageMagick + un décodeur PNG minimal) reproduit exactement la même géométrie :
c'est ainsi que les coordonnées de `studio-room.json` ont été verrouillées, et
c'est la seule preuve visuelle disponible quand l'environnement de travail n'a
pas de navigateur. Les tests, eux, lisent les vrais fichiers (en-tête PNG et
canal alpha de la palette).
