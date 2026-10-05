# Le dépôt, en clair

But : **un dépôt, une branche vivante, un historique léger.**

## Où en est le rangement (5 octobre 2026)

- L'ancien dépôt `GoodFight37/CreatorDeck` (prototype en JavaScript du 24-25 septembre, remplacé par
  l'application Next.js) a été **supprimé**. GitHub permet de le restaurer pendant 90 jours
  (Settings → Deleted repositories) si un document manque.
- Toutes les branches mortes ont été supprimées : `creatordeck-local-first`, `arena/01a0de81-test`,
  `arena/01a0e506-test`.
- La PR #3 (kit Unity + 11 Mo de fichiers Pokémon importés) a été **fermée sans être fusionnée** :
  elle allait contre la règle « aucun contenu Pokémon dans l'app », et l'ouverture 3D a été
  remplacée depuis par des animations CSS/canvas, bien plus légères.
- Il ne reste donc que `main` (la source de vérité) et `arena/01a10b32-test` (la branche de travail
  de la session en cours).

## À faire une fois, à la main (2 clics)

Renommer le dépôt `test` → **`CreatorDeck`** : *Settings → Repository name*. GitHub conserve des
redirections, donc les anciens liens (page du dépôt, release de l'APK, `git remote`) continuent de
fonctionner.

## Mise à plat de l'historique (facultatif, ~30 Mo au lieu de ~92 Mo)

L'historique a gardé chaque version du catalogue : ~30 Mo par régénération d'avatars. Résultat, le
dépôt pèse ~92 Mo dont ~62 Mo d'images que plus personne n'utilise. Les commandes ci-dessous
réécrivent `main` **et** la branche de travail sur un seul commit contenant exactement les fichiers
actuels — rien n'est perdu, seul l'historique est remplacé.

**À lancer dans PowerShell, une commande par ligne**, depuis un dossier de travail (par exemple
`C:\dev`), et de préférence **après la fusion de la PR en cours** :

```powershell
git clone --depth 1 --single-branch --branch arena/01a10b32-test https://github.com/GoodFight37/test.git creatordeck-propre
cd creatordeck-propre
git checkout --orphan propre
git add -A
git commit -m "CreatorDeck : application, catalogue et documentation"
git branch -M propre main
git push origin main --force
git push origin main:arena/01a10b32-test --force
cd ..
Remove-Item -Recurse -Force creatordeck-propre
```

Ce que ça fait, ligne par ligne : on récupère seulement l'état actuel de la branche de travail
(`--depth 1`, ~30 Mo), on fabrique un commit racine qui contient cet état
(`checkout --orphan` + `git add -A`), puis on réécrit les deux branches distantes sur ce commit.

**Si tu as déjà renommé le dépôt**, remplace l'adresse par
`https://github.com/GoodFight37/CreatorDeck.git` — l'ancienne adresse fonctionne encore, mais autant
utiliser la nouvelle.

### Après la mise à plat

Dis-le simplement à l'agent : il réaligne sa copie de travail sur la nouvelle branche
(`git fetch` puis `git reset --hard`, sans rien réécrire côté serveur), et le travail reprend
normalement.

### Ce qui n'est pas touché

- La **release `debug-apk`** et l'APK publié restent en place : une release n'appartient pas à une
  branche.
- Les **variables de dépôt** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) et le
  workflow Android non plus.
- Les PR #1 à #3 restent consultables : elles gardent une copie des anciens commits.

### À propos du rythme

Chaque régénération du catalogue (`npm run catalog:source` puis commit des portraits) ajoute ~30 Mo
définitifs à l'historique. Deux habitudes suffisent : ne régénérer que si c'est vraiment nécessaire,
et refaire la mise à plat quand le dépôt repasse au-dessus de ~60 Mo.
