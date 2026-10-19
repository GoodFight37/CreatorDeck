---
name: CreatorDeck
description: Jeu de collection de cartes de créateurs, téléphone d'abord, sur fond noir de plateau de diffusion.
colors:
  bg-deep: "#08080a"
  bg: "#0d0d10"
  bg-soft: "#131317"
  panel: "#17171c"
  panel-2: "#1c1c22"
  panel-3: "#26262e"
  text: "#f2eee6"
  muted: "#9a958c"
  muted-2: "#6d6963"
  line: "rgba(255, 255, 255, 0.08)"
  line-strong: "rgba(255, 255, 255, 0.14)"
  accent: "#e8382c"
  accent-light: "#ff7a6b"
  accent-soft: "#ff9d90"
  accent-tint: "#ffd0c9"
  accent-deep: "#a81f16"
  accent-dark: "#6d1710"
  accent-night: "#3d120e"
  paper: "#f3eee2"
  ink: "#14110e"
  gold: "#ffbe55"
  green: "#50d9a0"
  danger: "#ff6d82"
  rarity-common: "#8d95a7"
  rarity-uncommon: "#43d69c"
  rarity-rare: "#40a9ff"
  rarity-epic: "#a46cff"
  rarity-legendary: "#ffbd45"
  scene-night: "#080810"
  scene-bordeaux-glow: "rgba(152, 49, 88, 0.21)"
  scene-plum-glow: "rgba(62, 26, 75, 0.22)"
  pack-edge-bordeaux: "#8a2447"
  pack-pile-bordeaux: "#3b1b22"
typography:
  display:
    fontFamily: "Barlow Condensed, IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px, 8vw, 40px)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Barlow Condensed, IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
  title:
    fontFamily: "Barlow Condensed, IBM Plex Sans Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "0.01em"
  body:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  body-lead:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  label:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 800
    letterSpacing: "0.16em"
  caption:
    fontFamily: "IBM Plex Sans Variable, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  print: "2px"
  button: "4px"
  chip: "10px"
  panel: "16px"
  nav: "24px"
  pill: "999px"
  card: "4.5% / 3.2%"
spacing:
  view-x: "18px"
  view-top: "20px"
  section: "27px"
  touch-min: "44px"
  shell-max: "560px"
components:
  button-primary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.button}"
    height: "56px"
    width: "100%"
  button-primary-ready:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    height: "56px"
  button-primary-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.button}"
    padding: "0 12px"
    height: "41px"
  search-field:
    backgroundColor: "rgba(255, 255, 255, 0.02)"
    textColor: "{colors.muted}"
    rounded: "{rounded.button}"
    padding: "0 12px"
    height: "44px"
  chip-status:
    backgroundColor: "rgb(232 56 44 / 0.1)"
    textColor: "{colors.accent-tint}"
    rounded: "{rounded.chip}"
    padding: "0 10px"
    height: "32px"
  nav-item-active:
    backgroundColor: "rgb(232 56 44 / 0.17)"
    textColor: "#ffffff"
    rounded: "19px"
    height: "52px"
---

# Design System: CreatorDeck

<!-- Relevé de l'existant, 19 octobre 2026. Sources : src/app/globals.css (tokens :root),
     src/app/layout.tsx (polices), src/app/stage.css, src/app/drop-binder.css,
     src/app/booster-continuity.css, src/components/booster-carousel.css,
     src/components/drop-craft.css, src/lib/catalog.ts (RARITY_META).
     Rien n'a été rendu à l'écran pour ce relevé : tout vient de la lecture du code. -->

## Overview

**Creative North Star : « Le plateau de diffusion »**

Le système se décrit lui-même dans ses commentaires : « l'écran est un plateau de diffusion. Un seul moment fort (le pack, éclairé par la chaîne préférée du joueur), tout le reste est calme, dense et tactile » (`stage.css`). Sur ce plateau, deux matières et un seul accent : le **carton** (le noir chaud du studio, le papier des boutons, les pochettes du classeur) et le **direct** (le rouge des overlays de live, « réservé à ce qui est vivant : le booster prêt, un badge LIVE, une action ») (`globals.css`).

