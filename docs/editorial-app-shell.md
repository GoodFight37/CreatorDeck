# Layouts CreatorDeck : revue anti « interface IA »

## Périmètre de cette livraison

Branche `feature/editorial-ui-shell-20261027` créée depuis `main`, **sans modifier main ni produire un déploiement volontaire**. Seul l'habillage est concerné : barre de navigation, en-tête, onglets du Binder et calendrier/structures d'Objectifs. Aucun calcul, compte, économie, tirage, sauvegarde, visuel de booster ni Supabase modifié.

## Pourquoi

Captures Playwright du 27 octobre 2026 (320 px) : la navigation du bas est dominée par trois pictogrammes dessinés énormes ; le Drop dépasse du dock en violet et se balance ; le Binder oppose une pastille vert fluo sur un énorme bouton arrondi ; les sept jours d'Objectifs ressemblent à sept petites cartes interchangeables ; le niveau est une bulle rose sans hiérarchie avec le reste de l'en-tête.

## Direction concrète

- **Navigation** : trois libellés toujours visibles, état actif souligné, booster prêt signalé par un petit point rouge ; suppression visuelle des pictogrammes géants et de leurs animations. Cibles tactiles et attributs ARIA conservés.
- **En-tête** : numéro de niveau et jetons dans des éléments plats et discrets, sans pastilles géantes ni faux relief.
- **Binder / Atelier** : deux onglets comme une navigation de contenu, sans bloc arrondi fluorescent ; sélection visible par soulignement.
- **Objectifs** : la semaine se lit en grille d'informations à traits fins, pas en sept cartes arrondies ; missions et saisons deviennent plus proches d'une liste de suivi, les vraies récompenses et statuts restent affichés.
- **Drop / boosters** : l'artwork du sachet, ses raretés, ses effets de déchirure et ses mécaniques ne sont pas touchés. Le visuel du sachet est un chantier graphique indépendant, pas une bonne raison pour déformer le shell.
- Ne pas convertir toute l'application en papier beige : le fond noir fait déjà partie de CreatorDeck. L'anti-slop signifie de meilleures décisions visuelles, pas un nouveau thème par défaut.

## Sources et critère de réutilisation

Synthèse contrôlée : [Impeccable](https://github.com/pbakaus/impeccable), [Taste Skill](https://github.com/Leonxlnx/taste-skill), [Avoid AI Design](https://github.com/funboy322/avoid-ai-design), [Unslop UI](https://github.com/claudiusararu/unslop-ui-skill), [Anti AI Slop UI](https://github.com/rwcod/anti-ai-slop-ui), [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), [Better UI](https://github.com/jakubkrehel/skills), [Superdesign](https://github.com/superdesigndev/superdesign-skill), [Frontend Design Anthropic](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design). Seules leurs recommandations écrites ont été appliquées ; leurs CLI ne sont pas exécutées ici.

## Contrôles avant validation

- `e2e/navigation.spec.ts` : labels lisibles et présents sur 320/390 px, icônes non dominantes, navigation et onglets accessibles, calendrier de sept jours sans mini-cartes aux coins arrondis.
- `e2e/mobile-observation.spec.ts` : captures **réelles** 320, 390 et 412 px de Binder, Drop, Objectifs. Examiner les captures, pas seulement les tests.
- CI générale, moteur et tests de non-régression. Validation Android/iPhone natif non prétendue.

La direction du mode Histoire est suivie séparément dans la PR #24 ; ne pas mélanger les branches ni les déploiements.
