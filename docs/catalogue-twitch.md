# Construire le catalogue Twitch : périmètre et taille

Le jeu ne code en dur ni la taille (« 500 ») ni le périmètre (« FR ») : passer
au monde entier, à 1000 ou à 2000 créateurs est un **changement de données**,
pas de code. Ce document est le mode d'emploi, avec les chiffres mesurés sur ce
dépôt.

> **Cible retenue : Top 1000 mondial, portraits 600 px.** Autrement dit le
> défaut du générateur, sans aucune option à passer. Les raisons sont détaillées
> dans « Choisir la taille » ci-dessous.

## La cadence : quand le catalogue bouge, et ce que ça coûte

Le catalogue vit **deux fois** : embarqué dans l'APK (`src/data/creators.json`,
portraits compris) et recopié dans le projet Supabase (`0003_catalogue.sql`)
pour ce qui est décidé par le serveur — le tirage, le drapeau `retired`, la
comptabilité de collection. Les deux viennent du même fichier, et **les deux
doivent avancer ensemble**.

C'est le prix de l'embarqué, et il est voulu : le catalogue dans l'APK rend le
classeur, les filtres et les portraits instantanés **sans réseau**, et c'est lui
que le joueur voit — un catalogue servi à la demande ferait clignoter le
classeur au premier écran sans connexion. Ce qui en découle :

* un créateur qui entre ou sort du classement Twitch **n'atteint le téléphone
  qu'au prochain APK** (et l'ancien continue de fonctionner entre-temps : les
  cartes déjà tirées restent valides, et un créateur absent du nouveau Top passe
  en « Sortant » au lieu de disparaître) ;
* **deux gestes, dans cet ordre** : régénérer (`npm run catalog:source`), puis
  rejouer `0003_catalogue.sql` (`npx supabase db push --include-all`). L'écart
  entre les deux copies se voit de deux façons, et elles ne se valent pas :

  1. **base en avance sur l'APK** (le cas qu'on veut) : la base peut tirer un
     créateur que l'APK ne connaît pas encore, et l'écran affiche alors
     « Ce créateur » — le temps que l'APK suive, rien n'est perdu ;
  2. **APK en avance sur la base** : les cartes de ces créateurs ne sont pas
     dans le catalogue du serveur, donc la sauvegarde devient **suspecte**
     (`save_suspicions`, `0019`) — le joueur garde ses cartes, mais **il sort du
     classement** jusqu'à ce que la base rattrape.

  D'où la règle : **poser `0003_catalogue.sql` d'abord** (`db push`), et
  distribuer l'APK ensuite. Jamais l'inverse, et jamais d'écart qui dure ;
* la cadence retenue est celle des **saisons**, pas des mouvements quotidiens du
  classement : le Top 1000 bouge tous les jours à sa marge, et courir après
  chaque place coûterait un APK par jour pour rien.

Ce qui n'est **pas** dans l'APK bouge tout seul : les points, les jetons, les
tirages, les ventes, l'Arène et les classements vivent au serveur et suivent
sans rebuild. La séparation est donc : *ce qui habille* est embarqué, *ce qui
compte* est au serveur.

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

**Familles : la langue, pas le jeu.** Les chaînes sont classées par **langue de
diffusion** (champ `region` écrit par le générateur). C'est le seul axe qui ne
mente pas : un streameur change de jeu toutes les semaines, pas de langue, et
Twitch ne publie de toute façon **aucune** information de jeu pour une chaîne
hors direct. La configuration (`src/data/seasons.config.json`) déclare neuf
familles et leurs langues :

| Famille | Langues |
|---|---|
| S01 France & francophonie | `fr` |
| S02 Espagne & Amérique latine | `es` |
| S03 Brésil & Portugal | `pt` |
| S04 Anglophonie | `en` |
| S05 Europe du Nord & germanique | `de`, `nl`, `sv`, `da`, `no`, `fi`, `is` |
| S06 Europe de l'Est | `ru`, `uk`, `pl`, `cs`, etc. |
| S07 Europe du Sud | `it`, `el`, `ca`, etc. |
| S08 Asie | `ko`, `ja`, `zh`, `th`, `vi`, etc. |
| S09 Moyen-Orient & Afrique | `ar`, `tr`, `fa`, etc. |
| S10 Sans frontière | langue absente ou non listée |

