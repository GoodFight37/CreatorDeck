# 005 — Régler chaque animation d'ouverture dans un seul fichier

- **Status**: DONE — 23 octobre 2026 (branche `arena/46a8ddec-creatordeck`)
- **Commit**: ebed7eec
- **Severity**: LOW
- **Category**: Cohesion & tokens
- **Estimated scope**: 2 fichiers CSS, ~40 lignes, aucun changement visible attendu

## Problem

Les animations de l'ouverture du sachet sont déclarées dans `booster-premium.css` (raccourci
`animation:` complet) puis partiellement réécrasées dans `booster-continuity.css`, qui est
plus spécifique (`.booster-cinematic.booster-presentation …`) et ne change parfois que le
nom ou la durée. Résultat : la courbe ou le remplissage réellement appliqués viennent d'un
fichier, le nom d'un autre. Plusieurs keyframes ne sont plus jamais jouées. `PackTear`
(`src/components/pack-tear.tsx`) pose toujours les deux classes `booster-cinematic` et
`booster-presentation` sur la même racine : les règles de `booster-continuity.css` gagnent
toujours.

```css
/* src/app/booster-premium.css:525-537 — current (valeurs en partie écrasées) */
.booster-cinematic .booster-foil-open .foil-top-piece {
  animation: foil-actual-cap-peel 1250ms cubic-bezier(.17,.8,.16,1) both;
}
.booster-cinematic .booster-foil-open .foil-body-piece {
  animation: foil-actual-body-drop 1550ms cubic-bezier(.19,.7,.3,1) both;
}
.booster-cinematic .booster-foil-open .foil-card-chamber {
  animation: foil-cards-chamber-rise 1700ms cubic-bezier(.13,.7,.2,1) both;
}
.booster-cinematic .booster-foil-open .foil-back-card {
  animation: foil-card-exit 1650ms cubic-bezier(.13,.7,.2,1) both;
  animation-delay: calc(var(--card-i) * 43ms);
}
```

```css
/* src/app/booster-continuity.css — current, règles qui écrasent */
/* 162-167 */
.booster-cinematic.booster-presentation .booster-foil-open .foil-card-chamber {
  animation-name: scene-cards-rise;
}
.booster-cinematic.booster-presentation .booster-foil-open .foil-back-card {
  animation-name: scene-card-settle;            /* lui-même écrasé plus bas par scene-card-extract */
}
/* 486-493 */
.booster-cinematic.booster-presentation .booster-foil-open .foil-top-piece {
  animation-name: scene-cap-fold; animation-duration: 680ms;
  animation-timing-function: cubic-bezier(.18, .76, .2, 1);
}
.booster-cinematic.booster-presentation .booster-foil-open .foil-body-piece {
  animation-name: scene-body-fold; animation-duration: 900ms;
  animation-timing-function: cubic-bezier(.2, .7, .24, 1);
}
/* 528-534 */
.booster-cinematic.booster-presentation .booster-foil-open .foil-card-chamber { animation-duration: var(--pack-extraction-ms, 1200ms); }
.booster-cinematic.booster-presentation .booster-foil-open .foil-back-card {
  animation-name: scene-card-extract;
  animation-duration: calc(var(--pack-extraction-ms, 1200ms) - 250ms);
  animation-delay: calc(var(--card-i) * 50ms);
  animation-timing-function: cubic-bezier(.18, .74, .22, 1);
}
```

Valeurs réellement appliquées aujourd'hui (à conserver à l'identique) :

| Élément | Nom | Durée | Courbe | Délai | Remplissage |
|---|---|---|---|---|---|
| `.foil-top-piece` | `scene-cap-fold` | 680ms | `cubic-bezier(.18, .76, .2, 1)` | 0 | `both` |
| `.foil-body-piece` | `scene-body-fold` | 900ms | `cubic-bezier(.2, .7, .24, 1)` | 0 | `both` |
| `.foil-card-chamber` | `scene-cards-rise` | `var(--pack-extraction-ms, 1200ms)` | `cubic-bezier(.13,.7,.2,1)` (vient de premium) | 0 | `both` |
| `.foil-back-card` | `scene-card-extract` | `calc(var(--pack-extraction-ms, 1200ms) - 250ms)` | `cubic-bezier(.18, .74, .22, 1)` | `calc(var(--card-i) * 50ms)` | `both` |

