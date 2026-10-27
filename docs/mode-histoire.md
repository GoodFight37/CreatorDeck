# Chantier mode Histoire — pilote « Zéro spectateur »

**État au 26 octobre 2026 :** prototype de code sur branche de travail, non fusionné sur `main`, non annoncé déployé en production. Porte expérimentale `/histoire` sans lien ajouté dans l'accueil. Ce document décrit le pilote, pas une fonctionnalité terminée.

## Expérience recherchée

Le joueur incarne **son propre streamer fictif**, qui commence à zéro, et prend des décisions à gauche/droite (gestes + boutons + clavier). Les quatre jauges sont **Public**, **Énergie**, **Argent** et **Confiance**. Les rencontres récurrentes (Flo la modo, Nox le streamer rival, Mona côté marques) ont une mémoire des choix. Les décisions peuvent déclencher une scène plusieurs chapitres plus tard. Le ton vise un mélange de quotidien, humour, tension morale et conséquences concrètes, sans reprendre d'assets, répliques ou histoires du jeu Reigns.

## Architecture testable

- `src/data/story-prologue.ts` : contenu éditorial typé et versionné, 84 scènes possibles sur 40 décisions au maximum, réparties en cinq actes. Chaque étape possède une scène de repli ; les scènes conditionnelles ont priorité si leurs drapeaux correspondent. Cette V1 fait volontairement une saison courte pour tester si les personnages et dilemmes fonctionnent.
- `src/lib/story-mode.ts` : validation du format, sélection déterministe des scènes, application des effets bornés de 0 à 100, conditions différées, fins de partie et restauration de sauvegarde. **Aucun appel IA**, pas de hasard au runtime.
- `src/components/story-mode.tsx` et sa feuille CSS : écran mobile autonome, boutons gauche/droite accessibles au pouce, geste horizontal (64 px, priorité au défilement vertical), flèches clavier, progression, jauges lisibles et sauvegarde locale.
- `src/app/histoire/page.tsx` : route isolée, aucune modification des quatre piliers Drop/Binder/Craft/Toi. Ne touche ni au catalogue, ni aux tirages, ni aux points, ni aux jetons, ni à Supabase.

La sauvegarde du pilote utilise `localStorage` (clé versionnée), propre au navigateur/appareil, **pas de synchronisation cloud ni de récompense**. Si elle est corrompue ou incompatible, on revient à une nouvelle partie. Les fins sont déterministes en fonction des jauges et de la progression.

## Validation et preuves

- TypeScript : compilation stricte des deux modules purs (moteur/scénario), sans erreur.
- Exploration exhaustive hors navigateur : **4096 combinaisons binaires** des douze décisions, y compris les fins anticipées. Aucune scène manquante ; état restaurable ; **8 issues accessibles** dans ce prologue. La neuvième fin définie (« plus personne en ligne ») existe en moteur mais n'est pas atteignable avec le réglage actuel du prologue.
- `src/lib/story-mode.test.ts` : test Vitest prévu dans le dépôt, couvrant validations, déterminisme, mémoire des choix, sauvegarde, fin immuable et exploration exhaustive. La suite Vitest du dépôt n'a **pas** été exécutée dans l'environnement de génération.
- `story-mode.tsx` et la route : transpilation syntaxique TypeScript vérifiée. **Next build, lint, Playwright, APK Android, tests navigateur et contrôles CI non exécutés** à la création de cette branche. Ne pas déclarer ce pilote prêt pour `main` avant ces vérifications.

## Suite du chantier

1. Sur checkout du dépôt : `npm ci`, puis `npm test -- src/lib/story-mode.test.ts`, `npm run typecheck`, `npm run lint`, `npm run build`.
2. Tester `/histoire` en Playwright téléphone (320×568 et 390×844), boutons, geste, scroll vertical, clavier, reprise après rafraîchissement et fins anticipées. Corriger les défauts vus sur captures et logs.
3. Faire relire le **rythme narratif** : chaque choix doit être intéressant sans punition arbitraire ; Flo/Nox/Mona doivent avoir une personnalité et une vraie continuité. Ajuster les jauges à partir de parcours réellement joués. Faire valider un épisode avant d'ajouter des dizaines de scènes.
4. Après validation, décider ensemble de l'accès au mode depuis l'application, d'une sauvegarde synchronisée facultative et de la création d'autres saisons. Aucune récompense sur le jeu de cartes tant qu'une autorité serveur n'a pas été conçue et vérifiée.

