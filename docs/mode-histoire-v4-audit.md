# Mode Histoire · bilan de la saison V4

Date : 26 octobre 2026
Portée : branche `feature/histoire-reigns-pilot-20261026`, sans fusion vers `main`.

## Contenu

- 40 décisions maximales, cinq actes et 84 scènes écrites, dont 57 dans `story-season.ts`.
- Personnages récurrents Flo, Nox, Mona et Lina ; conditions par flags, dettes et promesses à effet différé.
- Quatre interludes conditionnels (décisions 13, 21, 29 et 37), dérivés de l'historique, sans nouvelle statistique ni service externe.
- Résumés de fin personnalisés et choix sauvegardés localement, version `v4`.

## Équilibrage

Un audit initial de 30 000 parcours pseudoaléatoires donnait une durée médiane de 21 décisions, dont environ 19 % atteignaient la 40e. Beaucoup se terminaient par surexposition (Public à 100).

Correction : modération de 50 effets positifs de Public dans les actes II–V (65 % des anciennes valeurs, arrondis, minimum +1) ; effets négatifs et autres statistiques inchangés.

Sur 512 parcours déterministes après correction : médiane de 31 décisions ; 215 sur 512 (42 %) atteignent le chapitre 40. Un nouveau test simule 1024 parcours et exige une médiane supérieure ou égale à 26, au moins 300 arrivées au chapitre final et la rencontre de chacune des 84 scènes. Il s'agit de simulations, non de mesures d'utilisateurs.

## Vérification

- CI vérifiée verte sur le commit antérieur `9226173e5`. Chaque changement suivant nécessite sa propre CI ; ne pas extrapoler.
- E2E ajouté : passer 12 scènes par choix gauche, découvrir l'interlude du deuxième acte, recharger la page et vérifier sa persistance.
- Le rendu sur un téléphone physique, le temps réel de lecture et la finition du ressenti tactile restent à valider.
- La prévisualisation Vercel n'est pas la production ; aucune modification de l'économie, de Supabase ou des cartes.

## Prochaines validations

Vérifier la CI et la prévisualisation du dernier SHA ; ensuite tester sur Android et iOS, vérifier les débordements en 320×568, recueillir des mesures réelles de durée et faire relire les dialogues avant fusion éventuelle.
