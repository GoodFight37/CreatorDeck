# Taux de drop publiés

Mise à jour du 10 octobre 2026 : les poids sont **nominaux**. Le tirage sans
doublon, les raretés absentes d'une famille et la réserve du cinquième slot
conditionnent les probabilités observées. Scène pleine reste à 0,3 % ; elle
donne cinq Épiques si la famille en possède cinq éligibles, sinon tous ceux
disponibles et un complément autorisé, avec Rare/Épique en cinquième position.
Voir [le correctif local, la méthode et les limites Supabase](audit-progression.md).
Les descriptions historiques ci-dessous ne constituent pas une preuve de
parité du comportement serveur sur les petits viviers.

CreatorDeck publie les probabilités de ses boosters — dans l'application
(Accueil → « Taux de drop publiés », et Toi → **Progression** → « Taux de
drop ») comme dans ce dépôt. Elles sont **calculées** depuis le fichier qui sert réellement au
tirage : aucun chiffre n'est recopié à la main, donc l'affichage ne peut pas
diverger du moteur.

## Source de vérité

`src/data/pull-rates.json` décrit, pour chaque booster :

| Clé | Rôle |
|---|---|
| `slotCount` / `slots[]` | une table de poids par carte ordinaire ; les taux montent au fil du booster |
| `guaranteed` | le dernier slot, garanti Rare ou mieux |
| `variants` | chances de variante cosmétique (Holo, et **Gold sur une Légendaire**) |
| `rareDrop` | l'événement « Perfect » : chance, poids et amélioration de variante |
| `direct` | le **bonus Direct** : poids des créateurs en direct et chance de variante Live |
| `pity` | le **plancher de malchance** : au bout de `threshold` boosters sans Légendaire, le dernier slot en garantit une |

Exemple (extrait réel) :

```json
"slots": [
  { "weights": { "common": 42, "uncommon": 30, "rare": 18, "epic": 8, "legendary": 2 } },
  { "weights": { "common": 20, "uncommon": 34, "rare": 28, "epic": 15, "legendary": 3 } }
],
"guaranteed": { "weights": { "rare": 82, "epic": 15, "legendary": 3 } },
"direct": { "creatorBias": 1.5, "livePermille": 200, "variant": "live" },
"pity": { "label": "Légendaire garanti", "threshold": 12 }
```

Le moteur (`src/lib/game-engine.ts`, fonction `chooseCreator`) tire d'abord une
rareté selon ces poids, puis un créateur **dans** cette rareté : les poids
**sont** les probabilités affichées.

## La variante Gold

Une Légendaire tirée ordinairement a **1 %** de chance d'être Gold
(`variants.goldPermille = 100`, sur les 10 000 du tirage de variante). Le
« Perfect » en donne aussi, presque systématiquement (`variantUpgradePermille`),
mais sans ce taux, la Gold **n'existait pas** en dehors de lui : une Légendaire
ordinaire ne pouvait jamais être dorée. Le taux vit dans le fichier,
le moteur comme le serveur le lisent, et un test miroir compare
`pull-rates.json` à `0030_gold.sql` : un taux changé d'un seul côté casse le test.

Le **Paquet Scène** n'a pas de `goldPermille` — il ne donne jamais de
Légendaire, donc jamais de Gold, et le fichier le dit en l'omettant.

## Le plancher de malchance

`pity` est publié comme le reste, et pour la même raison : une garantie qu'on
ne peut pas lire n'est pas une garantie, c'est une rumeur. Trois choses sont
dites :

* le **seuil** (**12** boosters) : après
  12 boosters d'affilée sans Légendaire, le 5ᵉ slot en garantit une — c'est-à-dire
  que le joueur n'attend jamais plus de 12 boosters, quelle que soit sa chance.
  Le seuil vit dans `pull-rates.json` et dans `0031_pity_douze.sql`, et un test
  miroir compare les deux ;
* la **probabilité de l'atteindre** (`packOdds().pity.active`), calculée à
  l'affichage comme la chance de n'avoir aucune Légendaire sur les boosters qui
  précèdent — le joueur sait si c'est un secours rare ou une mécanique qu'il
  verra souvent ;
* le **compteur en cours** (« 68 boosters depuis ton dernier Légendaire, encore
  12 »), lu dans la partie — ou, quand un compte est connecté, dans le chiffre
  du serveur, qui est celui qui décidera du tirage.

