# CreatorDeck — antidote aux layouts « faits par IA »

**Statut : pilote uniquement, PR #24, aucun impact sur main ni la production.**

## Diagnostic validé par la capture de l’utilisateur

L'ancienne scène présente trop de violet/prune, des logos et médaillons omniprésents, une pile de cartes stylisée comme un panneau gaming, des arrière-plans colorés, des dégradés et des halos. Le premier objet du produit, le dilemme narratif, est noyé dans cet habillage. Ce n'est **pas** un simple problème de padding : c'est une direction artistique à remplacer.

## Direction de remplacement : feuilleton éditorial

Référence culturelle : mise en page de reportage et feuilleton contemporain, pas interface de jeu vidéo. Un écran raconte **une** situation, montre **une** personne et propose **deux** décisions. La page doit se lire aussi bien comme un épisode d'un magazine que comme une interaction tactile.

- Surfaces : charbon neutre `#161817`, feuille claire `#f2efe8`, traits discrets. Pas de violet, de gradient de fond ou de glow.
- Titres narratifs : Georgia sérif, poids normal, titres de chapitre comme des accroches éditoriales. IBM Plex Sans pour le reste. Pas d'accumulation de capitales condensées.
- Illustration : garder les visages des personnages, dé-saturer les couleurs et supprimer les accessoires/décors stéréotypés derrière eux. Ne pas remplacer des illustrations existantes par des visuels générés arbitrairement.
- Jauges : quatre libellés lisibles en clair, barres neutres, signal rouge uniquement à l'état critique. Pas de faux emblèmes ni de points lumineux « récompense ».
- Choix : deux surfaces franches, bord droit mince, aucun chevron décoratif, cibles tactiles d'au moins 44 px, libellés entiers. Conserver glissement, clavier, retour haptique facultatif et réduction des animations.
- Actes et journal : une colonne lisible ; les conséquences passées se présentent comme un texte, pas comme une grille de cartes identiques.
- Fins : conserver les neuf illustrations propres aux issues, sans halo, anneaux ni panneau d'arcade.
- Ne jamais supprimer les vraies jauges, le mécanisme, les sauvegardes V4, les 40 choix, la navigation ni les règles pour paraître plus minimaliste.

## Confrontation des neuf sources

| Source | Principe retenu | Limite |
| --- | --- | --- |
| [Impeccable](https://github.com/pbakaus/impeccable) | `quieter`, `distill`, `craft-floor` : supprimer la décoration gratuite, soigner la hiérarchie et la lecture | Exécutable `impeccable context` non lancé dans cette session GitHub seule |
| [Frontend Design Anthropic](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) | Une direction artistique choisie et stable, pas un empilement de composants | Pas de plugin exécuté |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Éviter les réflexes de templates, confronter le rendu à des captures | Son tirage de directions/inspecteur nécessite Node et un navigateur |
| [Superdesign](https://github.com/superdesigndev/superdesign-skill) | Comparer des directions, penser en systèmes et composants | CLI et canvas non disponibles dans cette session |
| [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Taille tactile, accessibilité, contrastes, composition mobile | Pas de recherche CLI exécutée |
| [Avoid AI Design](https://github.com/funboy322/avoid-ai-design) | Bannir violet par défaut, fausses matières et gradients parasites | Scanner local non exécuté |
| [Unslop UI](https://github.com/claudiusararu/unslop-ui-skill) | Retirer les indices récurrents de design IA | Aucun modèle automatique ne peut garantir l'originalité |
| [Anti AI Slop UI](https://github.com/rwcod/anti-ai-slop-ui) | Fixer direction et tokens avant les composants | On conserve les besoins réels de la partie |
| [Better UI / Interface Review](https://github.com/jakubkrehel/skills) | Relire la typographie, l'espacement, les surfaces et les états | La cohérence prime sur les recettes de style isolées |

Ces dépôts ont été **consultés**. Leurs outils de ligne de commande n'ont pas été installés ni lancés : la refonte applique manuellement les principes documentés.

## Contrat pour tous les écrans CreatorDeck à venir

Le produit entier doit éviter les motifs IA : dégradés sans fonction, halos « premium », panneaux violets, séries de cartes arrondies identiques, badges de statut inventés, interfaces surchargées de logos. Pour les autres écrans (Binder, Drop, Objectifs, Atelier), **audit et captures séparés avant toute modification** : le style de la saison Histoire ne doit pas être copié aveuglément ni imposé à l'économie/au moteur du jeu.

## Vérification

- Playwright à 320 × 568 et 390 × 844 : vrais libellés de jauges, deux boutons, contraste textuel, aucune image de fond en dégradé, disposition sans débordement horizontal.
- Captures `editorial-320.png` et `editorial-390.png` à inspecter. Réviser après avoir regardé ; la compilation seule n'est pas une validation esthétique.
- E2E de la partie, sauvegarde locale V4, WebKit simulé. Tests Android/iPhone sur appareil physique toujours manquants.
