# Claude : instructions pour CreatorDeck

Claude et Codex travaillent sur le même dépôt, à égalité : Malik utilise l'un ou
l'autre selon le moment (depuis le 21 octobre 2026, surtout Claude). Celui qui
travaille implémente, corrige, lance les tests adaptés et publie sur `main`, selon les
mêmes règles ([`AGENTS.md`](AGENTS.md)). Ils peuvent aussi s'aider : Claude confie des
lots mécaniques bien délimités à Codex (plugin `codex:codex-rescue`) ou lui demande
un second avis. Avant d'écrire, vérifie `git status` et `git log` ; ne remplace jamais un
travail local non publié d'un autre agent.

## Cadre

- **Où :** le checkout de travail est `CreatorDeck-Codex` (nom historique du dossier).
  Les autres worktrees, `CreatorDeck` (sur `main`) et `CreatorDeck-Claude` (sur
  `claude/review`), se préservent : ne pas en créer, supprimer ni remplacer.
- **À lire au démarrage :** `bd ready`, puis le haut de
  [`docs/agent-handoff.md`](docs/agent-handoff.md). [`AGENTS.md`](AGENTS.md) donne le cadre
  du dépôt (jeu, sécurité, règles de produit, publication) et vaut pour les deux agents.
- **Validation :** lancer réellement l'app, regarder les captures et corriger ce qu'on
  voit. Malik teste sur son téléphone avec l'APK construite depuis `main`. Ne jamais
  présenter une simulation navigateur comme une validation Android.
- **Passation :** le checkpoint en tête de `docs/agent-handoff.md` et `bd` à chaque fin de lot.

## Échanges avec Codex

- [`CreatorDeck-Codex-vers-Claude.md`](CreatorDeck-Codex-vers-Claude.md) : ce que Codex laisse à Claude.
- [`CreatorDeck-Retour-Claude.md`](CreatorDeck-Retour-Claude.md) : ce que Claude lui répond.
- Si Codex t'appelle via `node scripts/delegate-claude.mjs`, réponds uniquement sur la
  sortie standard : le script consigne lui-même ta réponse, sans outil d'écriture.
- Pour une revue indépendante demandée, travaille dans `CreatorDeck-Claude`. Rends un
  avis concis : SHA examiné, défauts prouvés séparés des hypothèses, étapes de
  reproduction, tests réellement lancés.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:1105d646 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->

## Mode autonome (CreatorDeck)

Le cadre général (quand s'arrêter, quels outils, économie de tokens) est dans le
`CLAUDE.md` global. Ici, le propre à CreatorDeck :

- **Autorisation permanente (Malik, 21 octobre 2026) :** commiter et pousser sur `main`
  sans redemander. Cela prime sur le profil « Conservative » du bloc Beads ci-dessus.
  Jamais de push forcé, de suppression de branche ni de réécriture d'historique.
- **Branche :** on travaille sur `main`, parce que l'APK ne se construit que depuis `main`.
- **Avant de pousser :** `tsc`, ESLint et les tests ciblés. Un push sur `main` applique
  automatiquement les migrations Supabase en production : prévenir Malik et attendre son
  accord avant de pousser une migration.
- **Ne jamais commiter** `next.config.ts` (il contient l'IP locale).
- **Le reste est décidé sans demander :** choix visuels, implémentation, tests, ordre des chantiers.