## Target

Une seule règle complète par élément dans `booster-continuity.css`, avec les valeurs du
tableau ; suppression des déclarations et keyframes devenues mortes dans
`booster-premium.css`. Aucun changement visible.

```css
/* target — booster-continuity.css, remplace les règles 162-167, 486-493 et 528-534 */
.booster-cinematic.booster-presentation .booster-foil-open .foil-top-piece {
  animation: scene-cap-fold 680ms cubic-bezier(.18, .76, .2, 1) both;
}
.booster-cinematic.booster-presentation .booster-foil-open .foil-body-piece {
  animation: scene-body-fold 900ms cubic-bezier(.2, .7, .24, 1) both;
}
.booster-cinematic.booster-presentation .booster-foil-open .foil-card-chamber {
  animation: scene-cards-rise var(--pack-extraction-ms, 1200ms) cubic-bezier(.13, .7, .2, 1) both;
}
.booster-cinematic.booster-presentation .booster-foil-open .foil-back-card {
  animation: scene-card-extract calc(var(--pack-extraction-ms, 1200ms) - 250ms) cubic-bezier(.18, .74, .22, 1) calc(var(--card-i) * 50ms) both;
}
```

## Steps

1. Vérifier que `PackTear` est le seul utilisateur de `.booster-cinematic` : `grep -rn "booster-cinematic" src --include=*.tsx`. S'il y en a un autre sans `booster-presentation`, S'ARRÊTER et le signaler.
2. Repérer les autres règles qui touchent ces quatre éléments pendant l'ouverture (mouvement réduit, Reflets coupés, `scene-scene`) : `grep -n "foil-top-piece\|foil-body-piece\|foil-card-chamber\|foil-back-card" src/app/*.css`. Ne pas les modifier ; elles doivent garder la priorité (elles sont après, ou plus spécifiques). Les relire une fois l'édition finie.
3. Dans `booster-continuity.css`, remplacer les règles 162-167, 486-493 et 528-534 par les quatre règles cibles, placées à l'endroit de la règle 486 (ordre conservé avant les règles de mouvement réduit).
4. Dans `booster-premium.css`, supprimer les règles 525-537 (quatre blocs ci-dessus).
5. Pour chaque keyframe `foil-actual-cap-peel`, `foil-actual-body-drop`, `foil-cards-chamber-rise`, `foil-card-exit`, `scene-card-settle` : `grep -rn "<nom>" src`. Supprimer le bloc `@keyframes` seulement s'il n'est plus cité nulle part.

## Boundaries

- Aucun changement de valeur : durées, courbes, délais et noms du tableau doivent rester exactement identiques.
- Ne PAS toucher `PACK_TEAR_MS`, la déchirure au doigt, les règles de mouvement réduit ou de Reflets.
- Conserver les fins de ligne CRLF de `booster-continuity.css` (vérifier `git diff --stat` : quelques dizaines de lignes, pas tout le fichier).

## Verification

- **Mécanique** : avec `NEXT_PUBLIC_SUPABASE_URL=` et `NEXT_PUBLIC_SUPABASE_ANON_KEY=` vides, `npx playwright test e2e/pack-tear.spec.ts --workers=1` → tout vert, **captures de référence inchangées**.
- **Feel check** : ouvrir un booster et comparer à 10 % dans DevTools > Animations avec une version d'avant (autre onglet sur `main`) : mêmes durées, mêmes courbes, mêmes décalages entre les cinq cartes.
- **Done when** : une seule source par animation, tests verts, aucune différence visible.
