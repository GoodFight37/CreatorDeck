# Construire le catalogue Twitch : périmètre et taille

Le jeu ne code en dur ni la taille (« 500 ») ni le périmètre (« FR ») : passer
au monde entier, à 1000 ou à 2000 créateurs est un **changement de données**,
pas de code. Ce document est le mode d'emploi, avec les chiffres mesurés sur ce
dépôt.

> **Cible retenue : Top 1000 mondial, portraits 600 px.** Autrement dit le
> défaut du générateur, sans aucune option à passer. Les raisons sont détaillées
> dans « Choisir la taille » ci-dessous.

## Périmètre : monde entier, ou langues restreintes

`scripts/build-twitch-catalog.mjs` interroge Twitch **sans filtre de langue par
défaut** : le classement est mondial.

```bash
npm run catalog:source -- --count 2000                  # monde entier
npm run catalog:source -- --count 500 --languages FR    # France (comportement historique)
npm run catalog:source -- --count 1000 --languages FR,EN,ES
```

Le périmètre retenu est écrit dans `src/data/catalog.config.json` :

```json
{
  "scope": "world",
  "scopeLabel": "mondial",
  "audience": "créateurs du monde entier",
  "label": "Top 2000 Twitch",
  "eyebrow": "TOP 2000 TWITCH",
  "edition": "ÉDITION TOP 2000 TWITCH"
}
```

L'application lit ces valeurs (titre de l'onglet, accroches, métadonnées Open
Graph, jusqu'au texte de secours des cartes) : **aucun composant ne contient le
mot « FR »**, et un catalogue mondial ne peut donc pas afficher « francophones ».
`npm run catalog:check` refuse un libellé qui mentirait sur la taille.

### Têtes d'affiche

Deux listes curées existent : `CURATED_WORLD_LOGINS` (monde, la France y est
incluse) et `CURATED_FR_LOGINS` (utilisée uniquement pour un run `--languages FR`).
Elles servent à faire entrer dans le catalogue les grandes chaînes **même
quand elles ne sont pas en direct** au moment de la génération : le classement
final reste dominé par les followers réels. Un login inexistant est ignoré sans
erreur — la liste peut vieillir sans casser le build.

> ⚠️ Le classement est échantillonné au moment de la génération (directs du
> moment + listes curées). C'est une photo, pas un classement officiel : relance
> la génération pour la rafraîchir.

## Ce qui est déjà prêt

| Élément | État |
|---|---|
| Libellés de l'application (« Top 500 », « Classeur (500) », jalons d'objectifs) | dérivés de `CATALOG_SIZE` (`src/lib/catalog.ts`) |
| Raretés | échelle en part du classement (`scripts/lib/rarity-ladder.mjs`), pas en rangs fixes |
| Saisons | calculées depuis `seasons.config.json` ; toute saison est découpée automatiquement au-delà de `seasonMaxSize` (150), le fourre-tout au-delà de 60 |
| Validation | `npm run catalog:check` compare la taille réelle à `src/data/catalog.config.json` (`--expect N` pour forcer) |
| Générateur | `scripts/build-twitch-catalog.mjs --count N`, avec pagination Twitch et reprise sur incident |
| Taux de tirage | exprimés en raretés, donc indépendants de la taille du catalogue |

## Marche à suivre — catalogue mondial 1000 (à lancer **sur ta machine**)

```bash
# 1. Découverte seule : combien de chaînes sont réellement atteignables ?
npm run catalog:source -- --dry-run
#    -> reports/candidates-1000.json (aucune écriture dans src/ ni public/)
#    Si le total est insuffisant : --pages 3, ou complète la liste curée.

# 2. Génération du catalogue + des portraits (reprenable, 600 px par défaut)
npm run catalog:source

# 3. Compléter les portraits manquants (même résolution)
npm run assets:regen

# 4. Valider et vérifier
npm run catalog:check      # 1000 attendus, rangs contigus, saisons couvertes
npm test                   # 65 tests, agnostiques à la taille du catalogue
npm run build              # export statique
```

Compter ~30 à 90 min pour l'étape 2 (découverte + ~1000 téléchargements
d'images). `src/data/catalog.config.json` passera tout seul à
`"expectedSize": 1000` et `"label": "Top 1000 Twitch"` : aucun composant à
toucher.

Les options sont listées en tête de `scripts/build-twitch-catalog.mjs`
(`--count`, `--languages`, `--pages`, `--concurrency`, `--dry-run`, `--seed`,
`--force`).

> ⚠️ Le script interroge l'API GQL **non officielle** de Twitch avec le
> Client-ID public du site web. Elle ne répond pas depuis un CI ou un sandbox
> (les domaines Twitch y sont filtrés) : lance-le depuis une machine connectée.
> Elle peut casser sans préavis — c'est un risque assumé du projet.

## Choisir la taille : ce que dit la simulation

`scripts/study-top-size.mjs` rejoue l'ouverture de boosters avec les taux réels
contre une population de N créateurs, pour estimer le temps de complétion
(30 simulations par ligne, rythme de 6 boosters/jour) :

```bash
node scripts/study-top-size.mjs                # 500 / 800 / 1000 / 2000
node scripts/study-top-size.mjs --counts 1200
```

| Top | Images 600 px | 50 % du catalogue | 90 % | Une saison (150) |
|---|---|---|---|---|
| 500 | 17 Mo | 15 jours | 55 jours | ~36 jours |
| 800 | 27 Mo | 24 jours | 88 jours | ~33 jours |
| **1000** | **34 Mo** | **30 jours** | **110 jours** | **~35 jours** |
| 2000 | 68 Mo | 60 jours | 221 jours | ~34 jours |