L'application est une colonne de téléphone (560 px au plus), toujours sombre (`colorScheme: "dark"`), où la typographie condensée des tickers sport porte les titres et un sans-serif neutre et un peu mécanique porte tout le reste. La couleur ne vient pas du chrome : elle vient des cartes (rareté et matière), du visage flouté de la chaîne préférée qui éclaire le haut du Drop (« la couleur vient du streameur ; le fond reste noir »), et de la scène bordeaux du booster.

Le chrome (fond, panneaux, texte, boutons) est indépendant du thème équipé. Les thèmes de collection ne réécrivent `--accent*` que sur le conteneur du classeur et de ses cartes (`src/lib/cosmetics.ts`).

**Key Characteristics:**
- Noir chaud en couches tonales (`bg-deep` → `panel-3`), filets blancs à 8 % et 14 %.
- Un seul accent rouge, `#e8382c`, et ses déclinaisons claires et sombres.
- Papier crème (`paper`) et encre (`ink`) pour les surfaces pleines claires.
- Barlow Condensed en capitales pour les titres, les noms et les compteurs ; IBM Plex Sans pour le texte.
- Cartes au format d'impression TCG (0,715), où la rareté est le cadre.
- Mouvement rare et coupé sous `prefers-reduced-motion`.
- Cibles tactiles d'au moins 44 px.

## Colors

