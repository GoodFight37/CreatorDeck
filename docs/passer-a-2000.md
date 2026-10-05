# Passer à un Top 1000 / 2000 Twitch FR

Le jeu n'a plus aucune taille codée en dur : passer de 500 à 2000 créateurs est
un **changement de données**, pas de code. Ce document est le mode d'emploi,
avec les chiffres mesurés sur ce dépôt.

## Ce qui est déjà prêt

| Élément | État |
|---|---|
| Libellés de l'application (« Top 500 », « Classeur (500) », jalons d'objectifs) | dérivés de `CATALOG_SIZE` (`src/lib/catalog.ts`) |
| Raretés | échelle en part du classement (`scripts/lib/rarity-ladder.mjs`), pas en rangs fixes |
| Saisons | calculées depuis `seasons.config.json` ; le fourre-tout « Découverte » est découpé automatiquement en morceaux de ≤ 60 |
| Validation | `npm run catalog:check` compare la taille réelle à `src/data/catalog.config.json` (`--expect N` pour forcer) |
| Générateur | `scripts/build-twitch-fr.mjs --count N`, avec pagination Twitch et reprise sur incident |
| Taux de tirage | exprimés en raretés, donc indépendants de la taille du catalogue |

## Marche à suivre (à lancer **sur ta machine**)

```bash
# 1. Découverte seule : combien de chaînes FR sont réellement atteignables ?
npm run catalog:source -- --count 2000 --dry-run
#    -> reports/candidates-2000.json (aucune écriture dans src/ ni public/)
#    Si le total est insuffisant : --pages 3, ou complète CURATED_FR_LOGINS.

# 2. Génération du catalogue + des portraits (reprenable)
npm run catalog:source -- --count 2000
#    AVATAR_PX=300 pour rester léger (voir budget ci-dessous)

# 3. Compléter les portraits dans la résolution choisie
npm run assets:regen

# 4. Valider et vérifier
npm run catalog:check      # 2000 attendus, rangs contigus, saisons couvertes
npm test                   # 58 tests, agnostiques à la taille du catalogue
npm run build              # export statique
```

`npm run catalog:source -- --help` n'existe pas : les options sont listées en
tête de `scripts/build-twitch-fr.mjs` (`--count`, `--pages`, `--concurrency`,
`--dry-run`, `--seed`, `--force`).

> ⚠️ Le script interroge l'API GQL **non officielle** de Twitch avec le
> Client-ID public du site web. Elle ne répond pas depuis un CI ou un sandbox
> (les domaines Twitch y sont filtrés) : lance-le depuis une machine connectée.
> Elle peut casser sans préavis — c'est un risque assumé du projet.

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

Choix par défaut recommandé pour 2000 : **`AVATAR_PX=300`**. Le code reste
identique, seule la variable d'environnement change :

```bash
AVATAR_PX=300 npm run catalog:source -- --count 2000
AVATAR_PX=300 npm run assets:regen
```

## Réglages de jeu à revoir après la bascule

Le catalogue quadruple, le temps de complétion aussi : ce sont les seuls
réglages à ajuster, tous dans des fichiers de données.

1. **Saisons** (`src/data/seasons.config.json`)
   - Regarde la sortie de `npm run catalog:check` : si une saison dépasse ~150
     créateurs (typiquement « Découverte » ou un gros jeu comme *Just Chatting*),
     déplace des catégories dans un groupe dédié, ou baisse `catchAll.maxSize`.
   - `pointsPerCreator` × taille de saison donne la récompense : à 2000, les
     saisons rapportent mécaniquement plus de points.
2. **Boosters** (`src/lib/catalog.ts` → `PACKS`)
   - `max` et `regenMs` : à 2000 cartes, ouvrir 4 boosters/h ne suffit plus pour
     sentir une progression. Passer le Live à `max: 5-6` et/ou `regenMs` à
     45 min est le levier le plus direct.
3. **Atelier** (`RARITY_META` : `craftCost`, `recycleValue`)
   - Les raretés sont proportionnelles (5 % de légendaires, soit 100 à 2000) :
     les coûts restent cohérents. Comme il y a 4× plus de communes, le recyclage
     rapporte plus vite — surveille `recycleValue` si l'artisanat devient trop
     facile.
4. **Taux de drop** (`src/data/pull-rates.json`)
   - Indépendants de la taille du catalogue : à ne toucher que si tu veux
     accélérer le rythme, pas par obligation.
   - `rareDrop.chancePermille` (Perfect) reste le même à 2000 : le pic de
     dopamine n'a pas besoin d'être plus fréquent.

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
- **Saisons déjà réclamées** : si l'identifiant d'une saison change (un
  fourre-tout `S07` découpé en `S07-1`…`S07-8`), l'ancien identifiant est
  filtré et la nouvelle saison redevient réclamable — sans conséquence sur la
  progression puisque les cartes restent.
- **Version de sauvegarde** : inutile de l'incrémenter pour un changement de
  catalogue ; seules les nouveautés de format la font monter.