Comment la famille est décidée, dans l'ordre : **langue observée** en direct
(`Stream.language`) puis, hors direct, le groupe de la tête d'affiche dans
`CURATED_REGIONS` (les 206 logins curés sont répartis par famille), et sinon
« Sans frontière ». La traduction langue → famille vit dans
`scripts/lib/regions.mjs`, ses cas limites (langue absente, variante régionale,
langue inconnue) sont figés par `src/lib/regions.test.ts`.

**Étiquettes de jeu.** Elles ne sont plus déduites : la carte affiche la famille
(stable), et le jeu n'apparaît que s'il a été **observé en direct**. Hors direct,
l'étiquette vaut « Variété & Live » — c'est ce qui évite les cartes légendaires
en « Among Us » (`ibai`) ou « Magic: The Gathering » (`coscu`). Si l'API Twitch
refuse un jour le champ `language`, le générateur rejoue la requête sans lui et
le signale : les familles retombent alors sur la liste curée, la génération
aboutit quand même.

> ⚠️ Le classement est échantillonné au moment de la génération (directs du
> moment + listes curées). C'est une photo, pas un classement officiel : relance
> la génération pour la rafraîchir.

## Ce qui est déjà prêt

| Élément | État |
|---|---|
| Libellés de l'application (« Top 1000 », « Classeur (1000) », jalons d'objectifs) | dérivés de `CATALOG_SIZE` (`src/lib/catalog.ts`) |
| Raretés | échelle en part du classement (`scripts/lib/rarity-ladder.mjs`), pas en rangs fixes |
| Saisons | calculées depuis `seasons.config.json` ; toute saison est découpée automatiquement au-delà de `seasonMaxSize` (150), le fourre-tout au-delà de 60 |
| Validation | `npm run catalog:check` compare la taille réelle à `src/data/catalog.config.json` (`--expect N` pour forcer) |
| Générateur | `scripts/build-twitch-catalog.mjs --count N`, avec pagination Twitch et reprise sur incident |
| Taux de tirage | exprimés en raretés, donc indépendants de la taille du catalogue |

## Marche à suivre — catalogue mondial 1000 (à lancer **sur ta machine**)

#### Sur macOS / Linux (bash)

```bash
# 1. Découverte seule : combien de chaînes sont réellement atteignables ?
npm run catalog:source -- --dry-run
#    -> reports/candidates-1000.json (aucune écriture dans src/ ni public/)

# 2. Génération du catalogue + des portraits (reprenable, 600 px par défaut)
npm run catalog:source

# 3. Compléter les portraits manquants (même résolution)
npm run assets:regen

# 4. Valider et vérifier
npm run catalog:check && npm test && npm run build
```

#### Sous Windows (PowerShell)

PowerShell ne sait pas transmettre les options à travers npm : dans
`npm run catalog:source -- --dry-run`, le `--` est avalé et **le drapeau est
ignoré en silence**. Sur `--dry-run`, la conséquence serait grave — la
« simulation » lancerait une vraie génération, écrirait dans `src/data/` et
`public/creators/` et interrogerait Twitch. On passe donc par une commande
native, ou par une variable d'environnement :

```powershell
# 1. Découverte seule (node reçoit l'option telle quelle)
node scripts/build-twitch-catalog.mjs --dry-run

# … ou l'équivalent par variable d'environnement
$env:DRY_RUN = "1"; npm run catalog:source

# 2. Génération réelle
npm run catalog:source

# 3. Portraits manquants
npm run assets:regen

# 4. Vérifications (une commande par ligne : « && » n'existe pas
#    dans Windows PowerShell 5.1)
npm run catalog:check
npm test
npm run build
```

**Si la découverte ne ramène pas assez de chaînes** : `PAGES=3` (`--pages 3`), ou
complète la liste curée dans le script.

Les variables d'environnement reconnues : `TOP_N`, `PAGES`, `TOP_LANGUAGES`,
`AVATAR_PX`, `DRY_RUN`, `FORCE`.

