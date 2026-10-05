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
| `guaranteed` | le dernier slot, garanti (et sa variante imposée pour le Live) |
| `variants` | chances de variante cosmétique (Holo / Gold) |
| `rareDrop` | l'événement « Perfect » : chance, poids et amélioration de variante |

Exemple (extrait réel) :

```json
"slots": [
  { "weights": { "common": 42, "uncommon": 30, "rare": 18, "epic": 8, "legendary": 2 } },
  { "weights": { "common": 20, "uncommon": 34, "rare": 28, "epic": 15, "legendary": 3 } }
],
"guaranteed": { "weights": { "rare": 82, "epic": 15, "legendary": 3 }, "variant": "live" }
```

Le moteur (`src/lib/game-engine.ts`, fonction `chooseCreator`) tire d'abord une
rareté selon ces poids, puis un créateur uniformément dans cette rareté : les
poids **sont** les probabilités affichées.

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
3. `npm run catalog:check` — validation globale des données du jeu.

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