Un noir chaud en couches, un rouge de direct, un papier crème, et des couleurs de sens (or, vert, rose d'alerte, raretés) qui restent hors thème.

### Primary
- **Rouge du direct** (`accent`) : le booster prêt, le bouton de révélation suivante, l'onglet actif de la barre du bas, le point du bandeau « live », la jauge de niveau. Le commentaire du bouton principal le dit : « Booster disponible : c'est le seul endroit rouge de l'écran. »
- **Rouge clair** (`accent-light`) : texte d'accent sur fond sombre (eyebrows, compteurs de monnaie, bandeau live, minuteries) et anneau de focus global (`outline: 2px solid`).
- **Rouge doux** (`accent-soft`) : icônes actives de la navigation et anneaux de focus de la scène.
- **Rouge pâle** (`accent-tint`) : texte des pastilles de statut (saison, série, complétion) et du texte rassurant de l'écran de panne.
- **Rouge profond, sombre, nuit** (`accent-deep`, `accent-dark`, `accent-night`) : départ du dégradé d'emballage `.pack-artwork`, minuterie sur le ticket papier, icônes de garantie.
- Les variantes `--accent-rgb`, `--accent-light-rgb`, `--accent-dark-rgb` servent aux transparences (`rgb(var(--accent-rgb) / .1)` pour les fonds de pastille, `/ .2` à `/ .35` pour leurs bordures).

### Secondary
- **Papier** (`paper`) et **Encre** (`ink`) : le bouton principal au repos (« du papier posé sur le noir, pas un dégradé »), les nameplates et les dos de carte, le titre du Drop en mode non épuré, le premier bouton de l'état vide du Binder.

### Tertiary
- **Or** (`gold`) : déclaré « n'existe que pour une chose : la légendaire ». Il sert aussi, dans le code actuel, au score de collection du Binder, au bonus de réserve de l'accueil épuré, au compteur de sabliers et à la mention « pas encore possédée » dans le moment live (voir Do's and Don'ts).
- **Vert** (`green`) : l'icône de garantie. **Rose d'alerte** (`danger`) : erreurs.
- **Raretés** (`rarity-*`, source unique `RARITY_META` dans `src/lib/catalog.ts`, posée en `--rarity` et `--rarity-glow` par le composant carte) : Commune gris acier, Peu commune vert menthe, Rare bleu, Épique violet, Légendaire ambre. Chaque rareté porte aussi un halo `glow` en rgba de la même teinte, de 0,34 à 0,58 d'opacité.

### Neutral
- **Noir de studio** (`bg-deep`) : fond de `html`, `body` et du dos des cartes.
- **Noir de coque** (`bg`) : fond de la colonne `.app-shell` et des écrans pleins.
- **Noirs de panneau** (`bg-soft`, `panel`, `panel-2`, `panel-3`) : surfaces de plus en plus claires (pastille de niveau, sélecteurs, onglet actif, fin de dégradé d'emballage).
- **Texte** (`text`), **Gris secondaire** (`muted`), **Gris tertiaire** (`muted-2`) : trois niveaux de texte ; `muted-2` pour les indices, placeholders et détails techniques.
- **Filet** (`line`) et **Filet fort** (`line-strong`) : séparateurs, bordures de panneaux et de boutons secondaires.

### La scène bordeaux du Drop

Le Drop et l'ouverture du booster ont leur propre lumière, bordeaux et prune sur un noir bleuté (`scene-night`). Ces valeurs sont écrites en dur dans les feuilles de scène, hors du bloc `:root` :

- **Fond de présentation du booster** (`booster-continuity.css`, `--scene-background` de `.booster-presentation`, réutilisé par `.reveal-overlay.reveal-game`) : une ellipse bordeaux (`scene-bordeaux-glow`) centrée à 48 % de hauteur, une ellipse prune plus large (`scene-plum-glow`) à 62 %, sur `scene-night`. La variante `.scene-scene` remplace ces deux lumières par du violet (`rgba(126, 80, 204, .25)` et `rgba(52, 35, 106, .25)`).
- **Tranches 3D du sachet** (`drop-binder.css`, `.pack-3d-side-*`) : dégradés bordeaux et rose poudré, de `#220b18` et `#290d1c` aux bords sombres jusqu'à `#f2a1ad` et `#f4c7ad` dans les reflets, en passant par `#b75470`, `#a44162`, `pack-edge-bordeaux` et `#6d1a3b`.
- **Ombre portée du sachet** : noir à 90 % au centre, frangé de `rgba(125, 20, 55, .3)`.
- **Pile de réserve** (`stage.css`, `.pack-pile-back`) : dos de paquets en dégradé `pack-pile-bordeaux` → `#160a0e` → `#09070a`, rayés à 3,5 % de blanc. Pour l'univers Mèmes, la pile passe à un olive sombre (`#2b2a12` → `#11100a`).
- **Lumière de plateau** (`.stage-halo`) : le portrait de la chaîne préférée, flouté (14 px), saturé à 1,5 et masqué vers le bas ; elle teinte le haut de l'accueil avec les couleurs du streameur, pas avec le bordeaux.

`drop-binder.css` déclare aussi un fond bordeaux radial pour `.home-view .pack-stage` (`rgba(112,20,53,.34)` et `rgba(146,49,84,.12)`). Dans le carrousel actuel, la règle plus spécifique de `stage.css` (`.home-view .booster-selector .pack-stage.stage-live.booster-carousel { background: none }`) l'annule : sur l'accueil, le bordeaux vit dans le sachet, son ombre et sa pile, pas dans le fond.

### Named Rules
**La règle du seul rouge.** Le rouge est réservé à ce qui est vivant : booster prêt, badge LIVE, action. Le chrome reste noir et papier.

**La règle du chrome fixe.** Le fond, les panneaux, le texte et les boutons ne dépendent jamais du thème équipé ; les thèmes ne teintent que le classeur et ses cartes.

**La règle de la carte sans interface.** La carte ne porte aucune couleur d'interface, ni accent ni violet : elle a sa propre palette (rareté et matière), ce qui la fait ressortir sur le noir.

## Typography

**Display Font:** Barlow Condensed (500, 600, 700), avec IBM Plex Sans Variable puis la pile système en repli
**Body Font:** IBM Plex Sans Variable (axe de graisse), avec `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`
**Label/Mono Font:** pas de famille dédiée ; `ui-monospace, SFMono-Regular, Menlo, monospace` seulement pour les détails techniques de l'écran de panne

**Character:** « la condensation des tickers sport, pas le grotesque de SaaS » pour la display ; un texte « neutre, un peu mécanique, avec de vraies graisses moyennes (400/500/600) » (`layout.tsx`). Les deux familles sont embarquées par `@fontsource` : aucun CDN, l'APK les affiche hors ligne.

### Hierarchy
L'échelle déclarée dans `:root` : `--t-caption` 12 px, `--t-small` 13 px, `--t-body` 14 px, `--t-lead` 16 px, `--t-title` 28 px, `--t-display` 40 px.

- **Display** (Barlow Condensed 700, `clamp(28px, 8vw, 40px)`, interligne 0,98, `-0.01em`, capitales) : titres de page (`.welcome-row h1`, `.page-title-row h1`). Le titre du Drop non épuré monte à `clamp(38px, 10vw, 50px)` en 600 ; le nom révélé d'une carte à `min(11vw, 60px)` en 700. Le mot-symbole `.wordmark` : 34 px, 700, `0.04em`, capitales.
- **Headline** (Barlow Condensed 600, 22 à 30 px, capitales) : libellé du bouton principal (22 px, `0.04em`), titre de l'écran de panne (30 px), titre de pack (30 px, 700), titres du Binder et de l'Atelier (30 px).
- **Title** (Barlow Condensed 600, 20 px, `0.01em`, capitales) : titres de section (`.section-heading h2`). Dans l'accueil épuré et ses rangées, les titres de section passent en IBM Plex Sans 600 à 17 px, sans capitales.
- **Body** (IBM Plex Sans 400, 14 px) : texte courant, champs, boutons secondaires (500). Le texte de rassurance de la panne : 14 px, interligne 1,55. Les lignes de menu : 16 px.
- **Label** (IBM Plex Sans 700 à 800, 12 à 13 px, `0.12em` à `0.18em`, capitales) : eyebrows (13 px, 800, `0.16em`, `accent-light`), mentions de pack et d'édition. Le libellé « live » du bandeau est en Barlow Condensed 600, 15 px, `.12em`.
- **Caption** (IBM Plex Sans, 12 px) : notes, indices de geste, détails.
- Les chiffres qui changent (minuteries, compteurs) utilisent `font-variant-numeric: tabular-nums`.

### Named Rules
**La règle des 12 px.** « Rien sous 12 px. Un nom de streameur se lit à bout de bras, un libellé ne se chuchote pas. » (`globals.css`). Exceptions présentes dans le code : sous-libellés de la pastille de niveau (8 px) et des monnaies (9 px), étiquette « live » du cercle (10,5 px), quelques mentions à 11 px.

**La règle du bouton de jeu.** Le libellé du bouton principal est en display condensée et en capitales : « c'est un bouton de jeu, pas un CTA de landing ».

## Layout

- **Colonne de téléphone.** `.app-shell` fait 100 % de large, 560 px au plus, centré, avec un filet latéral à 3,5 % de blanc et une ombre de 70 px. Elle utilise `overflow: clip` (pas `hidden`) pour que la barre du haut et la recherche du classeur restent `sticky`. Au-delà de 900 px, l'accueil épuré reste une colonne de 560 px centrée.
- **Marges de vue.** `.view` : `20px 18px 26px`. Les sections s'espacent de 27 à 28 px (`.section-block`, `.drop-findings`). Les rangées défilantes (cercle, trouvailles, outils du Binder) débordent de 16 à 18 px de chaque côté pour aller jusqu'au bord de l'écran.
- **Barre du haut.** `sticky`, 68 px au moins, fond `bg-deep` à 91 % avec flou de 18 px, filet bas `line`, et marge de zone sûre en haut.
- **Barre du bas.** Quatre colonnes, une par pilier (Drop, Binder, Craft, Toi). Dans la scène actuelle, c'est une barre flottante de `min(100vw - 24px, 420px)`, à 10 px du bas plus la zone sûre, 62 px de haut. Le contenu réserve `112px + env(safe-area-inset-bottom)` en bas.
- **Rythme.** Pas d'échelle d'espacement en tokens : les écarts relevés vont de 4 à 15 px entre éléments (6, 7, 8, 9, 10, 12 px reviennent le plus), 14 à 17 px de padding interne de panneau.
- **Zones tactiles.** « Tout ce qui se touche fait au moins 44 px de haut » (`stage.css`) : boutons, `summary`, pastilles de filtre, pagination.
- **Scène plein écran.** L'ouverture du booster et la révélation partagent une géométrie : `--scene-height: max(100dvh, 520px)`, carte de `min(74vw, 370px, …)` au ratio 0,715, centre à 46 % de la hauteur, sachet de `min(72vw, 320px, 38dvh)` centré à 58 %. Sur l'accueil, le sachet du carrousel fait `min(78vw, 320px, calc(52dvh / 1.4667))`.
- **Petits écrans.** Règles dédiées sous 700 px et sous 620 px de haut (sur 430 px de large au plus) : le sachet et les marges de scène rétrécissent, les cibles gardent 44 px.

## Elevation & Depth

Système hybride : la profondeur du chrome vient surtout des couches tonales (`bg-deep` → `panel-3`) et des filets ; les ombres sont réservées aux objets (sachet, cartes, barre flottante) et aux états actifs. Le verre dépoli (`backdrop-filter: blur`) marque les barres fixes.

### Shadow Vocabulary
- **Coque** (`box-shadow: 0 0 70px rgba(0, 0, 0, 0.55)`) : détache la colonne de 560 px du fond sur grand écran.
- **Barre flottante** (`box-shadow: 0 18px 44px rgb(0 0 0 / .55), inset 0 1px rgb(255 255 255 / .07)`) avec `backdrop-filter: blur(24px) saturate(1.5)`.
- **Onglet actif** (`box-shadow: 0 4px 13px rgba(0, 0, 0, 0.25), inset 0 0 0 1px rgb(var(--accent-light-rgb) / 0.15)`) : sélecteur à onglets.
- **Carte** (`box-shadow: 0 1px 0 rgba(255,255,255,.07) inset, 0 0 0 1px rgba(0,0,0,.85), 0 14px 26px -16px rgba(0,0,0,.95)`) : bord d'impression et ombre courte et dure.
- **Emballage** (`box-shadow: 0 30px 45px -20px rgba(0,0,0,.9), 0 0 45px rgb(var(--accent-rgb) / .25), inset 0 0 0 2px rgba(255,255,255,.06)`) : le seul objet à porter un halo rouge.
- **Ombre au sol du sachet** (`.pack-shadow`) : ellipse floutée (12 à 13 px) sous le paquet, noire, frangée de bordeaux sur le Drop.
- **Halo de direct** (`box-shadow: 0 0 9px rgb(var(--accent-rgb) / .85)`) sur le point « live ».
- **Panneau en relief** (`box-shadow: 0 10px 30px rgb(0 0 0 / .35)`) : le moment « en direct dans ton cercle ».

### Named Rules
**La règle de l'objet seul.** « Plus de halo radial derrière le booster : l'objet se tient tout seul. » Le sachet s'appuie sur son ombre au sol, pas sur un fond lumineux.

## Shapes

Deux langages de forme coexistent dans le code actuel :

- **Le carton imprimé** (angles presque vifs) : bouton principal et bouton secondaire à 4 px, champs de recherche et de tri à 4 px, éléments du Binder et de l'état vide à 2 ou 3 px. Les cartes : `border-radius: 4.5% / 3.2%`, proportionnel au format.
- **Le plateau tactile** (arrondis doux) : pastilles de statut et de monnaie à 10 px, onglets à 9 et 13 px, panneaux à 14 à 18 px, barre flottante à 24 px et ses boutons à 19 px, pastilles de filtre, pagination, bouton de mise à jour et actions de la scène en `999px`.

Formes récurrentes : portraits ronds avec anneau en `conic-gradient` (rangée « Ton cercle »), portraits d'emballage en arche (`48px 48px 12px 12px`), cadre de carte imprimé en `::after` dont l'épaisseur passe de 2 à 3 px pour l'Épique et la Légendaire.

## Components

### Buttons
Du papier ou du rouge, jamais de dégradé dans la version de base (`globals.css`).
- **Shape :** angles presque vifs (4 px).
- **Primary (`.primary-action`) :** papier sur encre, pleine largeur, 56 px de haut au moins, Barlow Condensed 600 à 22 px, capitales, `0.04em`.
- **Ready (`.primary-action.is-ready`, `.reveal-next`) :** fond `accent`, texte `paper`.
- **Active :** `scale(0.985)` ; transitions de 150 ms sur transform, opacité, fond et couleur.
- **Disabled :** fond transparent, texte `muted`, curseur interdit.
- **Secondary (`.secondary-action`) :** transparent, filet `line-strong`, 41 px, IBM Plex Sans 500 à 14 px. Désactivé : opacité 0,38.
- **Focus :** `outline: 2px solid var(--accent-light)` décalé de 2 px pour tous les boutons et champs.
- **Variantes de scène encore déclarées :** `stage.css` définit pour `.is-lean .primary-action` une pilule (`999px`) en dégradé `#ff6a52 → #e8382c → #b0201a` avec reflet animé, et `drop-binder.css` un bouton bordeaux (`#a52c54 → #60142e`) pour `.home-view .primary-action`. Le Drop actuel ne rend plus de `.primary-action` (le sachet est le bouton) : ces deux variantes n'ont pas de cible visible relevée dans `drop-view.tsx`.

### Chips
- **Statut (`.season-badge`, `.streak-pill`, `.completion-pill`) :** fond accent à 10 %, bordure accent à 18 %, texte `accent-tint`, 10 px d'arrondi, 13 px en 700.
- **Monnaie (`.currency-chip`) :** 31 px, accent à 10 % ; variante chaude en ambre (`#ffd17f` sur `rgba(255,190,85,.08)`).
- **Filtres du Binder et de l'Atelier :** pilules de 44 px, `line` sur blanc à 4 %, texte `muted` ; état actif en dégradé `#ff6a52 → #c0281d` avec texte blanc. Hors de ces écrans, `.filter-chips button` est un onglet souligné (2 px de bordure basse).
- **Sélecteur d'univers sur le Drop :** deux mots en capitales à 12 px, sans fond ; l'état actif est blanc et souligné (`inset 0 -2px #fff`). Une règle `forced-colors` existe pour la variante pilule de `booster-carousel.css`.

### Cards / Containers
- **Panneaux :** 14 à 16 px d'arrondi, filet `line`, fond blanc à 2,5 à 3,5 % ou `panel-2`, 13 à 14 px de padding.
- **État vide :** filet pointillé `accent-light` à 22 %, fond accent à 4,5 %.
- **Shadow Strategy :** aucune ombre au repos sur les panneaux ; voir Elevation & Depth.

### Inputs / Fields
- **Recherche et tri :** 44 px (46 px dans le Binder et l'Atelier), filet `line`, fond blanc à 2 % (5 % dans le Binder), 4 px d'arrondi (14 px dans le Binder et l'Atelier). Placeholder en `muted-2`.
- **Focus :** anneau global `accent-light` ; dans le Binder et l'Atelier, la bordure du champ passe à `accent-soft` (`:focus-within`).

### Navigation
- **Barre du bas :** quatre piliers à icône et libellé, 52 px par bouton. Actif : fond accent à 17 %, texte blanc, icône `accent-soft` avec halo rouge (`drop-shadow(0 0 7px …)`). Transitions de 180 ms.
- **Barre du haut :** mot-symbole et saison à gauche (saison sur deux lignes au plus, 190 px), compteurs à droite.
- **Pagination :** boutons ronds de 44 px ; libellé masqué sous 520 px de large mais conservé pour le lecteur d'écran.

### La carte créateur (signature)
« Une planche TCG, pas une vignette » (`globals.css`) : portrait plein cadre au ratio 0,715 ; la rareté est le cadre (filet, épaisseur, reflet) ; une nameplate opaque en bas, nom en display condensée ; la variante est une matière (foil qui suit le doigt, led qui pulse, chrome). Le portrait est assombri en haut et en bas pour porter le rang, la pastille Live et la nameplate. Sans photo, un placeholder affiche jusqu'à deux initiales dans un cercle teinté de la rareté.

### Le bandeau du direct (signature)
Un « lower third » de régie sous le titre d'accueil : un point rouge qui pulse (3,2 s), le mot en Barlow Condensed, les chiffres en `tabular-nums`, entre deux filets, sans fond ni arrondi.

### Le sachet et sa scène (signature)
Sur le Drop (D-153), un interrupteur centré choisit Live ou Mèmes au-dessus du sachet ; sous lui, un bouton rouge « Ouvrir · 5 cartes » (ou, en recharge, « Prochain booster », le compte à rebours et une jauge rouge de 3 px) donne l'état du booster, puis la réserve en une ligne et les chaînes du joueur. L'en-tête fait 52 px, opaque : marque à 20 px, porte-monnaie en pilule (sabliers, points), niveau en pilule « Niv. N ». Le sachet actif reste le bouton accessible : il penche en perspective (`rotateY(-7deg) rotateX(4deg)`), flotte au repos (4,8 s, ±4 px, ±3° en Y, ±1,5° en X, reflet de 4 s) pendant que son ombre de contact et son ombre ambiante s'étalent et pâlissent au même rythme, et se presse à `scale(.97)` en 100 ms (`cubic-bezier(0.23, 1, 0.32, 1)`). La scène ne rogne que sur les côtés (`overflow-x: clip`), pour que l'ombre ne soit pas coupée en bas. Il repose sur la pile de ses dos bordeaux. Le sachet voisin reste visible en retrait (échelle 0,62, opacité 0,5, luminosité 0,6), décoratif. À l'ouverture, la scène plein écran bordeaux prend le relais et la carte révélée garde la taille de la carte extraite. Une carte nouvelle déclenche un flash de la couleur de sa rareté et porte l'étiquette NOUVELLE ; une carte déjà possédée garde la même taille et porte l'étiquette DOUBLON (contour gris, même emplacement). Un doublon commun ou peu commun saute le retournement et rejoint la pile ; rare, épique et légendaire gardent leur scène.

## Do's and Don'ts

### Do:
- **Do** prendre toute couleur d'interface dans le bloc `:root` de `globals.css` (« aucune couleur d'interface en dur ailleurs que dans ce bloc »).
- **Do** réserver `accent` à ce qui est vivant : booster prêt, LIVE, action.
- **Do** laisser la rareté venir de `RARITY_META` : une seule source, posée en `--rarity` par le composant.
- **Do** composer les titres, noms et compteurs en Barlow Condensed capitales, et tout le reste en IBM Plex Sans.
- **Do** donner au moins 44 px de haut à tout ce qui se touche, et un `:focus-visible` visible.
- **Do** couper chaque animation en boucle sous `prefers-reduced-motion: reduce` (le code le fait pour le halo, le reflet, le point live, l'anneau tournant, le carrousel, le flash de révélation) et respecter `[data-card-fx="off"]`.
- **Do** tenir compte des zones sûres (`env(safe-area-inset-*)`) en haut, en bas et dans la scène.

### Don't:
- **Don't** faire dépendre le chrome (fond, panneaux, texte, boutons) du thème équipé.
- **Don't** mettre une couleur d'interface (accent, violet) sur une carte.
- **Don't** descendre sous 12 px pour un texte à lire.
- **Don't** remettre un halo radial derrière le booster : l'objet se tient seul.
- **Don't** bloquer le pincement (`maximumScale: 1`) : le viewport le laisse volontairement.

### Écarts relevés entre les règles et le code
Relevé factuel, sans correction appliquée :
- Couleurs écrites en dur hors de `:root` : dégradés et rouges de `stage.css` (`#ff6a52`, `#e8382c`, `#b0201a`, `#c0281d`, `#ff4d5e`, `#e23347`, `#ff2d43`, `#9146ff`), `#d52820` dans `booster-carousel.css`, toute la scène bordeaux de `drop-binder.css`, `booster-continuity.css` et `stage.css`, l'ambre `#ffd17f` et le brun `#80561e` de `globals.css`.
- `gold` sert au-delà de la Légendaire (score de collection, bonus de réserve, sabliers, carte non possédée).
- `themeColor` du viewport est `#090812`, différent de `bg-deep` (`#08080a`).
- Le rayon et l'espacement n'ont pas de tokens : les valeurs du frontmatter sont celles qui reviennent dans le code, pas des variables CSS.