Deux enseignements : la **taille d'une saison** (150) fixe le rythme des
objectifs — elle ne bouge presque pas avec la taille du catalogue — tandis que
la **taille du catalogue** fixe la durée de vie de la collection complète, avec
un coût disque proportionnel.

## Budget images : la décision à prendre

Mesures réelles de ce dépôt (JPEG mozjpeg, `scripts/lib/avatars.mjs`) :

| Catalogue | Résolution | Poids moyen | Poids total |
|---|---|---|---|
| 500 (actuel) | 600 px | 34 Ko | **17 Mo** |
| 500 (avant) | 300 px | 17,6 Ko | 9,6 Mo |
| 1000 | 600 px | 34 Ko | ~34 Mo |
| **2000** | **600 px** | 34 Ko | **~68 Mo** |
| **2000** | **300 px** | 17,6 Ko | **~35 Mo** |

Conséquences :

- **600 px** : net sur écran Retina (une carte fait ~150-300 px CSS, donc 450-900
  pixels physiques), mais ~68 Mo de JPEG dans l'APK, la PWA et le dépôt Git.
  Chaque `assets:regen` re-télécharge et re-commite ces 68 Mo.
- **300 px** : ~35 Mo, deux fois moins lourd, au prix d'un léger flou sur les
  grandes cartes de révélation (le CDN Twitch ne sert jamais plus de 600 px).
- Un affichage mixte (600 px pour le top, 300 px pour le reste) est possible
  mais complique le pipeline pour un gain modeste.

**Décision retenue : 600 px**, pour la netteté sur écran Retina — en assumant
~34 Mo dans l'APK, la PWA et Git pour 1000 portraits, et donc un clone et un
`assets:regen` un peu plus lents qu'en 300 px (~17 Mo).

Changer d'avis plus tard est une simple variable d'environnement :

```bash
AVATAR_PX=300 npm run catalog:source   # tout regénérer en 300 px
AVATAR_PX=300 npm run assets:regen     # ou convertir l'existant
```

## Réglages de jeu à revoir après la bascule

Le catalogue quadruple, le temps de complétion aussi : ce sont les seuls
réglages à ajuster, tous dans des fichiers de données.

1. **Saisons** (`src/data/seasons.config.json`)
   - Le découpage est **automatique** : `seasonMaxSize` (défaut 150) borne chaque
     famille de jeux, `catchAll.maxSize` (défaut 60) borne le fourre-tout. Une
     famille trop large devient `S01-1/3`, `S01-2/3`… sans perdre son étiquette,
     et sans jamais couper une catégorie en deux.
   - Exemple mesuré sur un catalogue mondial simulé de 1962 créateurs : 21
     saisons, la plus grosse à 150, couverture 1962/1962.
   - Si tu veux des objectifs plus courts, baisse `seasonMaxSize` ; si tu
     préfères des saisons plus thématiques, déplace des catégories dans un
     groupe dédié plutôt que de monter la limite.
   - `pointsPerCreator` × taille de saison donne le total des points distribués
     par les paliers (aucun réglage à faire : le total est le même qu'avant les
     paliers, il est simplement versé en quatre fois). À 2000, les
     saisons rapportent mécaniquement plus de points.
2. **Boosters** (`src/lib/catalog.ts` → `PACKS`)
   - **Rien à changer à 1000.** La simulation donne 30 jours pour la moitié du
     catalogue et 110 jours pour 90 % à 6 boosters/jour, ce qui est le rythme
     visé. Le levier (`max`, `regenMs`) ne sert qu'au-delà de ~1500 cartes.
3. **Atelier** (`RARITY_META` : `craftCost`, `recycleValue`)
   - Les raretés sont proportionnelles (5 % de légendaires, soit 100 à 2000) :
     les coûts restent cohérents. Comme il y a 4× plus de communes, le recyclage
     rapporte plus vite — surveille `recycleValue` si l'artisanat devient trop
     facile.
4. **Taux de drop** (`src/data/pull-rates.json`)
   - Indépendants de la taille du catalogue : à ne toucher que si tu veux
     accélérer le rythme, pas par obligation.
   - `rareDrop.chancePermille` (Perfect) reste le même quelle que soit la taille :
     le pic de dopamine n'a pas besoin d'être plus fréquent.
   - Rappel : ces simulations ignorent l'Atelier. À 1000, l'artisanat (45 à 600
     points) raccourcit surtout la **fin** de collection — la « traîne » des
     dernières cartes, frustrante dans un TCG sans échange — au lieu d'accélérer
     le début.

## Ce qu'il faut vérifier après génération

- `npm run catalog:check` : « 2000 créateurs (attendu : 2000) », aucun rang
  manquant, aucune catégorie dupliquée entre deux saisons.
- Le nombre de portraits manquants doit être **0** ; sinon
  `npm run assets:regen` (il reprend où il s'est arrêté).
- `reports/top2000.json` : téléchargés / réutilisés / échecs, répartition des
  raretés.
- `reports/candidates-2000.json` : la liste des chaînes retenues, pour vérifier
  qu'il n'y a pas de doublons de nom ou de comptes de bots.

## Journal de compatibilité

- **Sauvegardes des joueurs** : une sauvegarde v2 (ou v1 migrée) reste valide
  quelle que soit la taille du catalogue. Les cartes dont le créateur a
  disparu du catalogue sont ignorées au chargement sans casser la partie.
- **Saisons déjà réclamées** : si un identifiant disparaît (un `S01` découpé en
  `S01-1`…, un `S07` en `S07-1`…), l'ancien identifiant est filtré au chargement
  et les nouveaux morceaux redeviennent réclamables — sans conséquence sur la
  progression, puisque les cartes restent acquises.
- **Version de sauvegarde** : inutile de l'incrémenter pour un changement de
  catalogue ; seules les nouveautés de format la font monter.
