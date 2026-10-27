---
name: creator-deck-editorial
description: >
  Audit and redesign CreatorDeck interfaces to remove generic AI visual patterns:
  purple gaming gradients, badge clutter, decorative card grids and excessive
  logos. Use when the user requests visual changes, design critique, polish,
  responsive layouts, or anti-AI UI improvements in CreatorDeck.
---

# Direction UI CreatorDeck anti-slop

Read `DESIGN.md` and `docs/anti-ai-direction.md` before editing. For the pilot
Histoire, the scoped visual authority is `docs/anti-ai-direction.md`; do not
overwrite the global theme of Binder, Drop, Atelier or Objectifs.

Sources to consult if available:
- https://github.com/pbakaus/impeccable : quieter, distill, audit, craft-floor
- https://github.com/Leonxlnx/taste-skill : app screens, actual screenshot loop
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill : responsive/accessibility/touch
- https://github.com/funboy322/avoid-ai-design : purple gradients and other design tells
- https://github.com/claudiusararu/unslop-ui-skill : anti-template checklist
- https://github.com/rwcod/anti-ai-slop-ui : art direction, tokens, no defaults
- https://github.com/jakubkrehel/skills : layout, typography, UI and interface-review
- https://github.com/superdesigndev/superdesign-skill : comparing variations when its CLI is actually available
- https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design : distinctive frontend direction

Do not claim to have run any external CLI that was only read.
For each changed surface:
1. Read the actual user critique, route, existing imagery, tokens and screenshots.
2. Choose a coherent composition and palette; never copy a template or invent icons.
3. Preserve navigation, semantics, 44px touch areas, visible focus, reduced motion, state and persistence.
4. Implement one scoped visual direction, then run Playwright at 320x568 and 390x844.
5. **Open the real screenshot**. Correct framing, clipping, hierarchy and text legibility.
6. Document what changed, what did not, and the CI outcome.

Safety: the Histoire pilot stays in `feature/histoire-reigns-pilot-20261026`
and PR #24, draft. Do not touch `main`, production, Supabase, economy,
global boosters or the game engine; do not merge without human approval.
