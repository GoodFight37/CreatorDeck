# Lots D et carrousel — vérification Android du 28 octobre 2026

Issues `CreatorDeck-Codex-3rs` et `CreatorDeck-Codex-3nq`.
Visuel de Claude : `6c82d3ec6116727c194ee1410ba036809c2baedd`.
CI [40656194492](https://github.com/GoodFight37/CreatorDeck/actions/runs/40656194492)
entièrement réussie, y compris les trois shards et le snapshot Linux signalé :
aucune copie supplémentaire de snapshot ni régénération Linux nécessaire.

## APK et appareil de test

Réutilisation de l'[APK officielle v886271](https://github.com/GoodFight37/creatordeck-apk/releases/tag/v886271),
déjà construite par la CI sur ce SHA exact, plutôt qu'un doublon de compilation.
Taille 178 569 904 octets ; SHA-256
`a358702d6102c5ed5696b4c2bd82107299961a95b1416eaa65791551dd0342a3` :
taille et empreinte vérifiées face au manifeste téléchargé avant installation.
Installation `adb install -r -d` réussie sur CreatorDeck_API36, emulator-5554.
Ce n'est ni une nouvelle publication APK ni une validation du Redmi de Malik.
Le refactor de constantes B est testé séparément, sans changement des valeurs ;
il n'est pas présenté comme inclus dans cette APK visuelle antérieure.

AVD lancé sans fenêtre ni audio, GPU host NVIDIA RTX3070 (pas SwiftShader).
WebView 412×842 CSS, DPR 2,625. Touches et glissés envoyés par adb ; inspection
du DOM par Playwright Android. Les RPC de tirage utilisent des réponses factices.
Le pont CapacitorHttp doit être explicitement redirigé vers CapacitorWebFetch :
les interceptions réseau du navigateur seules ne simulent pas HTTP natif.
Les premiers essais de harnais ont échoué sur ce point et sur un sélecteur de
mesure Anime (CSS Modules), sans correction du jeu. Le dernier essai complet
réussit et rapporte zéro erreur JavaScript. L'état local de l'essai est restauré.

## Parcours exécutés

- Live, MEMES, Imgflip et Anime : préparation, capture du sachet stable,
  ouverture alternative au doigt, capture des dos après 600 ms d'extraction,
  première face révélée, bouton suivant activé, aucun débordement horizontal.
- Douze captures natives inspectées : les quatre sachets restent opaques,
  les dos violet/vert/turquoise/noir-or sont distincts et lisibles, les faces
  et boutons restent dans l'écran. Le flou déjà présent dans certaines sources
  MEMES n'est pas corrigé par ce lot de validation.
- Live, MEMES et Imgflip : exactement un appel de tirage simulé chacun.
  Anime suit son chemin local. Aucun tirage réel validé ni écrit en production.
- Carrousel : six glissés adb, séquence vérifiée MEMES → IMGFLIP → ANIME →
  IMGFLIP → MEMES → LIVE ; aucune ouverture accidentelle. Six captures d'étape
  et une vidéo couvrant les gestes, images de croisement inspectées.
  Le croisement des tranches D-167 n'est pas reproduit sur cette APK officielle ;
  espacement 100 % et composition flat sont toujours présents. Pas de nouveau
  correctif ajouté au carrousel ; clôture du suivi qui attendait la publication APK.

## Mesures d'accompagnement des captures

Intervalles requestAnimationFrame mesurés entre le geste et la première face,
avec adb et captures natives actifs. Ce n'est pas un benchmark isolé ni une
prévision de performance sur téléphone ; les pointes restent visibles.

| Ouverture | Intervalles | Médiane ms | P95 ms | >33,4 ms | Carte CSS |
|---|---:|---:|---:|---:|---|
| Live | 161 | 16,7 | 66,7 | 22 | 305×427 |
| MEMES | 195 | 16,7 | 50,1 | 17 | 305×427 |
| Imgflip | 204 | 16,7 | 50,0 | 14 | 305×427 |
| Anime | 202 | 16,7 | 66,7 | 19 | 363×533 |

Le cadrage Anime est volontairement différent dans le visuel de Claude ; aucune
uniformisation de taille/durée décidée ici. Le lot B conserve les valeurs
existantes, y compris la différence Live / autres univers.

## Autres contrôles et preuves

- `npx vitest run src/lib/reveal.test.ts` : **16/16**.
- Écrans `ecrans-meme-reveal`, `ecrans-imgflip-booster`, `ecrans-meme-booster` : **20/20**.
- ESLint ciblé et `tsc --noEmit` : réussis.
- `CREATORDECK_LOCAL_QUALITY=1 npx playwright test --workers=2 --reporter=list` :
  **231 réussis, 49 ignorés, aucun échec**, 21,4 minutes, sur base visuelle + diff B.
  La première commande d'écrans avait des noms de fichiers inexistants : zéro
  test, échec ; remplacée par les trois chemins corrects ci-dessus.
- Fichiers locaux : `reports/android-lots-20261028/resultats.json`,
  `carousel-resultats.json`, douze PNG d'ouverture, six PNG d'étape,
  `ouvertures-contact.png` et `carousel.mp4`. Harnais ponctuel `verify.mjs`.

Les essais A refusés et tous les sons Kenney de Claude restent locaux et intacts,
hors publication. L'inventaire sonore E1 ne corrige pas les sons actuels ; le choix
tonal demandé à Malik reste une décision séparée. Bug Binder sonore suivi dans
`CreatorDeck-Codex-6u3`, sans modification audio non demandée.
