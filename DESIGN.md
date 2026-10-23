---
name: CreatorDeck
description: Jeu de collection de cartes de créateurs, téléphone d'abord, sur fond noir de plateau de diffusion.
colors:
  bg-deep: "#08080c"
  bg: "#0e0d14"
  bg-soft: "#14131c"
  panel: "#1b1a25"
  panel-2: "#23222f"
  panel-3: "#2e2d3c"
  text: "#fff6e6"
  muted: "#b6b2c6"
  muted-2: "#8f8ba3"
  line: "rgb(255 255 255 / 0.1)"
  line-strong: "rgb(255 255 255 / 0.2)"
  accent: "#ff4fa3"
  accent-light: "#ff8ec6"
  accent-soft: "#ffa9d4"
  accent-tint: "#ffd9ec"
  accent-deep: "#c41f7a"
  accent-dark: "#6e1048"
  accent-night: "#3a0a2a"
  action: "#d9ff3a"
  action-ink: "#0a0a0d"
  live: "#e11d3f"
  paper: "#fff4dc"
  ink: "#0a0a0d"
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
    backgroundColor: "{colors.action}"
    textColor: "{colors.action-ink}"
    typography: "{typography.headline}"
    rounded: "10px"
    height: "56px"
    width: "100%"
  button-primary-ready:
    backgroundColor: "{colors.live}"
    textColor: "#ffffff"
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