**Limites :** pas de génération IA à chaud, pas de service externe ni de budget requis pour jouer. Le contenu est écrit en amont, versionné et révisable. Le skill « Ponytail » requis par `AGENTS.md` n'est pas installé parmi les skills disponibles dans cette session ; il n'a pas été exécuté. Ne pas présenter la démo HTML autonome comme une validation du rendu de l'application Next.


## Reprise du chantier et améliorations du pilote (26 octobre 2026)

La première CI du commit `4cb66e3` a confirmé les tests unitaires, les tests d'écrans (264), le typage et la compilation Next, mais son job qualité a échoué sur **trois erreurs ESLint** dans `story-mode.tsx` : setState synchrone dans un effet, ancre HTML interne et apostrophe JSX. Ces trois erreurs ont été corrigées dans un commit séparé. **Cela ne vaut pas preuve de réussite pour les CI ultérieures : contrôler leurs SHA et résultats.**

Modifications complémentaires :
- La restauration de la partie *rejoue toutes les décisions* afin de vérifier les scènes effectivement proposées, les variations de jauges, les drapeaux et la fin. Les états trafiqués, y compris les fins prématurées artificiellement prolongées, sont rejetés sans écraser le moteur.
- Retour visible du dernier choix, avec variations positives/négatives sur les jauges. Les boutons et le clavier restent des alternatives au geste (WCAG 2.2, 2.5.7).
- Tests Vitest renforcés : les 4096 combinaisons doivent atteindre toutes les scènes et huit fins. Tests Playwright sur la sauvegarde, les gestes, le clavier, les conséquences et le recommencement, y compris une fenêtre de 320×568. Ces tests sont ajoutés au dépôt mais ne sont **pas déclarés verts** tant que la CI correspondante ne l'atteste pas.
- Version 2 du pilote : une nouvelle scène au chapitre 10 (« Deux affaires, une caméra ») donne une conséquence commune aux joueurs ayant à la fois une guerre avec Nox et un sponsor caché dont les preuves ont été effacées. Ce cas était auparavant pris en priorité par la seule scène Nox. La clé de sauvegarde passe en `.v2` pour éviter de réinterpréter l'ancien chemin narratif ; ce changement réinitialise les sessions du prototype précédent.

### Méthode éditoriale pour les épisodes suivants

La mécanique à conserver vient des quatre pressions lisibles, du geste simple et des conséquences qui réapparaissent. Chaque dilemme doit proposer **deux choix défendables** et une contrepartie compréhensible. Les meilleurs retours doivent provenir d'un personnage ou d'une promesse déjà rencontrée plutôt que d'une statistique surgie de nulle part. Éviter de transformer tous les choix « éthiques » en succès faciles et tous les choix de visibilité en désastre certain.

