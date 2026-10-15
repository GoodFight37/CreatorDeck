# Revue IA Studio — Binder et Atelier — 15 octobre 2026

## Périmètre reçu

Pièce reçue : `ai_studio_code.txt`, audit annoncé sur le SHA
`7be3914bffec0120d23aa3847833b3b9ddbe8170`. Le texte fourni s’interrompt
après le début de `[MOYEN] Informatio`. Cette revue porte sur les constats
complets avant cette coupure ; elle ne valide pas les constats manquants.

## Verdicts

| Constat reçu | Verdict | Vérification |
| --- | --- | --- |
| Risque de crash à l’Atelier sur un créateur Sortant, car absent de `CREATOR_BY_SLUG` | Faux positif | `src/lib/catalog.ts` construit la map depuis `[...CREATORS, ...RETIRED_CREATORS]`. L’historique Git montre cette inclusion dans `a06847c65`, antérieure au SHA audité. Les actions Atelier peuvent donc résoudre les deux catalogues. |
| Le compteur Toutes de l’Atelier change avec le filtre de rareté | Confirmé | Le libellé affichait `craftable.length`, déjà restreint à la rareté sélectionnée. |
| Les Sortants possédés ne sont pas correctement intégrés aux filtres du Binder | Confirmé | Obtenues ne lisait que `game.stats.uniqueCreators`, volontairement limité au catalogue actif. Toutes ajoutait les Sortants après recherche, page et tri, sans leur appliquer ces critères. |

## Corrections

- L’Atelier calcule séparément le total qui mène à Toutes et la liste affichée
  sous la rareté sélectionnée. Le filtrage, l’abordabilité et les recettes
  restent inchangés.
- Le Binder réunit les cartes actives et Sortantes obtenues pour Toutes et
  Obtenues, puis applique recherche et tri à l’ensemble. La vue Sortants garde
  son périmètre propre. Le compteur Obtenues inclut ces cartes ; le pourcentage
  de complétion catalogue conserve son dénominateur actif.
- Une note visible destinée aux joueurs décrit les changements.

## Preuves et limites

Les tests DOM ciblés ajoutent un Sortant synthétique puisque
`src/data/retired.json` ne contient actuellement aucune entrée. Ils vérifient
le compteur, la liste Obtenues, la recherche et la stabilité du compteur Toutes
de l’Atelier sous filtre de rareté. Le catalogue réel des Sortants n’a donc pas
pu être exercé avec ces données.

Aucun taux, coût, valeur de recyclage, gain, tirage ou opération serveur n’est
modifié. La fin tronquée de l’audit reste à examiner si son texte complet est
fourni.
