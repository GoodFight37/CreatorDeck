# Import portraits manuels — lot du 13 octobre 2026

Malik a envoyé `portraits-01.zip`, issu de son dossier d’export. Le ZIP contient
154 fichiers WebP directement à sa racine et un `manifest.json` de test avec un
seul créateur fictif. Ce manifeste ne correspond pas aux images et n’a pas servi
à construire l’import.

Contrôle avant import : les 154 fichiers sont décodables, carrés en 450 × 450 px,
et leur nom correspond à un slug existant du catalogue. Ils ne recouvrent aucun
des 300 portraits précédemment choisis manuellement. L’image `9pasha.webp`
remplace la priorité d’un portrait crédité ; le fichier crédité reste dans le
dépôt, mais sa source n’est plus affichée comme crédit de l’image active. Les
154 fichiers sont importés sans réencodage sous `public/creators/manual/` et
ajoutés au registre `manual-portrait-overrides.json`. Le nombre de portraits
manuels passe à 454 ; le filtre du pilote laisse 542 candidats sur 1 000.

Le lot ne fournit pas de crédits par image. Ils ne sont pas inventés ni utilisés
comme critère de sélection ; la section des crédits indique que ces images sont
importées manuellement sans source fournie. Les images restent celles choisies
et exportées par Malik. L’import ne met à jour ni les avatars d’origine ni les
archives Upscayl.

Vérifications locales : portrait ciblé 33/33, `npm test` 73 fichiers / 1 164
tests, `npm run ecrans` 21 fichiers / 124 tests, `npm run typecheck`, ESLint
ciblé et `npm run build` réussis. Le build local sans cloud a émis l’avertissement
habituel sur les variables Supabase absentes ; la compilation statique a réussi.
Le premier CI sur `a621417c` a révélé uniquement des attentes E2E de crédits
devenues obsolètes après les remplacements. Elles ont été mises à jour dans
`fd6d3527`. Le run final
[`38469322128`](https://github.com/GoodFight37/CreatorDeck/actions/runs/38469322128)
est vert, 6/6 jobs : tests/unitaires et build, trois shards Playwright,
migrations Postgres jetable et chemin cloud simulé. Le SHA distant de `main`
a été vérifié à `fd6d35270d196f1deba0d0a1a8f65f6b508242e2`.
