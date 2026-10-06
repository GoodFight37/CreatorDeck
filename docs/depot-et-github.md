# Le dépôt, en clair

But : **un dépôt, une branche de référence, un historique léger.**

## État au 5 octobre 2026

- Le dépôt GitHub s'appelle **`GoodFight37/CreatorDeck`** (renommé depuis
  `GoodFight37/test` le 5 octobre 2026). GitHub redirige automatiquement
  l'ancienne adresse.
- L'historique de `main` a été **mis à plat** le 5 octobre 2026 : un seul
  commit racine qui contient exactement les fichiers actuels. Les anciennes
  versions du catalogue (portraits inutilisés) ne pèsent plus dans l'historique.
- Les PR #4 (régions, booster unique, thèmes, cloud, compte invité) et #5
  (vitrine des 4 cartes + profils publics) sont fusionnées. La PR #3 est fermée.
- L'application Next.js en export statique est la source de vérité. Le kit
  Unity de la PR #3 est hors périmètre : cette PR doit être fermée sans fusion,
  car elle apporte environ 11 Mo de ressources qui n'appartiennent pas au jeu.

## État au 6 octobre 2026

- `main` reste la **branche de référence** ; le chantier en cours (cloud, jeu à
  plusieurs, refonte visuelle) vit sur `arena/01a10c75-creatordeck`, poussée à
  chaque étape terminée. C'est cette branche qu'on teste : le workflow
  **APK Android (debug)** accepte n'importe quelle branche, et les migrations
  Supabase (`0001` → `0011`) se collent dans le SQL Editor.
- La **PR #7** suit cette branche et sert de journal : elle reste ouverte
  jusqu'à la fin du chantier — on ne la fusionne pas au milieu.
- Une branche `arena/…` par session : `arena/01a10c2b`, `arena/01a10c54`,
  `arena/01a10c75`. Pendant qu'une session écrit, pas d'autre push, merge ni
  réécriture en parallèle (même règle que « Un seul écrivain à la fois »).
- Les branches d'essai (`claude/…`) ne sont **jamais fusionnées** : elles se
  relisent avant toute conclusion.

## Un seul écrivain à la fois

Pendant qu'une session Arena travaille sur le dépôt, pas d'autre push, merge
ni réécriture en parallèle. C'est la seule règle : elle évite les conflits
de force-push et les pertes de travail.

## Le jour où l'historique regrossit

Si `main` finit par accumuler beaucoup d'objets (nouvelles versions du
catalogue avec portraits périmés, par exemple), on pourra refaire une mise à
plat dans le même esprit que celle du 5 octobre 2026 :

1. Vérifier qu'aucune PR n'est ouverte et qu'aucune session active n'écrit.
2. Cloner temporairement avec `--depth 1 --single-branch --branch main`.
3. Créer un orphan, committer, renommer en `main`, push forcé.
4. Supprimer le clone temporaire.
5. Réaligner les copies locales sur le nouveau `main`.

La release `debug-apk`, les variables de dépôt et le workflow Android restent
en place : ils ne dépendent pas de l'historique d'une branche.
