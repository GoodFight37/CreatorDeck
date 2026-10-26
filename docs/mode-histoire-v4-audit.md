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

## Itération du 27 octobre 2026 : reprise, décisions lisibles et dénouements

Ces évolutions ne changent ni les quarante étapes, ni les effets chiffrés, ni la version V4 des sauvegardes.

- **Recommencer avant la fin :** un bouton secondaire apparaît dès la deuxième décision ; il ouvre une confirmation explicite. L'annulation préserve l'historique et le redémarrage remplace la sauvegarde locale. Test navigateur : annuler, recharger, confirmer, recharger.
- **Indices de choix :** les deux plus fortes variations *effectivement possibles* sont indiquées par des flèches et le nom de la jauge. Pas de valeur numérique ni d'effet futur dévoilé. Les plafonds 0/100 sont pris en compte pour ne pas annoncer un gain inexistant. Tests unitaires et vérification E2E sur 320 px.
- **Narration des fins :** `storyEndingNarrative` choisit parfois une formulation plus juste selon les décisions, sans modifier le résultat du moteur. Notamment, la fin `independant` ne décrit plus une indépendance intacte si un contrat d'exclusivité a été signé. Autres variantes : collectif, duo avec Nox, carrière sous contrat, épuisement et scandale.
- **Rappels différés :** les quatre interludes citent davantage de choix antérieurs ; par exemple le téléphone ou le micro achetés au premier direct, le refus de Mona, l'épuisement de Flo et la facture de Nox.
- Les tests ajoutés ne prouvent rien sans leur exécution sur le SHA correspondant. Dernière CI intégralement verte **observée** au début de cette passe : `9226173e`. Vérifier la CI sur le nouveau HEAD avant toute fusion.

### Dette narrative observée

Un audit statique a identifié **164 drapeaux écrits**, dont **98 sans lecture explicite** dans les conditions des scènes ou les textes du moteur avant les nouveaux rappels de cette passe. Ils affectent parfois déjà les jauges au moment du choix, mais leur mémoire n'a pas encore de retour direct. Il ne faut donc **pas prétendre que toutes les décisions ont une conséquence narrative différée**.

Pour un prochain chantier éditorial, prioriser les familles `debut_modeste`/`micro_cher` (désormais rappelées dans l'interlude), `recours_contrat`, `consentement_archives`, `collecte_verifiee`, `partage_nox`, `questions_libres` et `direct_scripte`. Privilégier des réactions de personnages et des dilemmes alternatifs cohérents. Tout changement des conditions ou effets d'une scène déjà jouable nécessite une **nouvelle version de scénario et de clé de sauvegarde**, ou une migration explicite testée, afin de ne pas invalider silencieusement l'historique des joueurs.

### Revue pratique toujours requise

1. Confirmer GitHub Actions / Playwright / build sur le dernier commit.
2. Tester sur un vrai Android et sur iOS le geste, les nouveaux indices, la confirmation de redémarrage et l'enregistrement local.
3. Chronométrer des parties humaines et vérifier si la lecture atteint réellement la cible de 20 à 30 minutes.
4. Faire une relecture humaine des 84 scènes et des textes personnalisés de fin.