> **Thème d'application « Pocket » (21 octobre 2026, revu le soir même avec Malik).** Fond neutre presque noir : la couleur vient des sachets et des objets dessinés de la barre, pas du chrome (l'indigo partout faisait « unicolore »). Accent rose, action vert acide, texte et plaques crème, lettrage Barlow Condensed. Plus de contour ni d'ombre dure sur chaque panneau (« quand tout est mis en relief, plus rien ne l'est ») : le relief reste aux boutons pleins. Navigation à **trois objets** (Binder | Drop | Objectifs), en-tête avec badge de niveau (profil) et engrenage (réglages), Atelier en mode du Binder. En cas de conflit avec l'ancien relevé ci-dessous, ce paragraphe, la section « Thèmes d'application » et « Navigation » font foi.

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
- **Rouge du direct** (`accent`) : le booster prêt, le bouton de révélation suivante, le point du bandeau « live », la jauge de niveau. Le commentaire du bouton principal le dit : « Booster disponible : c'est le seul endroit rouge de l'écran. »
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
- **Sachets du Drop, refonte du 21 octobre 2026** (`scripts/build-pack-art.py` → `public/packs/live-opening.svg` et `memes-opening.svg`, façon Pokémon TCG Pocket) : sachet plat, sans tranche 3D (les `.pack-3d-side-*` et leur liseré sont supprimés), aplats vifs, sertissage vertical net en haut et en bas, grande illustration centrale. **Live Drop (DA Streamer)** : violet électrique `#8a5cff` → `#1c0f5e`, sertissage lavande, cadre webcam crème avec streamer casqué, pastille LIVE rouge `#ff2d4a` (le seul rouge, il dit le direct), compteur de spectateurs, alerte « +1 ABONNÉ », bulle de chat, logo crème en biais à extrusion rose `#ff4fa3`. **MEMES (DA mèmes d'internet)** : vert acide `#d9ff3a` → `#2fd3a0` à trame de points, contours noirs épais, sertissage rose `#ff6cbc`, cadre de mème (légende blanche cernée de noir, mascotte rose aux lunettes pixel « deal with it »), bulle LOL, curseur, pastille ×5 CARTES, logo blanc cerné de noir à extrusion rose `#ff2e93`. Le jaune et l'or n'y figurent pas : l'or reste à la légendaire. Lettres tracées en vecteur depuis Barlow Condensed 800/900 (OFL), jamais de police système dans un SVG servi en `<img>`. Étiquettes de soudure à 31 unités du gabarit 600 × 880 (≥ 12 px à l'écran dès 390 px).
- **Ombre portée du sachet** : noir à 90 % au centre, frangé de `rgba(125, 20, 55, .3)`. Fixe ; seul le sachet flotte.
- **Palette par sachet** (`booster-continuity.css`, `[data-universe]` posé par `PackTear`) : la scène d'ouverture et les dos de carte reprennent les couleurs du sachet ouvert. Live : fond nuit `#07051c` teinté violet, dos violet `#6a47e8` → `#1c0f5e` → `#8a5cff`, filet lavande. MEMES : fond `#050d09` teinté vert, dos vert profond `#2f9e5a` → `#0a3a24` → `#4fae3a` à fine trame de points citron, filet et emblème citron `#d9ff3a`. IMGFLIP : fond `#030b16`, dos bleu `#0f5a96` → `#073a68` → `#09234b`, filet menthe `#81ffdd`. Réserve `vault` (cyan `#2ee6ff` → cobalt `#1f4bff`). Variables : `--scene-background`, `--back-surface`, `--back-edge`, `--back-inset`, `--back-ink`, `--back-glow`, et `--pack-accent` / `--pack-accent-ink` pour le compteur et le bouton de la révélation Mèmes. Tous les dos (sachet, révélation Live, révélation Mèmes/Imgflip) sont le même objet : cadre intérieur à 11 %, médaillon à 62 %, étoile `CardBackEmblem` à `clamp(40px, 13vw, 84px)`. Sans attribut, les valeurs bordeaux d'origine s'appliquent.
- **Pile de réserve supprimée** (21 octobre 2026, demande de Malik) : plus de dos de sachets derrière le sachet actif ; la réserve se lit dans la ligne « N sachets · prochain à… ».
- **Lumière de plateau** (`.stage-halo`) : le portrait de la chaîne préférée, flouté (14 px), saturé à 1,5 et masqué vers le bas ; elle teinte le haut de l'accueil avec les couleurs du streameur, pas avec le bordeaux.

`drop-binder.css` déclare aussi un fond bordeaux radial pour `.home-view .pack-stage` (`rgba(112,20,53,.34)` et `rgba(146,49,84,.12)`). Dans le carrousel actuel, la règle plus spécifique de `stage.css` (`.home-view .booster-selector .pack-stage.stage-live.booster-carousel { background: none }`) l'annule : sur l'accueil, le bordeaux vit dans le sachet, son ombre et sa pile, pas dans le fond.

### Named Rules
**La règle du seul rouge.** Le rouge (`--live`, #e11d3f, un cran plus sombre que le badge LIVE des sachets pour tenir 4,5:1 sous du texte blanc) est réservé à ce qui est vivant : booster prêt, badge LIVE, révélation suivante. L'accent est rose, l'action vert acide : le chrome n'est plus rouge.

**La règle du chrome par jetons (remplace « le chrome fixe », levée par Malik le 21 octobre 2026).** Le fond, les panneaux, le texte et les boutons viennent du thème d'application (`:root` + `data-theme`), jamais du thème de collection équipé : celui-ci ne réécrit que les `--accent*` du classeur, et rien du tout pour le thème d'origine.

**La règle de la carte sans interface.** La carte ne porte aucune couleur d'interface, ni accent ni violet : elle a sa propre palette (rareté et matière), ce qui la fait ressortir sur le noir.

## Thèmes d'application

Source unique : le bloc `:root` de `src/app/globals.css` (thème par défaut « Pocket »), suivi des blocs `:root[data-theme="live"|"memes"|"vault"]` qui ne réécrivent que les jetons qu'ils changent. `src/lib/app-theme.ts` pose l'attribut sur `<html>` et lit `localStorage["creatordeck.app-theme"]` ; **aucun écran ne l'appelle** : les thèmes ne sont pas proposés au joueur. Leur déblocage (collection entière, palier à force de jouer, façon mode sombre/clair) est à décider par Malik, suivi dans bd (CreatorDeck-Codex-1nu).

Trois rôles de couleur, jamais mélangés : **action** (`--action`/`--action-ink`, bouton plein, onglet actif, filtre actif, jauge), **accent** (`--accent*`, liens, focus, pastilles), **direct** (`--live`). Relief : `--outline` (contour encre) et `--lift` (ombre dure de 3 px), recalculés par chaque thème depuis `--ink-rgb`. Un appui enfonce l'objet de 2 px sur son ombre.

| Thème | Fond / panneaux | Accent | Action |
| --- | --- | --- | --- |
| Pocket (défaut) | neutre `#08080c` → `#2e2d3c` | rose `#ff4fa3` | vert acide `#d9ff3a` |
| Live | violet électrique `#10063f` → `#4c30c4` | rose | lavande `#b79bff` |
| MEMES | vert forêt `#04110b` → `#1f5d48` | rose vif `#ff2e93` | vert acide |
| MEME VAULT | cobalt `#030a2e` → `#1f45c4` | bleu `#6f8dff` | cyan `#2ee6ff` |

`src/lib/app-theme.test.ts` lit ces blocs et exige, pour chacun, texte/fond ≥ 12, secondaire/panneau ≥ 4,5, bouton plein ≥ 7. Ajouter un thème : un bloc de plus dans `globals.css` et son id dans `APP_THEMES`. Restent hors thème : le rouge du direct, l'or de la légendaire, le vert et le danger, les raretés. Les scènes d'ouverture et les dos de carte gardent leur palette par sachet (`data-universe`).

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
- **Barre du bas.** Trois colonnes (`1fr 1.4fr 1fr`) : Binder, Drop au centre, Objectifs. Barre pleine, collée au bas avec la zone sûre ; seul le sachet du Drop dépasse au-dessus. Le contenu réserve `100px + env(safe-area-inset-bottom)` en bas.
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
- Les anciennes variantes rouges de l'accueil (`.is-lean .primary-action`, `.home-view .primary-action`, `.drop-open`) sont supprimées (21 octobre) : sur le Drop, le sachet est le seul bouton.
- **Carton, pas verre :** onglet actif de la barre du bas en papier (plus de rouge ni de halo) ; filtres actifs de l'Atelier en papier sur encre ; sabliers sans or. Le rouge reste au sachet prêt et au direct, l'or à la légendaire.

### Chips
- **Statut (`.season-badge`, `.streak-pill`, `.completion-pill`) :** fond accent à 10 %, bordure accent à 18 %, texte `accent-tint`, 10 px d'arrondi, 13 px en 700.
- **Monnaie (`.currency-chip`) :** 31 px, accent à 10 % ; variante chaude en ambre (`#ffd17f` sur `rgba(255,190,85,.08)`).
- **Filtres :** le Binder n'en a plus (un album se feuillette, il ne se filtre pas). Ceux de l'Atelier sont des pilules de 44 px, état actif en papier sur encre, sans rouge. Ailleurs, `.filter-chips button` est un onglet souligné (2 px de bordure basse, `globals.css`), actif en couleur de texte.
- **Sélecteur d'univers sur le Drop :** deux mots en capitales à 12 px, sans fond ; l'état actif est blanc et souligné (`inset 0 -2px #fff`). Une règle `forced-colors` existe pour la variante pilule de `booster-carousel.css`.

### Cards / Containers
- **Panneaux :** 14 à 16 px d'arrondi, filet `line`, fond blanc à 2,5 à 3,5 % ou `panel-2`, 13 à 14 px de padding.
- **État vide :** filet pointillé `accent-light` à 22 %, fond accent à 4,5 %.
- **Shadow Strategy :** aucune ombre au repos sur les panneaux ; voir Elevation & Depth.

### Inputs / Fields
- **Recherche et tri :** 44 px (46 px dans le Binder et l'Atelier), filet `line`, fond blanc à 2 % (5 % dans le Binder), 4 px d'arrondi (14 px dans le Binder et l'Atelier). Placeholder en `muted-2`.
- **Focus :** anneau global `accent-light` ; dans le Binder et l'Atelier, la bordure du champ passe à `accent-soft` (`:focus-within`).

### Navigation
- **Barre du bas (21 octobre 2026) :** trois objets dessinés (`nav-objects.tsx`) : un classeur (Binder), un sachet (Drop, au centre, 62 px, qui dépasse de la barre), une cible (Objectifs). Pas de plaque ni de contour : l'objet actif se lève (`translateY(-4px) scale(1.12)`, 180 ms) et affiche son nom au-dessus d'un trait vert acide ; les autres restent à 72 % d'opacité, sans nom. Une pastille rouge dit « un booster est prêt » (Drop) ou « une récompense est à réclamer » (Objectifs) ; le sachet se balance (±4°, 2,6 s) seulement si un booster est prêt et que le joueur est ailleurs. Mouvement coupé sous `prefers-reduced-motion`. L'Atelier n'est plus un onglet : c'est un mode du Binder (« Ma collection | Atelier »).
- **Barre du haut :** à gauche le badge de niveau (rond rose, « Niv. N » et sa jauge vert acide) qui ouvre le profil ; à droite les sabliers et les points en pastilles plates, puis l'engrenage (44 px) qui ouvre les réglages (compte, notifications, code booster, son, musique, reflets, thème, nouveautés, taux, crédits, et « Avancé » replié pour le diagnostic et la version). Une pastille rouge sur l'engrenage seulement si le compte demande une action. Sous 360 px, la jauge se cache et le rond reste.
- **Pagination :** boutons ronds de 44 px ; libellé masqué sous 520 px de large mais conservé pour le lecteur d'écran.

### La carte créateur (signature)
« Une planche TCG, pas une vignette » (`globals.css`) : portrait plein cadre au ratio 0,715 ; la rareté est le cadre (filet, épaisseur, reflet) ; une nameplate opaque en bas, nom en display condensée ; la variante est une matière (foil qui suit le doigt, led qui pulse, chrome). Le portrait est assombri en haut et en bas pour porter le rang et la nameplate. La rareté se lit à la lumière du bord, pas dans une pastille. La carte reste la même affiche partout. Le code garde deux mentions en rouge sur la planche : « Obtenue en direct » (variante Live, `.card-live`) et le lien « Direct » d'une chaîne réellement en ligne (`.card-on-air`), à réduire dans le balayage cg8.2. Sans photo, un placeholder affiche jusqu'à deux initiales dans un cercle teinté de la rareté.

### Le bandeau du direct (signature)
Un « lower third » de régie sous le titre d'accueil : un point rouge qui pulse (3,2 s), le mot en Barlow Condensed, les chiffres en `tabular-nums`, entre deux filets, sans fond ni arrondi.

### Le sachet et sa scène (signature)
Sur le Drop (scène TCG de poche, 21 octobre), un interrupteur centré choisit Live ou Mèmes au-dessus du sachet. **Un seul geste ouvre : le sachet.** Dessous, une seule ligne : « 2 sachets · prochain à 14 h 30 », ou vide « Prochain sachet à 14 h 30 ». Sabliers, garantie et taux sont repliés dans « Réserve, taux et sabliers » ; plus de trouvailles sur l'accueil (l'album sert à ça). Puis les chaînes du joueur. L'en-tête est opaque : marque à 20 px, porte-monnaie et niveau en étiquettes carton de 44 px (6 px d'arrondi, libellés ≥ 12 px). Le sachet actif reste le bouton accessible : il est plat, légèrement penché (`perspective(900px) rotateX(2deg)`), flotte au repos (4,8 s, ±5 px, ±1,4° de roulis, ±6° de lacet) et laisse passer un reflet de film toutes les 5,6 s (`.pack-glint`, un biseau de lumière en `transform`, découpé par le masque alpha de l'impression : il ne sort jamais du sachet). Ce sont les deux seules boucles de l'accueil, ombre fixe, et il se presse à `scale(.97)` en 100 ms (`cubic-bezier(0.23, 1, 0.32, 1)`). La scène ne rogne que sur les côtés (`overflow-x: clip`), pour que l'ombre ne soit pas coupée en bas. Il repose sur la pile de ses dos bordeaux. Le carrousel suit le doigt : chaque paquet glisse, recule et tourne selon sa distance au centre ; on change de paquet au-delà de 22 % d'un cran ou d'un coup de pouce de plus de ~0,11 px/ms ; en mouvement réduit, fondu de 200 ms (D-156, D-157). Il se lit comme un sachet plein : un renflement de pile de cartes sous le film (`.pack-bulge`). À la déchirure, la lumière et la tranche des cinq cartes sortent de la fente (`.foil-interior`), un éclat part de la soudure (`.foil-burst`) et les cartes glissent hors du sachet (`.foil-chamber-mask`, D-154). À l'ouverture, la scène plein écran bordeaux prend le relais et la carte révélée garde la taille de la carte extraite. Commune et Peu commune se retournent en 280 ms (`cubic-bezier(0.23, 1, 0.32, 1)`), sans flash ; Rare et mieux gardent leur mise en scène, avec une lueur fixe derrière la carte. **La carte nouvelle a la scène** (flash de sa rareté pour Rare et mieux, sans étiquette : la rareté se lit dans la lumière). **Un doublon, quelle que soit sa rareté, rejoint la pile** en 420 ms (transform/opacité, 0 ms en mouvement réduit ou Reflets coupés) et la suite avance seule. **Fin du sachet :** si la dernière personne est en direct, un écran avec son visage et « Regarder X sur Twitch » (`pack-end-live.tsx`) ; sinon on range, et une ligne dit « Prochain sachet à 14 h 30 » ou « Un sachet t'attend ». Plus d'écran récapitulatif ni d'affiche à décider.

### L'album (signature)
« Mon classeur » se feuillette par pages de 12 : ses cartes d'abord (chaînes du cercle dans son ordre, puis les plus récentes), les manquantes ensuite en dos de carte. Une seule recherche discrète ; plus de score, de barre de progression, de filtres, de tri ni de compteurs. Le nombre d'exemplaires n'apparaît que dans la fiche.

### Le parcours
Sachet → carte → direct → album. Tribunal, Arène, Paquet Scène, Hôtel des ventes, Amis, Classement et Last Pack vivent dans « Autres activités » de l'écran Objectifs (replié). La pastille de l'onglet Objectifs signale une récompense à réclamer (règle « aucune pastille qui appelle à revenir » levée par Malik le 21 octobre 2026). Sans autre joueur, les surfaces sociales proposent de partager une carte (`CircleShareEmpty`).

## Do's and Don'ts

### Do:
- **Do** prendre toute couleur d'interface dans le bloc `:root` de `globals.css` (« aucune couleur d'interface en dur ailleurs que dans ce bloc »).
- **Do** réserver `accent` à ce qui est vivant : booster prêt, LIVE, action.
- **Do** laisser la rareté venir de `RARITY_META` : une seule source, posée en `--rarity` par le composant.
- **Do** composer les titres, noms et compteurs en Barlow Condensed capitales, et tout le reste en IBM Plex Sans.
- **Do** donner au moins 44 px de haut à tout ce qui se touche, et un `:focus-visible` visible.
- **Do** couper chaque animation en boucle sous `prefers-reduced-motion: reduce` (le code le fait pour le halo, le point live, l'anneau tournant, le carrousel, le flash de révélation) et respecter `[data-card-fx="off"]`.
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
- La variante de carte `variant-gold` (`.creator-card.variant-gold .card-foil`, `globals.css`) met de l'or sur des cartes qui ne sont pas toutes Légendaires, ce qui déroge à « l'or n'existe que pour la légendaire ». Décision (Malik, 21 oct. 2026) : on la garde comme matière rare de carte ; c'est la seule exception assumée à la règle de l'or.
- Le rouge sort de ses deux emplois (sachet prêt, direct) dans des pastilles de statut et dans des écrans hors du parcours sachet → carte → direct → album. Le balayage de style (cg8.2) reste à terminer.
- `themeColor` du viewport est `#090812`, différent de `bg-deep` (`#08080a`).
- Le rayon et l'espacement n'ont pas de tokens : les valeurs du frontmatter sont celles qui reviennent dans le code, pas des variables CSS.
