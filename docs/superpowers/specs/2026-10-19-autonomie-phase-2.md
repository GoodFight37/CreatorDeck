# CreatorDeck — autonomie de test, phase 2

## Intention

Étendre la qualité mobile locale déjà publiée pour détecter et caractériser les échecs persistants, conserver une reprise sûre, améliorer les preuves Android et fermer le contournement de vérification de l’APK.

## Objectifs

- Réutiliser le rapport et la tâche locale existants, sans appel IA après un succès.
- Distinguer un échec transitoire d’un incident confirmé, dédupliquer les incidents et borner toute action IA.
- Préparer un paquet de reprise contenant SHA, commandes, cause courte et liens vers les traces locales.
- Préparer une reprise Codex seulement pour un incident confirmé et nouveau; ne lancer une session automatique qu'après preuve de l'isolation, de l'installation hors ligne des dépendances et des limites d'exécution.
- Réserver Claude aux revues complexes prévues par `delegate-claude.mjs`, sans appel pendant les tests courants.
- Attendre une interface Android réellement prête avant les captures et vérifier des interactions et une mise à jour d’APK dans l’émulateur disponible.
- Autoriser la publication APK seulement après une Vérification réussie de la même révision `main`, y compris depuis un déclenchement manuel.
- Maintenir les diagnostics du téléphone opt-in, minimaux, locaux et effaçables; aucune donnée personnelle ni télémétrie distante dans cette phase.

## Contraintes et non-objectifs

- Aucun runner auto-hébergé sur la session Windows sans isolation vérifiée contre les PR et les révisions non fiables.
- Aucun appel IA de démonstration, aucun appel API facturé séparément, aucune publication sensible automatique.
- Aucun secret, identifiant, compte utilisateur ou contenu de jeu dans les rapports.
- Le job local ne touche pas les modifications préexistantes du checkout.
- Les tests verts consomment zéro quota IA.

## Architecture retenue

Le lanceur local conserve un rapport par passage, rejoue une fois les étapes échouées, puis enregistre uniquement les échecs persistants sous une empreinte SHA + scénario. Une nouvelle panne persistante produit un paquet compact de reprise. La CLI Codex n’est pas appelée automatiquement tant que son isolation hors ligne et le test de correctif dans un export séparé ne sont pas validés. Aucune branche partagée ni aucun déploiement ne sont modifiés. La CI GitHub conserve ses runners hébergés et joint un diagnostic sans IA aux échecs. Les diagnostics réels restent sur l’appareil et sont partagés volontairement. L’émulateur est contrôlé par l’outil installé localement; l’état prêt est établi par une attente applicative, pas par le seul démarrage Android.

## Approbation

Cette spécification transpose la mission de Malik du 19 octobre 2026. Les appels Codex sur un incident confirmé sont autorisés par cette mission, sous les limites ci-dessus. La délégation Claude reste conditionnelle et aucun appel n’est autorisé pour une démonstration artificielle.
