# Étude : agrandir le catalogue sans changer les taux

## La question

Si CreatorDeck passe de 1 000 cartes à 1 500, 2 000 ou 3 000, qu'est-ce que le
joueur moyen récupère encore après un mois ou trois mois ? Et quelles sont ses
chances de trouver **une carte précise** qu'il cherche ? Cette étude mesure cet
effet ; elle n'ajoute aucun contenu au jeu et ne propose aucun changement de
taux.

## Hypothèses du modèle

- Les 1 000 cartes actuelles sont conservées. Les ajouts sont répartis au même
  prorata dans les cinq raretés (30 % Communes, 30 % Peu communes, 23 % Rares,
  12 % Épiques, 5 % Légendaires) et dans les familles actuelles.
- Les tables de `src/data/pull-rates.json` sont gardées : taux par emplacement,
  Perfect, garantie Légendaire après 12 boosters et paquet Scène quotidien.
- Trois rythmes : 2, 6 ou 12 ouvertures Live par jour. Une partie reçoit aussi
  un paquet Scène gratuit par jour. Tous les paquets prévus sont supposés
  disponibles.
- Pour mesurer une carte précise, chaque partie tire au hasard une carte cible
  d'une rareté donnée. Le résultat est donc une moyenne sur des cartes cibles,
  pas la promesse d'obtenir une carte Twitch en particulier.
- 300 parties pseudo-aléatoires par combinaison : 4 tailles × 3 rythmes × 2
  durées (30 et 90 jours), soit 7 200 parties. Graine : `20261013`.

Les nouvelles cartes n'ont que des identifiants techniques synthétiques dans le
calcul. Aucun faux nom, portrait, entrée de catalogue ou donnée de jeu n'est
créé. Le simulateur est indépendant : il reprend les tables et les règles de
tirage, mais n'exécute ni le moteur TypeScript par carte, ni les RPC Supabase.
Il ne modélise pas les variantes, le Direct, le Craft, les jetons, les échanges,
les missions, les récompenses de saison, ni la recharge de réserve.

## Ce que récupère le joueur

Chaque cellule indique le nombre moyen de cartes uniques obtenues, puis la part
du catalogue complet entre parenthèses.

### Après 30 jours

| Rythme | 1 000 cartes | 1 500 cartes | 2 000 cartes | 3 000 cartes |
|---|---:|---:|---:|---:|
| Occasionnel, 2 Live/j | 315 (31,5 %) | 343 (22,9 %) | 359 (17,9 %) | 381 (12,7 %) |
| Régulier, 6 Live/j | 614 (61,4 %) | 711 (47,4 %) | 775 (38,8 %) | 848 (28,3 %) |
| Intensif, 12 Live/j | 833 (83,3 %) | 1 054 (70,3 %) | 1 203 (60,1 %) | 1 389 (46,3 %) |

### Après 90 jours

| Rythme | 1 000 cartes | 1 500 cartes | 2 000 cartes | 3 000 cartes |
|---|---:|---:|---:|---:|
| Occasionnel, 2 Live/j | 629 (62,9 %) | 753 (50,2 %) | 833 (41,7 %) | 930 (31,0 %) |
| Régulier, 6 Live/j | 929 (92,9 %) | 1 256 (83,7 %) | 1 499 (74,9 %) | 1 832 (61,1 %) |
| Intensif, 12 Live/j | 994 (99,4 %) | 1 451 (96,7 %) | 1 853 (92,7 %) | 2 493 (83,1 %) |

On obtient plus de cartes au total quand le catalogue grandit, mais on en
complète une part plus faible. Par exemple, après un mois à 2 Live par jour, le
joueur passe d'environ 315 cartes sur 1 000 à 381 sur 3 000 : il collectionne
66 cartes de plus, mais sa progression affichée tombe de 31,5 % à 12,7 %.

## Trouver une carte précise

Voici la chance, dans le modèle, d'avoir trouvé **une carte cible choisie au
hasard dans la rareté** avant le 90ᵉ jour :

