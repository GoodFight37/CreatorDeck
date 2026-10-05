# Le dépôt, en clair

But : **un dépôt, une branche de référence, un historique léger.**

## État au 5 octobre 2026

- Le dépôt GitHub s'appelle encore `GoodFight37/test`. Le renommage vers
  `GoodFight37/CreatorDeck` reste à faire par le propriétaire, après la fusion
  de la vitrine.
- La PR #4 est fusionnée dans `main` (`ac67f35`) : régions et saisons, booster
  unique, thèmes, sons, sauvegarde cloud et compte invité.
- La branche de cette session est `arena/01a10c2b-creatordeck`. Elle porte la
  vitrine et les profils publics ; ne pas réécrire l'historique, renommer le
  dépôt ni supprimer de branche avant que sa PR soit fusionnée.
- L'application Next.js en export statique est la source de vérité. Le kit
  Unity de la PR #3 est hors périmètre : cette PR doit être fermée sans fusion,
  car elle apporte environ 11 Mo de ressources qui n'appartiennent pas au jeu.

## Vérifications avant le rangement

À faire **après la fusion de la PR de vitrine**, pas pendant son développement :

- [ ] Vérifier qu'il ne reste aucune PR ouverte : `gh pr list --state open`.
- [ ] Vérifier que la PR #3 « kit Unity » est bien **fermée sans fusion** ; si
      elle est encore ouverte, la fermer sans la fusionner.
- [ ] Lister les branches distantes (`git branch -a`) et ne supprimer que les
      branches réellement mortes, après avoir vérifié qu'aucune PR ni session
      active n'en dépend. Garder `main` comme seule branche de référence.
- [ ] Vérifier que le prototype Unity et ses ressources ne sont pas importés
      dans la branche produit. Ne pas recopier d'assets tiers dans le jeu.
- [ ] Confirmer que la PR de vitrine est fusionnée et que personne d'autre
      n'écrit dans le dépôt avant la mise à plat de l'historique.

## Renommer le dépôt (à faire par le propriétaire)

Sur GitHub : **Settings → General → Repository name**, remplacer `test` par
`CreatorDeck`. GitHub conserve les redirections de l'ancienne adresse. Faire
ce renommage une fois les PR terminées ; les commandes de mise à plat ci-dessous
fonctionnent avec les deux URL.

## Mise à plat de l'historique (facultatif, environ 92 Mo → 30 Mo)

Les anciennes versions du catalogue gardent des portraits inutilisés dans
l'historique. La mise à plat remplace l'historique de `main` par un commit
racine qui contient exactement les fichiers actuels. Les autres branches
peuvent conserver les anciens objets : ne les supprimer qu'après les
vérifications ci-dessus.

**À ne lancer qu'après la fusion de toutes les PR utiles et la vérification des
branches.** Pendant l'opération, il faut **un seul écrivain à la fois** : pas
d'autre push, merge ou réécriture jusqu'à la fin. Dans PowerShell, une commande
par ligne, depuis le dossier où tu veux créer le clone temporaire :

```powershell
git clone --depth 1 --single-branch --branch main https://github.com/GoodFight37/test.git creatordeck-plat
Set-Location creatordeck-plat
git checkout --orphan propre
git add -A
git commit -m "CreatorDeck : application, catalogue et documentation"
git branch -M propre main
git push origin main --force
Set-Location ..
Remove-Item -Recurse -Force creatordeck-plat
```

Si le dépôt a déjà été renommé, tu peux utiliser dès la première ligne
`https://github.com/GoodFight37/CreatorDeck.git`. Le `--depth 1` ne récupère que
l'état courant de `main` ; `checkout --orphan` crée un historique neuf et le
push forcé remplace ensuite `main`. **Ne lance pas ces commandes avant la
fusion de la vitrine.**

### Après la mise à plat

Vérifier sur GitHub que `main` pointe sur le commit racine attendu. Toute copie
locale ou branche de travail doit ensuite être réalignée par son propriétaire
sur le nouveau `main` ; ne pas pousser une ancienne branche par-dessus.

### Ce qui n'est pas touché

- La release `debug-apk` et l'APK publié restent en place : une release ne
  dépend pas de l'historique d'une branche.
- Les variables de dépôt (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`) et le workflow Android restent configurés.
- La mise à plat de `main` ne supprime pas automatiquement les branches
  distantes : leur nettoyage est une opération distincte, après vérification.