> ⚠️ Une variable posée reste active pour **toute la session PowerShell**. Si tu
> as fait `$env:DRY_RUN = "1"` puis que tu lances la génération réelle dans la
> même fenêtre, elle refera une simple mesure — sans rien casser, mais sans rien
> produire non plus. D'où la forme recommandée pour la mesure (commande native,
> aucune variable laissée derrière) :
>
> ```powershell
> node scripts/build-twitch-catalog.mjs --dry-run
> ```
>
> Et si tu as posé une variable, retire-la :
> `Remove-Item Env:DRY_RUN`, `Remove-Item Env:TOP_N`, etc.

Compter ~30 à 90 min pour l'étape 2 (découverte + ~1000 téléchargements
d'images). `src/data/catalog.config.json` passera tout seul à
`"expectedSize": 1000` et `"label": "Top 1000 Twitch"` : aucun composant à
toucher.

### Après la génération : lire la sortie de `catalog:check`

Le rapport affiche les familles **telles que l'application les découpe** :

```text
S01 France & francophonie — 138 créateurs (1 langue(s))
S04 Anglophonie — 402 créateurs (1 langue(s)) → découpée en 3 vagues (150 + 150 + 102)
S10 Sans frontière — 34 créateurs (langues non listées ou inconnues)
```

Deux avertissements sont normaux après une génération mondiale :

- **« créateurs sans famille connue »** : leur langue n'a pas été reconnue (ou le
  catalogue date d'avant les régions). Ils sont rangés dans « Sans frontière » —
  jamais perdus. Pour en récupérer une partie, ajoute la langue manquante à une
  famille dans `seasons.config.json`.
- **« portrait manquant »** : à corriger avec `npm run assets:regen` (le script
  est reprenable, il ne retélécharge pas ce qui est déjà bon).
- **« portrait uni (avatar par défaut Twitch) »** : la chaîne n'a pas de photo
  de profil, et Twitch sert son avatar par défaut — un carré parfaitement plat.
  Le fichier existe, fait la bonne taille, et donne un rectangle sombre à la
  place d'un visage (`j0niq`, `toaststix`). `assets:regen` les détecte (écart
  de type nul) et écrit à la place le **portrait de secours** : dégradé,"
  silhouette et initiale. Il ne faut pas le confondre avec un vrai logo sombre :
  le seuil est très bas — une image qui varie un tant soit peu passe.

