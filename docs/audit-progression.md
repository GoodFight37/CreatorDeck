# Audit reproductible du moteur local — 10 octobre 2026

Branche `design/booster-reveal-polish`, code exécuté au commit
`7da3d1c301c949e6cbeaef6aecd6ec0c94ffe2f1`. Audit fourni par l'utilisateur
depuis son clone Windows après mise à jour de la branche. Il porte sur le
moteur TypeScript local, pas Supabase, et n'entraîne aucun déploiement.

## Résultat validé

Commande : `npm run progression:bilan -- --runs=1000 --seed=20261010`.
Le fichier fourni confirme le fuseau `Europe/Paris`, Mulberry32, 12 scénarios
et 12 000 trajectoires. Les 12 scénarios couvrent trois profils, deux durées
(7 et 30 jours) et deux stratégies. La métrique `missingPacks` vaut zéro dans
chaque scénario. Les statistiques détaillées (11 métriques par scénario) sont
dans [le JSONL](audits/progression-1000.jsonl) ; SHA-256 :
d76bc463a7edb6903d3d2029e36aded24e29fe1cb657825c9bcd2d4bf52d28ff.

Les valeurs de collection, de monnaie et leurs quantiles sont descriptifs de
ces horaires et stratégies simulés ; ce ne sont pas des prévisions de rétention
ni une justification d'équilibrage.

| Profil | Jours | Stratégie | Uniques moy. | P10 | Médiane | P90 | Écart-type | Points restants moy. | Jetons restants moy. |
|---|---:|---|---:|---:|---:|---:|---:|---:|---:|
| occasionnel | 7 | épargne | 94.09 | 86 | 95 | 99 | 4.72 | 2727.98 | 95.00 |
| occasionnel | 7 | craft-et-jetons | 98.05 | 91 | 99 | 103 | 4.46 | 596.27 | 95.00 |
| regulier | 7 | épargne | 210.50 | 203 | 211 | 217 | 5.57 | 5479.21 | 263.00 |
| regulier | 7 | craft-et-jetons | 216.80 | 209 | 217 | 224 | 5.74 | 1594.24 | 263.00 |
| intensif | 7 | épargne | 357.30 | 348 | 357 | 367 | 7.28 | 9697.45 | 473.00 |
| intensif | 7 | craft-et-jetons | 364.21 | 355 | 364 | 374 | 7.50 | 5699.68 | 73.00 |
| occasionnel | 30 | épargne | 314.68 | 295 | 318 | 327 | 13.14 | 12449.50 | 434.00 |
| occasionnel | 30 | craft-et-jetons | 332.94 | 317 | 335 | 344 | 11.43 | 361.81 | 34.00 |
| regulier | 30 | épargne | 613.45 | 598 | 614 | 628 | 12.14 | 30975.92 | 1120.00 |
| regulier | 30 | craft-et-jetons | 635.25 | 620 | 636 | 650 | 11.58 | 14777.75 | 320.00 |
| intensif | 30 | épargne | 832.46 | 819 | 833 | 844 | 10.24 | 68998.79 | 2020.00 |
| intensif | 30 | craft-et-jetons | 849.41 | 837 | 850 | 862 | 9.72 | 53866.34 | 121.60 |

## Limites Supabase

L'audit appelle les fonctions TypeScript locales, pas les RPC Supabase. Le
chemin cloud n'a pas été modifié ni testé par ces trajectoires. Le banc SQL
local n'a pas pu démarrer sous le compte administrateur Windows : zéro contrôle
SQL exécuté. La divergence Scène du chemin Supabase reste à vérifier et corriger
sur une base jetable avant toute décision de déploiement.