Avant d'intégrer des scènes créées avec une IA, les **réviser hors partie** : cohérence des personnages, drapeaux utiles, ramifications croisées, variété de ton, lisibilité mobile, absence d'emprunt à Reigns, puis simulation et tests. Le runtime ne sollicite aucune IA, aucune API et aucun service payant. Pour une future production de plusieurs centaines de scènes, étudier le langage ouvert Ink (conditions, « knots », embranchements rejoignables et suivi d'état), mais ne pas ajouter sa dépendance au pilote sans gain vérifié.

Références consultées : François Alliot, « Creating an adaptive narrative in Reigns », Game Developer (2016) ; W3C/WAI, « Understanding WCAG 2.5.7 Dragging Movements » ; inkle, documentation « Writing with Ink ».

### Régressions ciblées identifiées pendant les contrôles

La CI du SHA `91bc1ac` a exécuté 1 227 tests unitaires, dont 1 226 réussis : le test de parcours exhaustif a dépassé le délai Vitest de 5 secondes, avec une durée constatée supérieure à 6,9 secondes. La vérification reste exhaustive (4096 parcours et restauration) mais dispose désormais de **30 secondes**, sans allègement des assertions. Ce réglage n'est pas une preuve de réussite : attendre le job du SHA qui contient le correctif.

Un double-tap rapide sur le même bouton pouvait valider deux scènes successives : la position des boutons est conservée d'un chapitre à l'autre. Un verrou bref de 450 ms et une vérification du numéro d'étape empêchent le second choix involontaire. Un scénario Playwright `dblclick` vérifie que le chapitre 2 reste affiché après le double-tap. Le défaut a été reproduit dans la démo HTML autonome ; **la confirmation dans Next.js reste soumise au Playwright de la branche**, et la démo ne vaut pas preuve de rendu de production.

Les commits du pilote restent sur une PR brouillon non fusionnée ; ni la production ni l'économie du jeu de cartes ne sont modifiées.

## Passe de design mobile, 26 octobre 2026 (D-172)

La scène est devenue une **carte-événement de studio** : décor léger dessiné uniquement en CSS, bord et speaker propres à Toi/Flo/Nox/Mona, jauges resserrées, indicateur visible pour les valeurs critiques, choix côte à côte plus lisibles et art plus compact sur petites hauteurs. Les dimensions et couleurs restent dérivées des tokens existants dans `globals.css` et la typographie embarquée. Aucun média externe ni génération IA à l'exécution, aucun changement de gameplay.

Deux tests Playwright ciblés ont été ajoutés : identité de la carte pour Toi puis Flo et disposition 320×568 / 390×844 (absence de débordement horizontal, portrait visible, boutons de minimum 44×44). Le test existant des gestes, celui du clavier et celui de la sauvegarde continuent d'être utiles. La validation **reste en attente** du nouveau workflow GitHub sur le SHA de la livraison ; prévisualisation Vercel READY n'atteste pas l'aspect visuel. Pour la revue finale, ouvrir `/histoire` sur le lien de prévisualisation du SHA, observer la carte initiale et après le premier choix, la fin et le mouvement réduit. L'absence de Ponytail dans le catalogue disponible est maintenue, non simulée.

Ressources : `DESIGN.md` et les tokens du thème Pocket dans `src/app/globals.css` ; guide des pratiques React de Vercel ; W3C/WAI WCAG 2.2 (Dragging Movements, Target Size Minimum). Inspirations de présentation : mécanique du choix binaire de Reigns, sans reprise d'illustration ni de dialogue.


Complément exploratoire au contrôle visuel : une maquette HTML locale dérivée du prototype (et non l'application Next) a été chargée dans Chromium via `set_content`, car les navigations fichier/localhost étaient bloquées par l'environnement. À 320×568 et 390×844, aucun débordement horizontal détecté, boutons ~83 px de hauteur, aucun `pageerror`. La maquette a révélé deux petites retouches intégrées : titre sur une ligne à 320 px et libellé narratif « Ton point de vue » à la place d'un double « Toi ». Ces constats restent **des preuves de composition approximative** ; les vrais tests E2E et une inspection visuelle du déploiement demeurent indispensables.

## Itération ciblée : scène croisée et reflow accessible (26 octobre 2026)

Le contrôle du code a mis en évidence un cas narratif concret : la scène `double_crise` cite **Nox et Mona**, mais le décor reprenait seulement le premier nom de `speaker` et l'identité Nox. La carte affiche désormais « NOX + MONA » et un bandeau bicolore, sans nouvelle illustration externe, dépendance ou modification de scénario.

Autre défaut : les jauges ≤ 20 n'étaient signalées que par une couleur de bordure. Un libellé visible « NIVEAU CRITIQUE » et `aria-valuetext` explicitent la situation, indépendamment de la perception des couleurs. Les boutons évitent la répétition de chevrons et le titre ne force plus `white-space: nowrap` à 320 px ; les colonnes passent en une seule colonne à 280 px ou moins, pour le reflow et le zoom. Références : W3C WCAG 2.2, 1.4.1 (couleur), 1.4.4 (agrandissement), 2.5.7 (glissé), 2.5.8 (cibles).

Deux scénarios Playwright ajoutés : (1) le chemin Nox/Mona jusqu'au chapitre 10, avec alerte de confiance à 11/100 ; (2) le reflow à 240 px. **Les tests ont été écrits mais ne sont pas exécutés localement dans cette session** : le checkout complet et le serveur Next ne sont pas disponibles dans l'environnement de l'agent. Seule la vérification statique des remplacements et du code source a été faite ; attendre la CI du SHA correspondant. Ni test Android ni téléphone réel. 

## Passe anti-interface générique et correction des choix (26 octobre 2026)

Référence lue : skill **Impeccable** de Paul Bakaus (`pbakaus/impeccable`, `SKILL.md`, `reference/craft-floor.md` et `reference/polish.md`). Le lanceur CLI livré avec ce skill n'était pas disponible dans le contexte connecté ; ses règles ont été appliquées manuellement sur le périmètre Histoire. Les choix de la DA Pocket de `DESIGN.md` prévalent sur une palette générique.

- Retrait des halos et dégradés décoratifs, cercles arbitraires et cadrages pseudo-techniques : une carte d'histoire couleur papier/crème contraste désormais avec un moniteur noir estampillé « LIVE », issu de l'univers CreatorDeck.
- Jauges moins encartées, choix sobrement matérialisés et hiérarchie renforcée sans copier Reigns.
- Correction du **survol tactile persistant** : la surbrillance `:hover` n'est activée que pour `hover:hover` et `pointer:fine`, les boutons suppriment leur focus programmatique lors d'un clic sur écran sans survol. Les clics clavier (`event.detail === 0`) gardent leur focus visible. Le verrou contre le double-tap reste inchangé. Vérifier par test Playwright sur navigateur tactile et contrôle sur appareil Android avant validation finale.
- Tous les changements sont limités à `story-mode.tsx`, `story-mode.css`, tests du mode et documentation du mode ; aucun thème global, moteur de cartes, économie ou route d'accueil modifiés.

L'audit du nouveau visuel en maquette HTML locale a montré une surcharge des quatre tuiles de jauges par leurs emojis respectifs. Le prologue conserve les **noms écrits, chiffres /100 et barres colorées**, mais retire les emojis de ces jauges seulement. La scène et les personnages ne sont pas modifiés. Un test Playwright vérifie l'ordre des noms et les progressbars accessibles. La maquette Chromium locale à 320/390 px n'a montré ni erreur JS ni débordement horizontal avec le nouveau papier crème (boutons 83 px de haut), mais n'est pas un test de l'application Next.js ni de l'APK.

## Passe « canaux de diffusion » et continuité du chapitre (26 octobre 2026)

Après validation de la CI intégrale verte du SHA `a80bada6` (GitHub Actions `40313342197`, 6 jobs réussis), une incohérence de récit a été identifiée : le moniteur de toutes les cartes affichait « LIVE », même lorsqu'il s'agissait d'un mail, d'un contrat ou d'une archive. Chaque scène déclare maintenant un canal narratif typé (`LIVE`, `CHAT`, `CLIP`, `DM`, `MAIL`, `CONTRAT`, `ARCHIVE`). Le point rouge n'apparaît que pour `LIVE`. Les règles, les statistiques et la sauvegarde V2 ne changent pas.

Un unique mouvement court de « changement de source » (volet du moniteur sur 240 ms) marque la scène suivante, sans faire bouger la carte ni le focus clavier. `prefers-reduced-motion: reduce` supprime ce mouvement. La barre de progression reflète désormais le chapitre visible : 1/12 dès l'ouverture, 2/12 après le premier choix, au lieu de 0/12 et 1/12. Trois scénarios Playwright et un test de validation des canaux ont été ajoutés. La vérification CI et le rendu de cette nouvelle passe restent à confirmer sur le SHA poussé ; aucune validation sur téléphone réel.

## Correction complémentaire : appareils hybrides tactiles/souris (26 octobre 2026)

Le précédent correctif du bouton A/B désactivait le survol CSS sur les écrans déclarant `hover: none`. Un ordinateur tactile ou appareil hybride peut néanmoins annoncer `hover: hover` tout en produisant des taps : un bouton conservé entre deux scènes peut alors sembler déjà sélectionné. Les boutons mémorisent maintenant **le type du pointeur réel** lors du contact ; un tap au doigt ou au stylet inhibe leur style `:hover` persistant et retire leur focus après activation. Une entrée ultérieure à la souris rétablit le survol, et le clavier conserve son focus visible. Le verrou de 450 ms contre les doubles décisions et le moteur narratif sont inchangés.

Un test Playwright supplémentaire émule un contexte avec capacité tactile et souris, vérifie le chapitre suivant, le fond neutre, l'absence de focus après tap et le retour du survol souris. **Test écrit, non exécuté localement** : contrôler la CI du nouveau SHA, puis le comportement sur un véritable appareil hybride si disponible. Aucune dépendance, modification globale ou publication en production.

## Lisibilité du chapitre après décision sur petit écran (26 octobre 2026)

Défaut identifié dans le parcours : sur un téléphone court, les boutons A/B sont en dessous de la carte. Après un choix, le navigateur peut conserver la position de défilement au niveau des boutons ; la **nouvelle scène apparaît alors au-dessus de la zone visible**, obligeant le joueur à remonter manuellement à chaque décision. Le code aligne désormais le début du nouveau chapitre dans la fenêtre **uniquement si** son contenu n'est pas entièrement visible, sans défilement animé imposé. Les zones de sécurité du téléphone sont respectées via `scroll-margin-top`.

Après une activation **au clavier**, le focus passe à la nouvelle carte jouable (ou à l'écran de fin) : le joueur peut continuer avec les flèches sans rechercher la cible. Après un **tap ou un geste**, aucun focus de clavier n'est forcé et la correction du survol tactile demeure. Le garde-fou de 450 ms, la sauvegarde et les règles narratives sont inchangés. Deux tests Playwright ajoutés : relecture de la scène sur viewport 320×568 après clic en bas d'écran, puis transfert de focus et enchaînement Entrée/flèche. Le test de focus clavier précédent est adapté à cette nouvelle navigation. Validation à confirmer sur la CI du SHA de cette passe et sur téléphone réel ; aucune exécution Android locale revendiquée.

## Prévisualisation des décisions au glissement (26 octobre 2026)

Le geste gauche/droite montrait auparavant le libellé de l'option seulement au seuil de validation (64 px) : l'utilisateur devait quasiment s'engager avant de pouvoir lire la décision. La prévisualisation apparaît désormais dès 18 px, **sans déclencher la décision** ; la confirmation visuelle (fond vert acide et coche) ne s'affiche qu'à 64 px. Un relâchement avant le seuil annule le choix, et les deux boutons restent disponibles. Les libellés d'aperçu sont masqués aux lecteurs d'écran (`aria-hidden`) pour éviter la répétition des choix déjà accessibles par boutons.

Test Playwright ajouté : aperçu à 38 px, relâchement sans avancer, puis franchissement à 95 px et validation. Les vérifications CI et le geste sur Android réel doivent être distingués ; aucun test sur appareil physique revendiqué. Changement limité au composant Histoire, à sa feuille de style, au test et à ce document.

## Bilan de saison consultable (26 octobre 2026)

À la fin du prologue, le joueur peut maintenant ouvrir « Revoir mes N décisions » pour retrouver les dilemmes traversés et **les libellés exacts des choix qu'il a faits**, dans l'ordre. Ce bilan facultatif sert à comprendre son parcours et à envisager une autre partie, sans dévoiler les scènes non rencontrées ni afficher les effets futurs. Il est calculé exclusivement depuis l'historique vérifié du moteur et les scènes locales du script, sans stockage, dépendance ou coût supplémentaire.

Le bilan est un élément HTML natif `details/summary` (fermé par défaut, contrôlable au clavier), avec une cible tactile de 48 px, un indicateur d'ouverture CSS et des contrastes hérités du thème Pocket. L'option de recommencer reste visible même quand le bilan est fermé. Le scénario Playwright de fin de partie vérifie l'ouverture, le premier choix réellement effectué, le rechargement d'une fin sauvegardée et le redémarrage. À cette étape, seules les modifications statiques sont contrôlées avant push ; attendre la CI du nouveau SHA pour la preuve de fonctionnement navigateur, et ne pas confondre avec un test sur téléphone réel.

## Correction des conséquences plafonnées (26 octobre 2026)

Les chiffres affichés dans « TON DERNIER CHOIX » reprenaient auparavant les effets **théoriques** du scénario. Lorsque la jauge atteignait 0 ou 100, l'écran pouvait annoncer « +20 » alors que le joueur n'avait gagné que 5 points. `lastStoryAppliedEffects` reconstitue désormais l'état avant le dernier choix à partir de l'historique déjà validé, puis calcule la différence réellement appliquée. Les choix, les conditions, la sauvegarde V2 et les fins restent inchangés ; aucun nouveau format de sauvegarde ni service externe.

Deux tests unitaires couvrent un dépassement simultané de 100 et de 0, la restauration de la partie et les conséquences d'un parcours normal. Les contrôles de code ne remplacent pas la CI du SHA publié, ni une vérification de rendu sur téléphone réel.

## Passe HUD et mouvements (27 octobre 2026)

- Sur la PR #24 uniquement, rafales de `pointermove` cadencées par `requestAnimationFrame`. Les seuils, la garde anti-double tap et les sauvegardes V4 sont inchangés ; les gestes annulés nettoient la frame en attente.
- La carte gagne un décollement de 4 px au maximum sous le doigt ; le dos possède un filet intérieur. Le décor ne réserve plus en permanence de couche de composition via `will-change`.
- Les cibles des quatre jauges mesurent au moins 44 px, y compris à 320 px. L'inspection d'une jauge et le détail de mission ne restent plus ouverts après la décision suivante.
- Tests Chromium et WebKit ajoutés pour ouverture/fermeture des panneaux, gestes partiels, hauteur tactile et absence de débordement. Résultats à relever après publication du commit ; simulation WebKit et véritable Safari iOS restent deux preuves différentes.

## Double crise, deux portraits (27 octobre 2026)

La confrontation `double_crise` ne doit plus afficher le personnage générique sous une légende « NOX + MONA ». Les bustes SVG fictifs Nox et Mona se partagent la scène dans une composition en diptyque, avec deux palettes et un séparateur discret. Le parcours E2E existant vérifie les deux personnages et prend des captures à 320 et 390 px. Aucun changement narratif ou économique ni modification du moteur/sauvegarde.