Le compteur repart de zéro dès qu'un Légendaire tombe, **quel que soit le
slot** : la garantie n'a plus rien à rattraper. Moteur local et
`open_pack()` appliquent la même règle ; `src/lib/supabase-progression.test.ts`
et les contrôles du Postgres jetable vérifient que le serveur suit bien le
fichier de taux.

## Le bonus Direct

`direct` ne change **aucune** des probabilités ci-dessus : les raretés tombent
exactement comme la table les annonce. Ce qui change, c'est *qui* tombe et
*sous quelle matière* :

- un créateur qui streame au moment du tirage **pèse ×1,5** dans sa rareté
  (`creatorBias`) : il tombe plus souvent ;
- sa carte a **20 %** de chance d'être en variante Live (`livePermille`), et la
  carte garantie est Live quand son créateur streame — c'est le moment fort du
  paquet.

Sans information **fraîche** sur le direct (cache de plus de dix minutes, table
absente, aucun streamer), le bonus est neutre et **aucune** carte Live ne sort :
une variante « Live » qui désignerait quelqu'un qui ne streame pas ne vaudrait
rien.

Le serveur applique la même règle (`supabase/migrations/0011_direct.sql`), et
deux tests verrouillent la correspondance : `src/lib/supabase-direct.test.ts`
(les valeurs) et `scripts/verify-supabase-migrations.mjs` (l'exécution).

## Le Paquet Scène

Le second paquet du jeu a sa propre table (`packs.scene`), publiée elle aussi —
le même écran « Taux de drop » l'affiche, avec un sélecteur entre les deux
paquets. Trois différences avec le Live Drop, et elles sont **écrites** :

- **aucun poids légendaire** : les quatre raretés proposées sont commune,
  peu commune, rare et épique. Le Paquet Scène complète une famille, il ne
  remplace pas le plancher de malchance ;
- **une garantie** (`guaranteed`) porte sur le dernier emplacement : au moins
  une rare (70 %) ou une épique (30 %), et le tirage rare (`rareDrop`, 3 ‰)
  peut ajouter un épique — c'est le même mécanisme que le « Rare Pack » du
  Live Drop, avec ses propres poids ;
- **la chance tombe une fois par jour de jeu** (6 h UTC), pas par réserve de
  boosters : il n'y a pas de sablier à attendre, seulement une journée à
  tourner.

`src/lib/supabase-scene.test.ts` compare la table publiée aux littéraux de
`supabase/migrations/0014_scene_pack.sql` : si l'un bouge sans l'autre, `npm
test` échoue. Le serveur, lui, ne fait pas que lire ces poids — il vérifie que
les cartes rendues correspondent à une liste qu'il a lui-même tirée.

## Calcul des chiffres publiés

`src/lib/pull-rates.ts` (`packOdds`) transforme ces tables en trois lectures :

- **par carte** : probabilité marginale qu'une carte d'un booster soit d'une rareté ;
- **au moins 1** : probabilité qu'un booster contienne au moins une carte de cette rareté ;
- **détail par slot**, avec la part de l'événement Perfect mélangée au prorata de sa chance.

À l'écran, tout est en **tableaux** — les taux par rareté, le direct, le plancher
de malchance — et les explications longues restent dans `pull-rates.json` :
l'écran est en lecture seule, une ligne et un chiffre à la fois.

## Modifier les taux

1. éditer `src/data/pull-rates.json` ;
2. `npm test` — les tests vérifient que les tables couvrent exactement la taille
   des boosters, que chaque rareté reste atteignable et que les probabilités
   somment à 100 % ;
3. si le changement touche `direct` (ou un seuil de variante), répercuter la
   valeur dans `supabase/migrations/0011_direct.sql` : `npm test` échoue tant
   que le serveur n'a pas suivi ;
4. `npm run catalog:check` — validation globale des données du jeu.

## Pourquoi publier ces taux

- **Conformité** : Google Play impose de divulguer les probabilités des objets
  aléatoires (« loot boxes ») avant tout achat, et l'App Store applique la même
  exigence depuis 2017.
- **Confiance** : le joueur peut vérifier lui-même la rareté des Légendaires
  plutôt que de la subir.

## Attribution

Le format des tables par slot et l'événement « Rare Pack » s'inspirent du
dataset [pokemon-tcg-pocket-database](https://github.com/flibustier/pokemon-tcg-pocket-database)
(licence MIT), dont le fichier `pullRates.json` documente les taux réels de
Pokémon TCG Pocket. CreatorDeck ne réutilise aucune donnée Pokémon : seuls le
modèle de données et le vocabulaire des probabilités sont repris.
