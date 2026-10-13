# Guide de lecture de la documentation

Les documents n'ont pas tous la même fonction. Pour connaître l'état présent,
ne pas déduire le statut du projet à partir d'une ancienne livraison.

## Pour comprendre le projet rapidement

1. [README du dépôt](../README.md) : produit, installation et commandes.
2. [Périmètre](perimetre.md) : contraintes produit et choix déjà refusés.
3. [Roadmap](roadmap.md) : chantiers ouverts, prochaine étape et backlog.
4. [Passation active](agent-handoff.md) : dernier checkpoint daté ; lire d'abord
   le bloc en haut, puis seulement les sections liées à la tâche.

## Quelle source fait autorité ?

- **Règles de collaboration et sécurité** : `AGENTS.md`.
- **Ce qui est prévu maintenant** : `docs/roadmap.md`.
- **Ce qui a réellement été vérifié et publié récemment** : premier checkpoint
  de `docs/agent-handoff.md`, avec SHA et liens de CI.
- **Décisions durables** : `docs/decisions.md`.
- **Défauts encore ouverts** : `docs/known-issues.md`.
- **Anciennes livraisons** : `docs/historique-livraisons.md`. C'est une archive,
  pas la liste des tâches encore ouvertes.
- **Détails techniques d'une fonctionnalité** : le document spécialisé lié par
  la roadmap ou la passation.
- **Assets audio et boucle BGM** : [audio-assets.md](audio-assets.md), avec la procédure pour remplacer le prototype.

Une ancienne section peut décrire un état remplacé depuis. En cas de divergence,
vérifier `main`, les commits et la CI, puis actualiser le checkpoint courant et
la roadmap ; conserver l'ancienne information comme historique daté si elle
explique une décision ou une régression.
