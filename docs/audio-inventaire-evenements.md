# Inventaire des événements sonores — 28 octobre 2026

Lecture du code à `6c82d3ec6116727c194ee1410ba036809c2baedd`, lot E1
`CreatorDeck-Codex-4nw`. Aucun son modifié, aucune écoute humaine effectuée.
Les lignes sont celles de cette base, avant extraction des constantes du lot B.

## Règles communes réellement exécutées

`src/lib/sfx.ts:775` : `playSample` joue un WAV de `public/sfx/`, décodé en
Web Audio, avec le gain mesuré de `src/data/sfx-niveaux.json` × gain de l'appel
× volume effets. `playFamily` (`:943`) alterne le fichier nominal et `-alt.wav`
si cette seconde prise existe. Les événements ci-dessous ne lancent pas les
anciens plans d'oscillateurs ; plusieurs commentaires du moteur sont obsolètes.
Mute ou arrière-plan : silence. Tampon absent : préchargement puis silence
pour cet événement, sans repli de synthèse. Le tableau donne les noms de familles,
à compléter par `.wav` et éventuellement `-alt.wav`, sauf mention contraire.

| Contexte et condition | Appel réel (src/, fichier:ligne) | Son réellement demandé |
|---|---|---|
| Déchirure Live / préparation du booster | components/creator-deck-app.tsx:928 — playPackOpening | pack-tear, via playTear |
| Déchirure MEMES / Imgflip / Anime (composant partagé) | components/meme-booster-opening.tsx:54 — playPackOpening | pack-tear |
| Overlay, effets désactivés | components/overlay-stage.tsx:72 — playPackOpening | pack-tear, sans animation de déchirure |
| Overlay, déchirure animée | components/overlay-stage.tsx:162 — playPackOpening | pack-tear |
| Extraction effective des cartes du sachet, chemin partagé | components/pack-tear.tsx:131 — playSample("card-draw") | card-draw.wav uniquement, pas d'alternance ici |
| Révélation Live commune / peu commune et autres cas sans bang | components/reveal-overlay.tsx:159 — playReveal | reveal-common / reveal-uncommon / reveal-rare selon rareté |
| Révélation Live épique / légendaire, ou rare hors overlay | components/reveal-overlay.tsx:158 — playBang | impact-epic / impact-legendary à ×0,65, puis reveal-epic / reveal-legendary ; rare : reveal-rare seul |
| Booster parfait Live | components/reveal-overlay.tsx:167 — playPerfectStinger | perfect, une seule signature ; l'effet de révélation normal retourne immédiatement si perfect |
| MEMES / Imgflip / Anime : rare, épique, légendaire, mythique | components/meme-reveal.tsx:50 — playBang | rare : reveal-rare ; épique/légendaire : impact à ×0,65 + reveal ; mythique convertie en legendary |
| MEMES / Imgflip / Anime : commune / peu commune | components/meme-reveal.tsx:51 — playReveal | reveal-common / reveal-uncommon |
| Fabrication réussie à l'Atelier | components/atelier-transaction.tsx:40 — playCraft | craft |
| Recyclage / autre transaction Atelier avec delta non nul | components/atelier-transaction.tsx:41 — playCoins | coins |
| Erreur de transaction Atelier, catch | components/atelier-transaction.tsx:50 — playRefuse | close |
| Créateur rejoint depuis le Binder, paiement accepté | components/creator-deck-app.tsx:665 — playCraft | craft |
| Récompense de saison créditée, delta non nul | components/creator-deck-app.tsx:686 — playCoins | coins |
| Récompense d'objectif créditée, delta non nul | components/creator-deck-app.tsx:699 — playReward | chime |
| Tribunal : récompense delta > 0 | components/tribunal-view.tsx:198 — playCoins | coins |
| Tribunal : fin de récupération de récompense réussie | components/tribunal-view.tsx:199 — playTribunalEndStinger | chime à ×0,8, peut suivre les pièces du même résultat |
| Tribunal : verdict deban / grâce | components/tribunal-view.tsx:213 — playGrace | grace.wav, sans seconde prise ni gamme de synthèse |
| Tribunal : autre verdict / ban maintenu | components/tribunal-view.tsx:214 — playGavel | gavel.wav, sans seconde prise ni synthèse |
| Changement effectif de page Binder, hors verrou | components/binder-view.tsx:161 — playPageTurn | card-turn.wav uniquement ; navigation actuellement sonore malgré le commentaire du moteur |

Le récapitulatif MEMES ne déclenche pas de son distinct ; le récap Live parfait
est couvert par `playPerfectStinger`. Une variante de carte non standard augmente
le facteur de `playReveal` à 1,06 ; elle ne choisit pas un autre fichier.

## Les trois sons signalés par Malik

- **Grâce** : `sfx.ts:846` demande seulement la famille `grace`, aujourd'hui
  `grace.wav`. Le commentaire parlant de papier tamponné plus synthèse ne décrit
  plus l'exécution. Le ressenti « bruit de carte » concerne ce fichier, pas une
  confusion d'appel avec `card-draw` ou `card-turn`.
- **Marteau** : `sfx.ts:851` demande seulement `gavel.wav`. Le commentaire
  « synthèse seule » est faux ; aucune frappe d'oscillateur n'est ajoutée.
- **Parfait** : `sfx.ts:824` alterne `perfect.wav` / `perfect-alt.wav`. Ce n'est
  ni la fanfare ancienne ni une synthèse. Le composant le demande dès l'entrée
  en mode perfect et verrouille l'interaction ; « sans effet » est un retour
  perceptif, pas une preuve d'absence d'appel. Un défaut de préchargement/mute
  pourrait aussi rendre un événement muet : non reproduit dans cet inventaire.

## Réserve et laboratoire

Sans appel dans les écrans actifs recherchés : `playLegendaryStinger`
(reveal-legendary), `playCardPlace` (chip-place), `playChime` (chime), `playClick`
(click), `playMenuOpen` (menu-open), `playMenuClose` (close), `playSelect` (select).
`playPageTurn` est l'exception active documentée ci-dessus. `pop` n'a pas d'appel
actif trouvé. Les plans `revealPlan`, `perfectPlan`, etc. sont conservés mais ne
constituent pas le son des événements actuels.

`src/app/audio-lab/audio-lab.tsx` expose des appels manuels aux mêmes fonctions,
`playSample` et `previewSfx` pour les fichiers comparatifs ; `previewMusic`,
`startGameAudio`, `setMusicScene` et `stopHubMusic` concernent la musique.
Les six essais papier/tissu du lot A restent locaux et non activés. Les sons
Kenney de `reports/audio/revue-2026-10-28/` ne sont pas branchés dans le jeu.

Inventaire issu de la recherche des références `play…` dans src et de la lecture
des branches d'appel ; aucun APK, test acoustique ou jugement de timbre ajouté.