| Rythme | Taille | Cible Épique | Cible Légendaire |
|---|---:|---:|---:|
| Occasionnel, 2/j | 1 000 | 74,7 % | 54,0 % |
| Occasionnel, 2/j | 1 500 | 64,3 % | 37,7 % |
| Occasionnel, 2/j | 2 000 | 55,0 % | 28,0 % |
| Occasionnel, 2/j | 3 000 | 39,0 % | 23,3 % |
| Régulier, 6/j | 1 000 | 94,3 % | 86,0 % |
| Régulier, 6/j | 1 500 | 87,0 % | 69,7 % |
| Régulier, 6/j | 2 000 | 80,0 % | 57,0 % |
| Régulier, 6/j | 3 000 | 70,0 % | 46,0 % |
| Intensif, 12/j | 1 000 | 99,3 % | 96,0 % |
| Intensif, 12/j | 1 500 | 98,7 % | 93,0 % |
| Intensif, 12/j | 2 000 | 91,7 % | 84,7 % |
| Intensif, 12/j | 3 000 | 84,7 % | 65,7 % |

Concrètement, avec 3 000 cartes et 2 ouvertures par jour, le modèle trouve la
Légendaire précise dans seulement 23 parties sur 100 avant trois mois. Avec le
catalogue actuel, c'est environ 54 parties sur 100. Les échanges ou le Craft
pourraient changer ce résultat ; ils ne sont pas comptés ici.

## Les familles et le Paquet Scène

Après 90 jours, voici le pourcentage moyen complété **dans une famille**, puis
le nombre moyen de familles terminées parmi les neuf familles actuelles :

| Rythme | 1 000 cartes | 1 500 cartes | 2 000 cartes | 3 000 cartes |
|---|---:|---:|---:|---:|
| Occasionnel, 2/j | 62,3 % / 0,53 | 48,9 % / 0,34 | 40,8 % / 0,17 | 32,6 % / 0,32 |
| Régulier, 6/j | 92,9 % / 1,55 | 83,3 % / 0,84 | 74,6 % / 0,39 | 62,2 % / 0,53 |
| Intensif, 12/j | 99,4 % / 5,69 | 96,6 % / 1,92 | 92,6 % / 1,06 | 83,9 % / 0,79 |

Dans la répartition simulée, la famille S09 passe de deux cartes aujourd'hui à
six dans le scénario à 3 000. Elle franchirait alors le seuil de cinq cartes
nécessaire au Paquet Scène : le nombre de familles visées par ce paquet passerait
de huit à neuf. Ce résultat dépend directement de la décision de ranger les
futurs contenus dans les familles actuelles.

## Vérification et limites

Pour le catalogue actuel, la moyenne de cartes uniques après 30 jours est proche
du bilan fait avec le moteur du jeu :

| Rythme | Modèle indépendant | Moteur local précédent |
|---|---:|---:|
| Occasionnel | 314,92 | 316,79 |
| Régulier | 613,50 | 611,49 |
| Intensif | 832,68 | 833,96 |

Cette proximité sert de contrôle de cohérence ; elle ne transforme pas les
scénarios agrandis en résultats du moteur ou du serveur. Le modèle suppose un
catalogue grossi partout de façon proportionnelle. Il ne répond pas à la
question de structure d'un catalogue avec des personnages de fiction ou
d'autres types de personnalités : leurs familles, raretés, saisons et règles
restent à concevoir.

## Conclusion produit

Ajouter plusieurs milliers de cartes d'un seul coup, en gardant exactement les
mêmes taux, rallonge nettement la chasse aux cartes précises et réduit le
pourcentage de collection visible, surtout pour les personnes qui jouent peu.
Ce n'est pas forcément mauvais — un catalogue trop vite terminé n'offre plus
d'objectif — mais il faudrait accompagner les ajouts par des collections ou
saisons compréhensibles, et décider si certains contenus ont un tirage ou une
progression distincts. Cette étude ne recommande pas de modifier les taux et
n'autorise pas l'ajout automatique de contenu.

## Reproduire

```sh
npm run catalogue:growth -- --runs=300 --seed=20261013
```

La sortie détaillée est dans
[`audits/catalogue-growth-300.jsonl`](audits/catalogue-growth-300.jsonl), SHA-256
`00a2b06754e0aacbdd3f36dc946543c787520e0cd198bcce1e9625cc67f1afa1`.
