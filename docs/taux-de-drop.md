# Taux de drop publiés

CreatorDeck publie les probabilités de ses boosters — dans l'application
(Accueil → « Taux de drop publiés », et Profil → même entrée) comme dans ce
dépôt. Elles sont **calculées** depuis le fichier qui sert réellement au
tirage : aucun chiffre n'est recopié à la main, donc l'affichage ne peut pas
diverger du moteur.

## Source de vérité

`src/data/pull-rates.json` décrit, pour chaque booster :

| Clé | Rôle |
|---|---|
| `slotCount` / `slots[]` | une table de poids par carte ordinaire ; les taux montent au fil du booster |
| `guaranteed` | le dernier slot, garanti Rare ou mieux |
| `variants` | chances de variante cosmétique (Holo / Gold) |
| `rareDrop` | l'événement « Perfect » : chance, poids et amélioration de variante |
| `direct` | le **bonus Direct** : poids des créateurs en direct et chance de variante Live |

Exemple (extrait réel) :

```json
"slots": [
  { "weights": { "common": 42, "uncommon": 30, "rare": 18, "epic": 8, "legendary": 2 } },
  { "weights": { "common": 20, "uncommon": 34, "rare": 28, "epic": 15, "legendary": 3 } }
],
"guaranteed": { "weights": { "rare": 82, "epic": 15, "legendary": 3 } },
"direct": { "creatorBias": 1.5, "livePermille": 200, "variant": "live" }
```

Le moteur (`src/lib/game-engine.ts`, fonction `chooseCreator`) tire d'abord une
rareté selon ces poids, puis un créateur **dans** cette rareté : les poids
**sont** les probabilités affichées.

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

## Calcul des chiffres publiés

`src/lib/pull-rates.ts` (`packOdds`) transforme ces tables en trois lectures :

- **par carte** : probabilité marginale qu'une carte d'un booster soit d'une rareté ;
- **au moins 1** : probabilité qu'un booster contienne au moins une carte de cette rareté ;
- **détail par slot**, avec la part de l'événement Perfect mélangée au prorata de sa chance.

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
