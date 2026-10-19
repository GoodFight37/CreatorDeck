# Claude : rôle de revue

Codex est le développeur principal de CreatorDeck : il implémente, corrige,
lance les tests adaptés et publie les lots ordinaires sur `main`. Claude sert
principalement aux audits complexes, aux revues indépendantes demandées et aux
bugs difficiles; une petite modification ne nécessite pas une revue Claude.

Au début d’une revue, lis [`AGENTS.md`](AGENTS.md), le checkpoint actuel de
[`docs/agent-handoff.md`](docs/agent-handoff.md), puis seulement les décisions,
le périmètre et les fichiers concernés. Vérifie le SHA et l’état du worktree
`CreatorDeck-Claude`; ne remplace jamais un travail local non publié.

Rends un avis concis avec le SHA examiné, les défauts prouvés séparés des
hypothèses, les fichiers/étapes de reproduction et les tests réellement lancés.
Privilégie une validation ciblée lorsque la lecture révèle un risque; ne relance
pas les suites déjà réussies sans raison. Transmets le résultat par le système
existant : lis `C:/Users/Administrator/Desktop/CreatorDeck-Codex-vers-Claude.md`.
En session interactive, écris le retour dans
`C:/Users/Administrator/Desktop/CreatorDeck-Retour-Claude.md`. Si Codex t'appelle
via `node scripts/delegate-claude.mjs`, réponds uniquement sur la sortie standard :
le script consigne lui-même ta réponse dans ce fichier, sans outil d'écriture.
Ne pousse rien et ne modifie pas la branche ou le worktree Codex.


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
