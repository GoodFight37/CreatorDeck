# Plans d'animation — ouverture des boosters et révélation des cartes

Audit du 23 octobre 2026 (commit `ebed7eec`), grille d'Emil Kowalski (skill
`improve-animations`). Chaque plan est autonome : code actuel, code cible, étapes, limites et
vérifications. Un exécuteur peut les suivre sans autre contexte.

Déjà bon, à ne pas « corriger » : tout est en CSS (pas de bibliothèque), jetons de courbe
présents (`--ease-out`, `--ease-in-out`, `--ease-drawer` dans `src/app/globals.css:76`), aucun
`ease-in`, `transition: all` ni `scale(0)`, mouvement réduit et Reflets gérés. Choix actés
respectés : extraction de 1 200 ms (`PACK_TEAR_MS`, D-132), protections anti-saut de
révélation, mise en scène des Rare et plus, retournement Mèmes par `scaleX` (correctif
Android WebView).

| # | Plan | Gravité | Statut |
|---|---|---|---|
| 001 | [Retourner les cartes Mèmes communes en 280 ms](001-memes-retournement-rapide-des-communes.md) | HIGH | FAIT |
| 002 | [Faire disparaître le sachet déchiré à la révélation](002-retrait-complet-du-sachet-a-la-revelation.md) | MEDIUM | FAIT |
| 003 | [Appui fluide du bouton « suivant »](003-bouton-suivant-appui-fluide.md) | LOW | FAIT |
| 004 | [Mouvement réduit : fondu doux](004-mouvement-reduit-fondu-de-la-carte.md) | LOW | FAIT |
| 006 | [Récapitulatif Mèmes en cascade](006-recap-memes-entree-en-cascade.md) | LOW | FAIT |
| 005 | [Une seule source par animation d'ouverture](005-regrouper-les-animations-d-ouverture.md) | LOW, optionnel | FAIT |
| 007 | [Glissé du doigt fluide entre les boosters](007-carrousel-glisse-fluide.md) | HIGH | FAIT |
| 008 | [Booster holographique qui penche](008-booster-holographique-qui-penche.md) | Amélioration | FAIT |

## Ordre recommandé

0. **007** d'abord : saccades ressenties sur le téléphone de Malik (Redmi Note 12 Pro). Puis **008**, qui touche le même composant (`booster-carousel.tsx`) et suppose 007 en place.
1. **001** puis **004** : même fichier (`meme-reveal.css`), 004 suppose les keyframes de 001 en place.
2. **003** et **006** : même fichier aussi, indépendants entre eux ; les faire après 001.
3. **002** : indépendant (`booster-continuity.css`), à faire valider à l'œil par Malik (préférence possible).
4. **005** en dernier, seulement si le reste est vert : ménage sans effet visible, le plus risqué.

Plans 001, 003, 004, 006 touchent `src/components/meme-reveal.css` : un seul exécuteur à la
fois sur ce fichier.

## Pour tous les plans

- Tests e2e : lancer Playwright avec `NEXT_PUBLIC_SUPABASE_URL=` et `NEXT_PUBLIC_SUPABASE_ANON_KEY=` vides pour les parcours locaux, ou avec le cloud factice de la CI pour les scénarios « avec le serveur » (`https://verification-test.supabase.co` / `placeholder-key-ne-verifie-jamais-rien-000000000000000000000000`). Sinon `.env.local` active le vrai cloud et les tests expirent un par un.
- Android (émulateur, APK, téléphone) n'est vérifié par aucun plan : à faire par Codex ou Malik.
