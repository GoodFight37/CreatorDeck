# Guide de lecture de la documentation

Les documents n'ont pas tous la même fonction. Pour connaître l'état présent,
ne pas déduire le statut du projet à partir d'une ancienne livraison.

## Pour comprendre le projet rapidement

1. [README du dépôt](../README.md) : produit, installation et commandes.
2. [Périmètre](perimetre.md) : contraintes produit et choix déjà refusés.
3. [Roadmap](roadmap.md) : chantiers ouverts, prochaine étape et backlog.
   Les étapes 1 à 3 de « Mes chaînes » sont publiées ; voir le
   [plan des cinq premières minutes](plan-premiere-session.md) et le checkpoint.
4. [Passation active](agent-handoff.md) : dernier checkpoint daté ; lire d'abord
   le bloc en haut, puis seulement les sections liées à la tâche.

## Quelle source fait autorité ?

- **Règles de collaboration et sécurité** : `AGENTS.md`.
- **Ce qui est prévu maintenant** : `docs/roadmap.md`.
- **Ce qui a réellement été vérifié et publié récemment** : premier checkpoint
  de `docs/agent-handoff.md`, avec SHA et liens de CI.
- **Décisions durables** : `docs/decisions.md`.
- **Défauts encore ouverts** : `docs/known-issues.md`.
- **Notes visibles par les joueurs** : [nouveautes.md](nouveautes.md), procédure
  de publication et lecture dans Toi → Nouveautés.
- **Revue IA Studio Lot 04** : [constats vérifiés et corrections](revue-ia-studio-lot04-2026-10-15.md).
- **Anciennes livraisons** : `docs/historique-livraisons.md`. C'est une archive,
  pas la liste des tâches encore ouvertes.
- **Détails techniques d'une fonctionnalité** : le document spécialisé lié par
  la roadmap ou la passation.
- **Mise à jour de l'APK de test (D-144)** : [guide et état vérifié](mise-a-jour-apk.md) ; release publique, installation initiale et mise à jour ensuite.
- **Boosters temporaires pour tester** : [codes privés](booster-test-access.md) ;
  réserve serveur plafonnée, sans reset de progression.
- **Trade Radar** : [périmètre et fonctionnement](trade-radar.md) ; souhaits
  publics des amis, doublons locaux, offre toujours arbitrée par le serveur.
- **Parcours sociaux réels sur Vercel** : [vérification du 15 octobre](verification-sociale-vercel-2026-10-15.md) ; deux comptes invités, amitié, offre acceptée et collections après transfert.
- **Univers Mèmes FR** : [source et intégration D-125](catalogue-memes-source.md) ; import figé, réserve et classeur séparés. Le retrait D-131 de la fiche sans illustration et l’état de sa migration serveur sont consignés dans cette même fiche et dans le premier checkpoint de passation.
- **Cartes Mèmes D-127** : [audit visuel et captures comparables](audit-cartes-memes-reference.md) ; preuves partielles du paquet de référence et rendu par rareté.
- **Choix des boosters D-129** : [parcours, vérifications et captures](drop-boosters.md) ; carrousel publié, préparation annulable avant tirage, corrections tactiles suivies après retour joueur.
- **Sachet Live Drop D-128** : [revue et captures avant/après](sachet-live-d128.md), décision D-128 ; silhouette, plis et matière sans changement du peel.
- **Assets audio et boucle BGM** : [audio-assets.md](audio-assets.md), avec la procédure pour remplacer le prototype.

Une ancienne section peut décrire un état remplacé depuis. En cas de divergence,
vérifier `main`, les commits et la CI, puis actualiser le checkpoint courant et
la roadmap ; conserver l'ancienne information comme historique daté si elle
explique une décision ou une régression.

## Lire les contrôles de livraison

Dans GitHub Actions → Vérification, lire chaque job du SHA audité. Les huit
contrôles qualité indépendants s’exécutent après installation réussie, même
si l’un échoue ; un échec conserve le statut rouge du job. Une annulation ou
une installation refusée ne lance pas les contrôles suivants.

Playwright ajoute en CI des annotations GitHub et un rapport
`test-results/results.json` aux rapports HTML existants. En cas d’échec,
les artefacts `creatordeck-playwright-report-<shard>` contiennent ces fichiers.
Un scénario ignoré n’est pas une réussite ; le chemin cloud sans vraie base
est vérifié séparément avec des RPC simulés. Voir le [rapport D-111](verification-d111.md) et la passation.
