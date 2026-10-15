# Revue IA Studio — Lot 03 Collection et Atelier — 15 octobre 2026

## Périmètre reçu

Audit sur le SHA `7be3914bffec0120d23aa3847833b3b9ddbe8170`, portant sur
Atelier, Binder, inspection et rendu des cartes, composant de transaction et
objectif de collection. Le premier fichier joint se terminait à
`[MOYEN] Informatio`. Le rapport complet a ensuite été collé dans la
conversation ; les sept constats sont maintenant examinés.

## Verdicts et corrections

| Constat | Verdict | Résultat |
| --- | --- | --- |
| Crash Atelier Sortant : `CREATOR_BY_SLUG` n’inclurait que les actifs | Faux positif | `src/lib/catalog.ts` construit la map depuis `[...CREATORS, ...RETIRED_CREATORS]` depuis `a06847c65`, avant le SHA audité. La carte est résolue dans l’Atelier. |
| Compteur Toutes affecté par le filtre de rareté | Confirmé, corrigé en D-114 | Compteur calculé séparément de la liste filtrée. |
| Sortants possédés absents d’Obtenues et ignorés par les filtres de Toutes | Confirmé, corrigé en D-114 | Les Sortants obtenus sont inclus dans Obtenues/Toutes et passent par recherche, objectif de page et tri. |
| Fiche d’une carte Sortant non artisanable promet un tirage booster | Confirmé, corrigé en D-115 | La fiche précise qu’un Sortant ne tombe plus en booster et n’est plus rejoignable à l’Atelier. |
| Lien Twitch interactif contenu dans une carte `role=button`; double action possible | Confirmé, corrigé en D-115 | La carte reste un article ; un vrai bouton d’inspection indépendant ouvre sa fiche, tandis que le lien Twitch reste un lien frère et une action distincte. Le lien ne peut plus déclencher l’inspection. |
| « Choisir une carte » contourne le retour du focus à l’Atelier | Confirmé, corrigé en D-115 | La transaction appelle maintenant `closeAction`, qui rend le focus à `#atelier-heading` après fermeture. |
| Import `Radio` inutilisé dans `creator-card.tsx` | Confirmé, corrigé en D-115 | Import retiré. |

## Points forts relevés par l’audit

Les reflets de carte utilisent des variables CSS directes sans re-rendu React,
les effets et mouvements réduits respectent les préférences du joueur, le
feuilletage du Binder filtre les gestes verticaux, et les transactions Atelier
ont déjà leur verrou anti-double action. L’audit ne recommande aucun changement
à ces mécanismes.

## Preuves et limites

Les tests ciblés couvrent la stabilité du compteur Atelier, les Sortants dans
Obtenues/recherche/objectif/tri du Binder, l’information affichée pour un
Sortant non artisanable, la séparation lien Twitch/bouton d’inspection et le
retour du focus après recyclage. `src/data/retired.json` est vide : les tests
utilisent des fiches Sortants synthétiques, pas un compte réel.

Les lots ne changent aucun taux, coût, valeur de recyclage, gain ou règle de
tirage. L’audit ne signale rien sur ces paramètres. L’essai tactile physique
du site reste une validation joueur distincte des tests DOM automatisés.
