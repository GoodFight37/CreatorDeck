# Audit audio et refonte de l'identité sonore — 23 octobre 2026

Mission : amener le son de CreatorDeck au niveau d'un jeu de cartes mobile
soigné (référence de qualité : Pokémon TCG Pocket), **sans copier** ses
compositions, motifs ou enregistrements. État à la livraison de ce document :
audit fait, intégration préparée, laboratoire prêt — **aucune génération
payante n'a été lancée** (pas de clé API configurée, budget à valider par
Malik), **rien n'a changé pour les joueurs**.

---

## 1. L'existant, mesuré

### 1.1 Fichiers (`public/sfx/`, `public/music/`)

| Fichier | Durée | Poids | Rôle |
|---|---|---|---|
| card-draw.wav | 0,35 s | 60 Ko | carte tirée, déchirure de booster (avec synthèse) |
| card-turn.wav | 0,66 s | 114 Ko | page du Binder — **en réserve** (voir 1.3) |
| chip-place.wav | 0,34 s | 58 Ko | carte posée (doublon sacrifié, échange) |
| click.wav | 0,30 s | 52 Ko | ancien clic d'onglet — **en réserve** |
| select.wav | 0,13 s | 21 Ko | ancien filtre du Binder — **en réserve** |
| pop.wav | 0,22 s | 38 Ko | ouverture (carte offerte quotidienne, fin du ventilateur) |
| close.wav | 0,19 s | 32 Ko | refus doux, fermeture du ventilateur |
| coins.wav | 0,58 s | 100 Ko | récompense encaissée (points, sabliers, jetons) |
| menu-open.wav | 0,48 s | 82 Ko | ancienne ouverture de feuille — **en réserve** |
| chime.wav | 0,31 s | 53 Ko | publication encaissée |
| **hub-late-night.mp3** | boucle | **833 Ko** | **unique piste musicale de tout le jeu** |

Tous les `.wav` : 44,1 kHz stéréo, non compressés. Aucun autre fichier audio
dans le dépôt.

### 1.2 Moteur (`src/lib/sfx.ts`)

Le moteur est sérieux, et meilleur que sa réputation :

- **Niveaux mesurés, pas devinés** : chaque bruitage a un gain calculé depuis
  la mesure RMS/crête de son fichier (`src/data/sfx-niveaux.json`, crête
  plafonnée à −6 dBFS, amplification bornée à ×2 — `scripts/sfx-niveaux.mjs`
  régénère la table). Résultat : aucun son ne claque, le clic est le plus
  discret, les récompenses les plus présentes.
