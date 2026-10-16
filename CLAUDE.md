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