Si une famille devient trop grosse (l'anglophonie, typiquement), elle se découpe
toute seule en vagues de `waveSize` (défaut 150), par ordre de classement : la
première vague d'une famille, ce sont ses têtes d'affiche. Pour des objectifs
plus courts encore, baisse `waveSize` — c'est le seul réglage à toucher.

Les options sont listées en tête de `scripts/build-twitch-catalog.mjs`
(`--count`, `--languages`, `--pages`, `--concurrency`, `--dry-run`, `--seed`,
`--force`).

| Sous bash | Sous PowerShell |
|---|---|
| `npm run catalog:source -- --dry-run` | `$env:DRY_RUN = "1"; npm run catalog:source` |
| `npm run catalog:source -- --count 2000` | `$env:TOP_N = "2000"; npm run catalog:source` |
| `npm run catalog:source -- --pages 3` | `$env:PAGES = "3"; npm run catalog:source` |
| `npm run catalog:source -- --languages FR` | `$env:TOP_LANGUAGES = "FR"; npm run catalog:source` |
| `AVATAR_PX=300 npm run catalog:source` | `$env:AVATAR_PX = "300"; npm run catalog:source` |
| `a && b` | une commande par ligne (`&&` arrive avec PowerShell 7) |
| `./gradlew` | `npm run android:debug` (le script choisit `gradlew.bat`) |

### Si une source revient vide

L'API GQL de Twitch n'est pas documentée et répond parfois par une **erreur
GraphQL** au lieu de données — que le code lisait autrefois comme « 0 résultat ».
Un diagnostic est intégré :

```bash
node scripts/build-twitch-catalog.mjs --probe     # ou : $env:PROBE = "1"
```

La sonde teste trois formes de la requête de direct (mondiale sans filtre,
langues principales, FR) et affiche, pour chacune, le nombre de chaînes **et les
erreurs GraphQL éventuelles**. Aucune écriture.

Constat de la première génération mondiale : la requête mondiale **sans filtre de
langue** revient vide (0 chaîne), alors que la pagination **par jeux** — non
filtrée elle aussi — a ramené 2 154 chaînes. Le script bascule donc
automatiquement, et seulement dans ce cas, sur les langues principales de
diffusion (`WORLD_LIVE_LANGUAGES`, 12 langues). Le classement final, lui, ne
dépend pas de ce repli : ce n'est qu'un bonus pour rattraper les grosses chaînes
en direct.

> ⚠️ Le script interroge l'API GQL **non officielle** de Twitch avec le
> Client-ID public du site web. Elle ne répond pas depuis un CI ou un sandbox
> (les domaines Twitch y sont filtrés) : lance-le depuis une machine connectée.
> Elle peut casser sans préavis — c'est un risque assumé du projet.

## Embarquer le catalogue dans l'APK

Le catalogue est un **fichier de données versionné** (`src/data/creators.json`,
`src/data/catalog.config.json`) accompagné des portraits (`public/creators/`).
La CI construit l'APK à partir du dépôt : pour que l'APK contienne le catalogue
généré sur ta machine, il faut donc le committer.

```powershell
# 1. Compléter les portraits manquants et supprimer les orphelins
node scripts/regen-avatars.mjs --prune

# 2. Vérifier ce qui sera embarqué (échec si un portrait manque ou est orphelin)
npm run catalog:ci

# 3. Committer le catalogue (données + images)
git add src/data/creators.json src/data/catalog.config.json public/creators
git status --short          # ~1000 ajouts, ~370 suppressions attendues
git commit -m "data(catalogue): Top 1000 mondial — 1000 portraits 600 px"
git push
```

Puis lancer le build Android : le workflow se déclenche tout seul à chaque push
sur `main` (donc à la fusion de la PR), ou à la demande sur une branche :

```powershell
gh workflow run "APK Android (debug)" --ref arena/01a10b32-test
# … ou : GitHub → Actions → « APK Android (debug) » → Run workflow → choisir la branche
```

L'APK apparaît ensuite sur la pré-release roulante (voir le README).

### Pourquoi `--prune` est important

Une régénération qui change de périmètre ne supprime rien : les anciens
portraits restent sur le disque, partent dans l'APK **et** dans Git sans jamais
être affichés. Passer d'un Top 500 FR à un Top 1000 mondial laisse ainsi
plusieurs centaines de fichiers inutilisés. `--prune` les retire, et
`npm run catalog:ci` refuse de construire un APK qui en contient — ou auquel il
manque un portrait.

### Poids à prévoir

`catalog:ci` affiche le poids réel des portraits embarqués :

```text
   Portraits : 16.6 Mo utilisés dans l'APK
```

Les portraits embarqués sont en **WebP** depuis le 7 octobre 2026 (qualité 78,
600 px — `encodeAvatar()` dans `scripts/lib/avatars.mjs`) : les **1000
portraits** du dépôt pèsent **16,6 Mo** au lieu de **29,0 Mo** en JPEG, et
`PORTRAIT_EXT` (`scripts/lib/portraits.mjs`) est la seule source de l'extension
— le catalogue, l'écran, l'affiche de partage et les scripts la lisent. Les
tableaux ci-dessous datent du JPEG : ils restent vrais pour comparer les
résolutions (600 px contre 300 px), pas pour annoncer le poids du dépôt.

Chaque commit de catalogue ajoute ce poids à l'historique Git, définitivement.
Deux habitudes pour que ça reste supportable : régénérer rarement et en une
seule fois, et **squasher** la fusion de la PR pour ne pas multiplier les
versions d'images dans l'historique.

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
`assets:regen` un peu plus lents qu'en 300 px (~17 Mo). La décision tient
toujours, et le **WebP** l'a rendue moins chère : **16,6 Mo** mesurés pour les
1000 portraits du dépôt, contre 29,0 Mo en JPEG.

Changer d'avis plus tard est une simple variable d'environnement :

```bash
AVATAR_PX=300 npm run catalog:source   # tout regénérer en 300 px
AVATAR_PX=300 npm run assets:regen     # ou convertir l'existant
```

```powershell
$env:AVATAR_PX = "300"   # puis les mêmes commandes npm
npm run catalog:source
npm run assets:regen
```

## Réglages de jeu à revoir après la bascule

Le catalogue quadruple, le temps de complétion aussi : ce sont les seuls
réglages à ajuster, tous dans des fichiers de données.

1. **Saisons** (`src/data/seasons.config.json`)
   - Le découpage est **automatique** : `waveSize` (défaut 150) borne chaque
     famille, `catchAll.maxSize` borne le fourre-tout. Une famille trop large
     devient `S04-1/3`, `S04-2/3`… sans perdre son étiquette.
   - Si tu veux des objectifs plus courts, baisse `waveSize` ; si les familles
     ne te plaisent pas, déplace une langue d'une famille à une autre plutôt que
     de monter la limite.
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

## Les Sortants : ce que fait une rotation

Une régénération ne remplace pas le catalogue, elle le **déplace**. Un créateur
qui tombe au-delà du rang N n'a pas disparu du jeu : ses cartes sont dans des
classeurs, dans des échanges, en vente à l'hôtel. La génération l'écrit donc
dans `src/data/retired.json` au lieu de le jeter, avec deux champs :

- `retiredEdition` : l'édition du catalogue pendant laquelle il est parti. C'est
  aussi le numéro d'édition de **son départ** — `editionNumber` de
  `src/data/catalog.config.json`, incrémenté à chaque régénération.
- `retiredAt` : la date du constat.

Ce qu'un Sortant devient, côté jeu :

| | Sortant |
|---|---|
| Booster | **jamais tiré** (côté serveur comme dans le moteur local) |
| Complétion (« X / 1000 ») | **hors périmètre** — la complétion se mesure sur le catalogue courant, sinon 100 % deviendrait inatteignable |
| Classeur, échange, hôtel, Last Pack, vitrine, affiche | carte **valide comme les autres** |
| Atelier | artisanable **pendant l'édition de son départ** seulement, et **jamais** une Légendaire |
| Sa ligne en base | **jamais supprimée** (sa carte circule encore) |

Deux règles écrites dans le code, à ne pas perdre de vue :

- **un slug revenu au classement gagne** : `RETIRED_CREATORS` ignore un Sortant
  dont le slug est dans `creators.json`, et `writeRetired` retire les revenants
  du fichier à la génération suivante. Un retour est donc un non-événement ;
- **`writeRetired` n'écrase jamais un Sortant existant** : sa fenêtre
  d'artisanat court depuis son départ, pas depuis la dernière génération.

Ce qu'une rotation demande côté Supabase : régénérer `0003_catalogue.sql`
(`npm run supabase:catalogue`, la colonne `retired` suit) puis poser
`supabase/migrations/0016_sortants.sql`, qui fait lire ce drapeau au tirage, à
la complétion et au Paquet Scène. Le détail des migrations est dans le README.

Un exemple complet, à blanc : `sf6` quitte le classement à l'édition 2.

```text
src/data/creators.json      1000 → 999 créateurs (sf6 retiré)
src/data/retired.json       { creators: [{ slug: "sf6", …,
                              retiredEdition: 2, retiredAt: "…" }] }
src/data/catalog.config.json editionNumber : 1 → 2
```

Résultat en jeu : `sf6` sort des boosters et de la complétion, sa carte reste
dans les classeurs, et l'Atelier le propose encore jusqu'à l'édition 3 — ensuite
il n'appartient plus qu'à ceux qui l'ont. L'accueil annonce la fenêtre :
« 1 Sortant encore artisanable · dernière édition ».

## Ce qu'il faut vérifier après génération

- `npm run catalog:check` : « 2000 créateurs (attendu : 2000) », aucun rang
  manquant, aucune langue déclarée deux fois, aucune famille inconnue.
- Le nombre de portraits manquants doit être **0** ; sinon
  `npm run assets:regen` (il reprend où il s'est arrêté).
- Aucun « portrait uni » : `catalog:check` décode les fichiers suspects
  (moins de 8 Ko) et signale ceux dont l'écart-type est nul — un avatar par
  défaut de Twitch n'est pas une photo. En mode strict (`catalog:ci`, celui de
  la CI Android), c'est un **échec**, pas un avertissement.
- `reports/top2000.json` : téléchargés / réutilisés / échecs, répartition des
  raretés.
- `reports/candidates-2000.json` : la liste des chaînes retenues, pour vérifier
  qu'il n'y a pas de doublons de nom ou de comptes de bots.
- `src/data/retired.json` : les Sortants de la rotation, avec leur numéro
  d'édition (voir « Les Sortants » ci-dessus). Fichier vide = catalogue inchangé,
  et c'est le cas normal à chaque lancement.

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
