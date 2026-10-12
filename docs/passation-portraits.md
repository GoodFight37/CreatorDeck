# Reprise courte : portraits CreatorDeck — 12 octobre 2026

## État vérifié

Code publié sur `main` : `433ee065f98c8ff2956d90c480acfb59f0890b86`.
[CI](https://github.com/GoodFight37/CreatorDeck/actions/runs/38186329103) :
**success, quatre jobs**. [Workflow Supabase automatique](https://github.com/GoodFight37/CreatorDeck/actions/runs/38186571263) : success.
Tests locaux : 13 unitaires, 11 DOM, 2 E2E bureau/téléphone simulé ; build,
typecheck, ESLint ciblé et catalogue réussis. Téléphone physique non testé.

Rubius et Shroud sont remplacés par des portraits carrés WebP **900 px**.
Les crédits sont repliés dans **Toi → Réglages → Crédits des images**,
jamais sur les cartes. Avatars Twitch conservés ; les remplacements sont
protégés des régénérations. Sources/licences issues du manifeste fourni.

## Reste à faire

Malik souhaite des photos plus nettes et intéressantes pour les grands
créateurs, puis ajuster individuellement. Garder les petits avec leurs images
actuelles. **Seulement deux remplacements sur les 50 premiers** : le premier
lot avait dix candidates ; ne pas le présenter comme une solution complète.
AdinRoss écarté pour qualité ; Rivers reste à comparer. Cinq photos Flickr sont
tous droits réservés ; ne pas les publier sans autorisation. KaiCenat reste
marqué « droits à vérifier » dans le manifeste.

La nouvelle session de Malik possède la configuration réseau modifiée.
**L'ancien chat refuse toujours Google/Phosphore via le proxy** : tests directs
effectués après le changement. Ne pas lui faire refaire l'environnement.
Tester les accès dans sa nouvelle session et avancer avec les sources accessibles.
Les échecs Google du premier rapport provenaient de pages HTML non exploitables :
essayer un vrai navigateur s'il est disponible, sans contourner les protections.
Travailler par petits lots ; pas de nouveau modèle coûteux ou de recherche exhaustive.

## Lecture minimale et prochaine action

**Recherche seule** : ce document suffit ; aucun clone ni audit du dépôt.
Trouver quelques portraits individuels originaux, noter source/auteur/licence,
puis fournir ZIP + manifeste. Les huit candidates non intégrées sont référencées
dans [portrait-candidates.csv](portrait-candidates.csv), à lire seulement si utile.
Premier petit lot conseillé : Squeezie (`squeezie`), Gotaga (`gotaga`),
Amine (`aminematue`), Ninja (`ninja`), xQc (`xqc`). Pour Gotaga, chercher une
alternative à la photo Flickr tous droits réservés déjà reçue.

**Intégration** : vérifier HEAD/main et l'état local ; lire seulement
`src/data/portrait-overrides.json`, `src/lib/creator-portraits.ts` et
`docs/catalogue-twitch.md` (première section). Les nouveaux fichiers vont dans
`public/creators/curated/` et leur provenance dans le registre JSON.
Carte, affiche et préchargement utilisent déjà le même choix.
Si les composants changent : `image-credits.tsx`, `profile-view.tsx`.
Tests ciblés : creator-portraits/preload/credits, ecrans-credits, puis
portrait-credits.spec.ts si le rendu change. Cache Playwright local :
`PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright` si présent.

Publier normalement sur main après contrôles adaptés, sans redemander accord.
Préserver les changements/commits des autres agents. Aucune nouvelle règle de
jeu, migration ou refonte n'est demandée dans ce chantier. Les anciens briefs
produit sont déjà faits : ne pas les recommencer. Mettre à jour cette passation
courte ; les archives restent disponibles seulement pour une question précise.
