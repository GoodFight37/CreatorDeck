# Passation opérationnelle CreatorDeck

## Checkpoint courant — 10 octobre 2026, Europe/Paris

| Champ | Valeur |
|---|---|
| Dernier agent | Codex Cloud |
| Session / réservation | Audit et coordination ; écriture limitée aux documents, session en cours |
| Branche de travail | `design/booster-reveal-polish` |
| SHA du code audité | `4955d9bbd489777c6ffd74229613075a332cc9e9` |
| Commit contenant cette passation | `git log -1 --format=%H -- docs/agent-handoff.md` ; le SHA de code ci-dessus est la base, pas le futur commit documentaire |
| PR | [#8](https://github.com/GoodFight37/CreatorDeck/pull/8), brouillon, titre « Polish lumineux des ouvertures de boosters et révélations » |
| Base de la PR constatée | `arena/01a10c75-creatordeck`, SHA `6c46e4bec37dc91a32f368b586e59ce109a44784` |
| main constaté | `ae5016f093c977e68943d92f5a7c3da17bca8021`, aucune modification autorisée |
| Publication de ce checkpoint | En préparation ; ne pas annoncer publié avant vérification distante |

## Demande et objectif compris

L'utilisateur demande une coordination permanente entre Codex Cloud, Codex PC
et ChatGPT, indépendante de la conversation : audit réel, roadmap, passation,
décisions, bugs, règles pour protéger les branches et sauvegardes régulières
avant interruption/quota, puis commit et push GitHub. Ne pas réécrire le jeu.
La reprise doit fonctionner même si Codex devient indisponible.

## Réalisé à ce checkpoint

- Checkout initial propre sur `work` au SHA de main ; branches distantes et refs
  `refs/pull/8/{head,merge}` consultées. La branche de travail et la tête de PR
  pointaient sur `4955d9b`. PR lue depuis la page GitHub (données embarquées) :
  état DRAFT, non fermée/non fusionnée, base arena, 112 commits dans la PR.
- `gh pr view … --json …` et REST `api.github.com/repos/…/pulls/8` refusés (403).
  Cela ne bloque pas les lectures Git HTTPS ni la page GitHub. Aucun statut CI
  ou déploiement déduit de l'existence d'un workflow.
- Fetch explicite des références design et arena ; checkout aligné proprement
  sur design. Le clone ne suivait initialement que main ; la configuration
  locale de fetch/upstream design a été ajoutée. Un essai de switch avec
  tracking a échoué après avoir rempli l'index ; corrigé avec `--no-track`,
  vérification de HEAD et retour à un status propre. Ce n'était pas un changement
  de l'application ni une bascule automatique prouvée.
- Documents existants lus : périmètre, roadmap, journal, revue externe,
  dossier d'atelier, README, CI, scripts et composants du chantier.
- Cinq documents de coordination préparés ; roadmap antérieure conservée.

## État du projet et chantier

Application Android/Web Next.js exportée, React, Capacitor, Supabase. Le mode
sans cloud est un **mode dev/test**, pas le produit distribué. Les fonctionnalités
multijoueurs et l'économie vont bien au-delà de l'ancien main : 42 migrations,
échanges, hôtel, amis/Last Pack, arène, jetons, direct/notifications et Tribunal.
La simulation de streameur est retirée de l'interface.

Derniers commits du code : `4955d9b` unifie ouverture/révélation dans une scène,
`c7a9263` corrige chevauchement des labels et portabilité des tests Windows,
`beadb63` supprime les styles du canvas WebGL retiré. La PR développe un sachet
imprimé (microphone plutôt que chevron refusé), une soudure tactile, cinq dos
avant les faces et un fallback clairement indiqué pour DIVERRON.

## Fichiers concernés

Cette mission : `AGENTS.md`, `docs/roadmap.md`, `docs/agent-handoff.md`,
`docs/decisions.md`, `docs/known-issues.md`. Aucun composant, migration, manifeste
ou lockfile ne doit être modifié par cette mission documentaire.

Pour reprendre la mise en scène : `src/components/{pack-tear,reveal-overlay,
creator-deck-app,drop-view,overlay-stage}.tsx`, `src/hooks/use-presentation-focus.ts`,
`src/app/{booster-continuity,booster-premium,reveal-premium}.css`,
`src/lib/reveal.ts`, `public/packs/`, les suites `src/ecrans*.test.tsx` et `e2e/`.

## Commandes et résultats de l'audit — checkpoint initial

Toutes les commandes Git de lecture ci-dessus ont réussi sauf les appels API
explicitement refusés. `npm ci --cache /workspace/.npm --no-audit --no-fund` :
succès, 602 paquets. Node 24/npm 11 disponibles dans cet environnement.
`npm_config_package_lock=false npm_config_cache=/workspace/.npm npm run dev:setup`
a réussi : dépendances de vérification SQL disponibles, lockfile inchangé.
Les suites de la branche ne sont **pas encore exécutées** à ce checkpoint.
Les 181 tests de l'ancien main ne sont pas une preuve pour cette branche.

## Incomplet / erreurs / points de vigilance

Tests de cette branche, statut CI et déploiement courant, validation humaine
des animations, et publication des docs restent à établir. Aucun accès de
production Supabase n'est utilisé. Voir [problèmes](known-issues.md).
L'erreur `unnest()` de l'ancien checkout est corrigée dans le code design ;
ne pas la diagnostiquer à nouveau à partir de l'ancienne conversation.

## Prochaine action exacte

Terminer `dev:setup`, puis lancer les suites pertinentes de la branche,
relever leurs résultats réels et compléter ce document. Committer uniquement
les cinq fichiers nommés, revérifier `git ls-remote origin
refs/heads/design/booster-reveal-polish`, pousser normalement, confirmer le SHA
et ouvrir les cinq documents sur GitHub. Mettre COORD-01 à terminé seulement
après ces contrôles. Ne pas fusionner la PR et ne pas toucher main.

## Préférences et décisions

Échanges en français ; téléphone d'abord ; conserver les refus historiques ;
un seul écrivain par branche ; aucune fusion automatique ; observations et
avis séparés. Le quota restant n'est pas connu par l'agent : ne pas en inventer
une estimation. Sauvegarder ce document après chaque étape importante.

## Modèle pour les prochaines passations

Ajouter une entrée datée dans le journal ci-dessous et remplacer le checkpoint
courant : agent/réservation, demande/objectifs, réalisé/incomplet, fichiers,
commandes + résultats + SHAs, erreurs, décisions/préférences, risques,
prochaine action exécutable, branche/commit/PR, état réel de publication.
Libérer la réservation en fin de session ; ne pas marquer terminé un travail
qui reste bloqué. Le prochain agent vérifie GitHub avant d'agir.

## Journal des passations

- 2026-10-10 — Codex Cloud : initialisation documentaire sur le code `4955d9b` ;
  historique existant conservé. Checkpoint initial en cours, puis mise à jour
  finale à renseigner dans cette session.