- **Musique déjà traitée comme un produit fini** : démarrage en fondu de
  1,4 s, coupure en 0,35 s, **couture de boucle retravaillée** (crossfade de
  1,2 s entre fin et début du fichier, `crossfadeLoopSeam`), trois scènes de
  gain — hub 0,08, pack 0,04, Tribunal 0 —, déverrouillage au premier geste
  (politique d'autoplay respectée), chargement différé, un seul contexte
  WebAudio partagé.
- **Préférences séparées dès aujourd'hui** : deux interrupteurs indépendants
  (effets `creatordeck.muted`, musique `creatordeck.music-muted`), mémorisés.
- **Rareté racontée en synthèse** : `revealPlan` / `bangPlan` construisent des
  suites de notes par rareté (légendaire plus riche, note ajoutée pour les
  variantes spéciales) ; `tearPlan`, `packOpeningPlan`, `gracePlan`,
  `gavelPlan`, `rewardPlan` et trois stingers complètent le vocabulaire.

### 1.3 Déclenchements (où le son se joue)

- **Musique** : `startGameAudio("hub")` au premier geste dans
  `creator-deck-app.tsx` ; scène `pack` pendant l'ouverture
  (`meme-booster-opening.tsx`) ; Tribunal silencieux côté BGM (les sons de
  grâce et de marteau y restent).
- **Boosters** : déchirure (échantillon `card-draw` + glissando de matière),
  montée d'ouverture, révélations par rareté, impact selon rareté.
- **Récompenses** : `coins` à l'encaissement, `chime` à la publication,
  `pop` à la carte offerte.
- **Règle joueur du 8 octobre 2026, codée en dur** : *se déplacer ne sonne
  pas*. Navigation, réglages, filtres et pages du Binder sont muets ;
  `playClick`, `playMenuOpen`, `playMenuClose`, `playSelect`, `playPageTurn`
  existent en réserve, échantillons réglés, **aucun écran ne les appelle**.
  Cette règle n'est pas rouverte par la présente mission.

## 2. Ce qui ne va pas (vérifié dans le code)

1. **Une seule piste musicale pour tout le jeu.** 833 Ko, une ambiance
   unique du premier au dernier écran : c'est la première source de lassitude
   sur de longues sessions, et le plus grand écart avec la référence visée.
2. **La rareté sonne « synthétiseur brut ».** Les plans de révélation et
   d'impact utilisent des oscillateurs `square`/`sawtooth` sans enveloppe
   riche ni matière : fonctionnel, équilibré, mais c'est ce côté artificiel
   qui donne l'impression « bas de gamme », pas les niveaux (déjà bons).
3. **Un seul échantillon par geste, toujours identique.** Aucune variante :
   la centième déchirure est la première. Les jeux soignés varient légèrement
   les sons répétés.
4. **Deux gestes majeurs n'ont pas de matière dédiée** : la déchirure de
   sachet (composée d'un bruitage de carte et d'une synthèse) et le
   scintillement de révélation rare (synthèse seule).
5. **Aucun réglage de volume fin** : deux interrupteurs tout-ou-rien. Choix
   documenté à l'époque (« le téléphone a déjà son volume »), mais la mission
   demande des préférences musique/effets séparées et réglables — le moteur
   les accepte désormais (voir §6), l'exposition aux joueurs reste une
   décision de Malik (§8).
6. Points sains à ne pas « corriger » : WAV non compressés (fichiers courts,
   poids total 610 Ko — négligeable devant les 139 Mo d'export), Tribunal
   sans BGM (choix dramatique), sons de déplacement en réserve (règle joueur).

## 3. ElevenLabs — ce qui est vérifié

- **Licence** : l'usage commercial des musiques générées est inclus dès
  l'abonnement **Starter** (le gratuit n'a aucune licence commerciale).
  Starter : 6 $/mois, 30 000 crédits/mois.
- **Music API** (`POST /v1/music`, comptes payants uniquement) : modèle
  `music_v2_5`, durée demandée en millisecondes (3 s à 10 min),
  `force_instrumental`, `seed` pour des variantes reproductibles, et plans de
  composition détaillés si besoin. Coût : **900 crédits/minute** (0,15 $/min
  en API à l'usage).
- **Sound Effects API** (`POST /v1/sound-generation`) : modèle
  `eleven_text_to_sound_v2`, durée 0,5 à 30 s, option boucle propre,
  sortie WAV 44,1 kHz disponible sur Starter. Coût : **200 crédits par
  génération** (0,12 $ à l'usage).
- **Outillage officiel pour agents** : skills (`npx skills add
  elevenlabs/skills --skill music` / `--skill sound-effects`), CLI
  (`npx -y @elevenlabs/cli@latest onboard init`, `elevenlabs music compose`,
  `elevenlabs text-to-sound-effects convert`). Le script du dépôt
  (`scripts/elevenlabs-generate.mjs`) appelle directement l'API REST : aucune
  dépendance ajoutée, aucune clé dans le code.
- **Alternative gratuite** : les bibliothèques Kenney (CC0) restent une
  source licite de bruitages d'interface ; elles ne couvrent ni la musique
  d'ambiance sur mesure ni la matière « booster ». Non téléchargées ici
  (hors périmètre réseau de la session) — option à garder si le budget
  ElevenLabs n'est pas validé.

### Budget à valider AVANT toute génération

| Palier | Contenu | Crédits estimés | Tient dans Starter (30 000) |
|---|---|---|---|
| **Complet (recommandé)** | 3 directions × 2 variantes × 60 s (5 400) + 12 gestes × 3 variantes (7 200) | **12 600** | oui, réserve ≈ 17 400 pour une 2ᵉ passe |
| Musique seule | 3 directions × 2 variantes × 60 s | 5 400 | oui |
| Économique | 3 directions × 1 variante × 60 s + 12 gestes × 3 variantes | 9 900 | oui |

Consommation à ce jour : **0 crédit, 0 €** — aucun compte, aucune clé,
aucun appel. La génération exigera : (1) ce budget validé, (2) une clé créée
par Malik et fournie en secret d'environnement (`ELEVENLABS_API_KEY`),
jamais collée dans le code, un log ou GitHub.

## 4. Les directions musicales proposées

Trois directions réellement différentes, plus le silence — toutes en boucles
de 60 s instrumentales, à niveau plat, pensées pour des heures d'écoute.
Briefs complets (prompts, styles négatifs, graines) dans
`src/data/audio-briefs.json` — c'est la source unique du laboratoire et du
script de génération.

1. **Douce et mélodique** — piano feutré, cordes chaudes, soupçon de boîte à
   musique ; une mélodie simple de quatre mesures, ~70 BPM, aucun pic.
2. **Chaleureuse et accueillante** — guitare acoustique pincée, Rhodes doux,
   contrebasse feutrée ; l'ambiance d'un café tranquille, ~85 BPM.
3. **Minimaliste, très discrète** — nappes espacées, notes rares, beaucoup de
   silence entre les sons ; à peine perceptible, ~60 BPM.
4. **Sans musique** — bruitages seuls ; c'est déjà possible dans le jeu, la
   direction le reconnaît comme un choix à part entière.

Aucune direction n'est imposée : Malik écoute, choisit, peut demander
d'autres variantes (la réserve de crédits du palier complet le permet).

## 5. Plan bruitages

12 gestes × 3 variantes chacun (36 générations) : les 10 échantillons
actuels régénérés en matière plus riche (papier de carte tirée et retournée,
tampon, tap d'interface, confirmation, pop, fermeture, pièces dans un bol en
bois plutôt qu'un casino, feuille qui s'ouvre, carillon chaud) **plus deux
nouveaux** : déchirure de sachet dédiée et scintillement de révélation.
Les sons de déplacement restent muets dans le jeu (règle joueur) ; leurs
variantes ne servent qu'à juger la matière dans le laboratoire.

## 6. Ce qui est déjà préparé dans le code (gratuit, réversible)

- **Volumes séparés dans le moteur** : `getMusicVolume/setMusicVolume`,
  `getSfxVolume/setSfxVolume` (multiplicateurs 0 à 2, 1 = équilibre actuel,
  donc **aucun changement d'écoute par défaut**), persistés
  (`creatordeck.music-volume`, `creatordeck.sfx-volume`), appliqués en fondu
  au bus maître et au gain de scène.
- **Bascule de piste préparée** : catalogue `MUSIC_TRACKS` (aujourd'hui : la
  seule piste actuelle), `setMusicTrack()` avec fondu et garde anti-course
  au chargement ; l'autoplay et le déverrouillage au premier geste ne
  changent pas.
- **Laboratoire audio** `/audio-lab` (développement uniquement, retiré de
  l'export de production par `scripts/prune-prototypes.mjs`, `noindex`) :
  écoute des 4 options musicales par le bus du jeu, curseurs musique/effets
  séparés écrivant les vraies préférences, originaux contre variantes pour
  chaque geste, boutons des **vraies animations** (déchirure, pack,
  révélations par rareté et leurs impacts, grâce/marteau du Tribunal, scènes
  hub/pack/tribunal), sélections persistées sur l'appareil. Les candidats
  absents s'affichent « à générer » ; rien n'est téléchargeable par erreur.
- **Script de génération verrouillé** : `scripts/elevenlabs-generate.mjs`,
  `--dry-run` par défaut (plan : 42 fichiers, 12 600 crédits), refus de
  démarrer sans `--budget <crédits>` explicite ou sans clé d'environnement,
  n'écrase jamais un fichier existant, écrit uniquement dans
  `public/music/candidates/` et `public/sfx/candidates/`.
- **Conservation garantie** : aucun fichier actuel n'a été renommé, remplacé
  ou supprimé ; le jeu en production sonne exactement comme avant.

## 7. Intégration après choix de Malik (méthode)

1. Générer le palier validé → écouter dans `/audio-lab`, choisir direction
   et variantes (sélections conservées).
2. Pour la musique retenue : retravailler la couture si l'écoute la révèle
   (le moteur sait déjà recoudre), mesurer, ajouter la piste à
   `MUSIC_TRACKS`, la brancher comme défaut — l'ancienne reste disponible.
3. Pour chaque bruitage retenu : régénérer la table des niveaux
   (`node scripts/sfx-niveaux.mjs`), remplacer le fichier, vérifier
   `sfx.test.ts` (existence, durée, niveaux) et réécouter **dans l'animation
   réelle** via le laboratoire puis l'écran concerné.
4. Portes complètes (unitaires, écrans, build, APK) avant toute fusion ;
   note de version joueur le jour où le changement devient audible.

## 8. Décisions qui restent à Malik

1. **Budget** : palier complet (12 600 crédits, recommandé), musique seule
   (5 400) ou économique (9 900) — puis création du compte/clé ElevenLabs
   Starter et transmission de la clé en secret d'environnement.
2. **Direction musicale finale** après écoute (ou demande d'autres variantes).
3. **Variantes de bruitages** retenues, geste par geste.
4. **Curseurs de volume dans les Réglages du jeu** : le moteur les supporte ;
   les exposer contredirait le choix documenté « le téléphone a déjà son
   volume ». À trancher explicitement ; par défaut, ils restent dans le
   laboratoire.
5. Éventuellement : musique dédiée aux ouvertures de booster ou au Tribunal
   (aujourd'hui scène abaissée et silence voulu) — seulement si la direction
   choisie s'y prête.
