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

## Limites Supabase au moment de l'audit de progression

Ces 12 000 trajectoires appellent les fonctions TypeScript locales, pas les
RPC Supabase. Elles ne valident donc pas la progression multi-jours côté serveur.
Lors de cette première exécution, le banc SQL n'avait pas pu démarrer sous le
compte administrateur Windows ; cette phrase décrit l'état de ce run, pas la
validation ultérieure du Paquet Scène.

## Validation ultérieure, séparée de l'audit de progression — 10 octobre 2026

La parité du Paquet Scène a ensuite été corrigée dans la migration additive
0043_scene_pack_eligibilite.sql, puis exercée sur PostgreSQL jetable sous WSL,
avec l'utilisateur Linux non administrateur. La passation et la roadmap
consignent 35/35 tests ciblés et les 559 contrôles du vérifieur SQL réussis,
migrations 0001–0043 comprises, y compris familles avec peu ou zéro Épique,
garantie du cinquième emplacement et familles incompatibles. Cette vérification
est distincte des simulations de progression ci-dessus et n'a touché aucune
base Supabase en production.

Limite toujours ouverte : les trajectoires de progression restent une
simulation du moteur TypeScript local ; elles ne constituent pas une
comparaison des RPC de progression avec le serveur.

## Scénarios avec horaires de visite en heure locale — 13 octobre 2026

Une revue a relevé que le script convertissait les heures des profils en
horaires UTC, alors que le Prime Time est calculé par le moteur en heure locale.
Un créneau « 21 h » passait donc à 23 h à Paris en été (hors Prime Time) puis à
22 h en hiver (Prime Time). Ce n'était pas un défaut de règle du jeu, mais une
hypothèse de simulation qui faisait varier l'heure habituelle du joueur au
changement d'heure.

Le script construit désormais ses visites à heure fixe dans `Europe/Paris`, y
compris au passage été/hiver. Commande :
`npm run progression:bilan -- --runs=100 --seed=20261010`. Résultat : 12
scénarios, 1 200 trajectoires, zéro paquet manquant. Les résultats complets sont
dans [le JSONL](audits/progression-local-time-100.jsonl) ; SHA-256 :
`02ca7260e116bd9d50c8bd0a3fecc8e5374534b968bbe529da25a7e96fe693e1`.

| Profil | Jours | Stratégie | Uniques moy. | Jetons restants moy. | Points restants moy. | Crafts moy. | Achats aux jetons moy. |
|---|---:|---|---:|---:|---:|---:|---:|
| Occasionnel | 7 | Épargne | 93,79 | 109 | 2 706,04 | 0 | 0 |
| Occasionnel | 7 | Craft + jetons | 97,99 | 109 | 651,99 | 4,09 | 0 |
| Régulier | 7 | Épargne | 210,41 | 263 | 5 489,50 | 0 | 0 |
| Régulier | 7 | Craft + jetons | 216,80 | 263 | 1 585,61 | 6,65 | 0 |
| Intensif | 7 | Épargne | 356,83 | 473 | 9 769,76 | 0 | 0 |
| Intensif | 7 | Craft + jetons | 365,14 | 73 | 5 690,43 | 7 | 1 |
| Occasionnel | 30 | Épargne | 316,79 | 460 | 12 200,58 | 0 | 0 |
| Occasionnel | 30 | Craft + jetons | 333,28 | 60 | 371,78 | 20,97 | 1 |
| Régulier | 30 | Épargne | 611,49 | 1 120 | 31 077,04 | 0 | 0 |
| Régulier | 30 | Craft + jetons | 635,82 | 320 | 14 621,05 | 29,69 | 2 |
| Intensif | 30 | Épargne | 833,96 | 2 020 | 68 938,34 | 0 | 0 |
| Intensif | 30 | Craft + jetons | 848,96 | 132 | 54 369,60 | 30 | 4,72 |

Pour le profil occasionnel sur 30 jours, l'épargne atteint 460 jetons avec des
visites stables à 9 h et 21 h locales, contre 434 dans l'ancien modèle UTC qui
traversait un changement d'heure. Les autres métriques restent des résultats
de scénarios synthétiques : 100 répétitions donnent une tendance reproductible,
pas une prévision du comportement réel. Les règles du jeu n'ont pas changé ;
Supabase, les échanges, la présence réelle, les missions Tribunal et les
dépenses de sabliers ne sont toujours pas simulés.
