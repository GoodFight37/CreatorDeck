## K-034 — correctif testé, publication à suivre — 11 octobre 2026

Validation locale des fichiers séparée du plan calculé sur l'historique réel.
Manual déjà enregistrée ne bloque plus ; approbation maintenue si en attente.
28/28 tests outil et contrôles ciblés réussis ; CI distante à suivre.
Logs du run 38140833700 téléchargés : refus manual 0047 confirmé à distance.
Git/API/logs accessibles avec le preset et les six domaines, sans changement réseau.
0047 non réappliquée, K-031 inchangé, téléphone réel toujours à tester.
Commandes, SHA de base et prochaine action : [checkpoint courant](agent-handoff.md).
Les sections suivantes sont des observations historiques datées.

## Complément de reprise — 11 octobre 2026, après la passation initiale

État du code inspecté : `7b73b1864d122dd0cecd1ce5dba99da0c4b60899` sur main.
**0047 reste appliquée et vérifiée ; ne pas la réappliquer.**

- **K-034, non corrigé** : la première prévalidation de
  `scripts/supabase-deploy.mjs` utilise les versions du baseline 0001–0046,
  puis refuse 0047 manual avant de consulter l'historique réel. Reproduction
  locale sans connexion : `SUPABASE_DB_URL='' node scripts/supabase-deploy.mjs`
  renvoie « Validation manuelle requise : 0047_sabliers_en_ligne.sql. ».
  Le run automatique [38140833700](https://github.com/GoodFight37/CreatorDeck/actions/runs/38140833700)
  a échoué ; son erreur détaillée distante n'a pas été lue, donc le lien avec
  cette cause reste un diagnostic cohérent avec la reproduction locale.
- Prochaine correction : distinguer validation des fichiers et plan réellement
  en attente ; exiger l'approbation des migrations manual seulement lorsqu'elles
  sont absentes de l'historique réel. Tester le cas déjà appliqué et conserver
  les protections baseline, cible, TLS, historique et contrôle des objets.
  Aucune correction de code ni nouvelle application n'a été faite ici.
- Le chat précédent pouvait lire la configuration et disposait d'un outil de
  brouillon, mais aucun outil d'activation/publication. Malik signale que le
  bouton Edit ne fonctionne plus ; cause interface non déterminée. Il choisit
  de créer un nouvel environnement. Ne pas promettre que l'édition sera ensuite
  toujours disponible.
- Réseau initial recommandé : preset `package_managers`, domaines existants
  `*.vercel.app`, `api.github.com`, `cdn.playwright.dev`,
  `playwright.download.prss.microsoft.com`, `storage.googleapis.com`, plus
  `results-receiver.actions.githubusercontent.com` pour les logs Actions.
  Ce dernier domaine n'a pas été ajouté dans l'ancien environnement. Tester un
  vrai téléchargement de logs avant d'annoncer cet accès actif ; d'autres
  redirections peuvent nécessiter un diagnostic. Git/API fonctionnaient lors
  du diagnostic précédent ; cela doit être revérifié dans le nouvel environnement.
- Restent aussi l'essai sur téléphone et K-031, chantier séparé. L'acceptation
  du risque sans sauvegarde concernait uniquement l'application passée de 0047.
- Aucun agent ne réserve de travail pour cette reprise documentaire. Lire les
  entrées courantes avant les checkpoints historiques conservés plus bas.

# Passation à l’autre chat — déblocage Cloud et migration 0047

Date : 11 octobre 2026. Dépôt : https://github.com/GoodFight37/CreatorDeck
Projet Supabase : CreatorDeck, référence `yzxchpybqrfegvecihxf`.

Ce document permet de reprendre sans connaître la conversation du chat temporaire.
Les liens et résultats ci-dessous sont des observations datées : vérifier le HEAD
GitHub courant avant toute nouvelle modification.

## Résultat à retenir

**0047 est appliquée et ses objets ont été vérifiés dans la base CreatorDeck.**
Il ne faut pas la réappliquer pour résoudre les anciens messages d’erreur.
Les difficultés venaient de plusieurs couches distinctes : réseau du chat,
configuration des tests CI, puis incompatibilité de configuration du CLI.
Aucune erreur SQL propre à 0047 n’a été établie pendant cette reprise.

La migration était déjà codée et testée avant ce chat temporaire, dans `aded8ff`.
Ici, nous avons débloqué l’accès, corrigé les outils/tests qui empêchaient son
application, puis effectué l’application autorisée et ses vérifications.

## Pourquoi nous avons autant galéré

### 1. L’accès GitHub du chat Cloud n’était pas celui du runner GitHub

La première demande de Malik portait uniquement sur le réseau : lire la
configuration, conserver tous les domaines/presets et ajouter `api.github.com`.
Le brouillon a été enregistré puis relu. Il conservait :

- `*.vercel.app` ;
- `cdn.playwright.dev` ;
- `playwright.download.prss.microsoft.com` ;
- `storage.googleapis.com` ;
- le preset `package_managers` et ses domaines.

Seul `api.github.com` a été ajouté. Aucun script, dépôt, variable ou secret
n’a été modifié lors de cette étape. Enregistrer le brouillon ne rendait pas
l’accès immédiatement actif : validation/application/publication relevaient
des paramètres de l’environnement. Plus tard, les requêtes REST GitHub ont
réellement répondu HTTP 200, ce qui a permis de lire les runs et leurs étapes.

**Limite restée présente :** les logs détaillés se téléchargent sur un autre
hôte, notamment `results-receiver.actions.githubusercontent.com`. Le proxy les
refusait toujours, même quand `api.github.com` fonctionnait. Nous n’avons pas
élargi la liste des domaines ni contourné le proxy. Accès à l’API, accès aux
logs et connexion du runner à Supabase sont trois choses différentes.

### 2. Le checkout Cloud était plus ancien que le checkpoint GitHub

Le checkout était sur la branche locale `work`, à `39d0625`, alors que main
GitHub était à `9788208`. Nous avons fetché main, examiné les nouveaux commits
et fait une avance rapide dans le checkout existant. Aucun reset, écrasement,
worktree ou changement utilisateur perdu. Le checkpoint récent contenait déjà
0047 et son client ; repartir de l’ancien checkout aurait donné un faux diagnostic.

### 3. Deux scénarios cloud étaient lancés dans le job sans cloud

La CI de `9788208` échouait sur Playwright. Les jobs qualité/build, SQL jetable
et cloud simulé réussissaient. Les nouveaux tests cadeau et sablier exigeaient
un cloud configuré, mais le job navigateur général n’en fournissait aucun.

Nous avons reproduit localement les deux échecs sans cloud : tutoriel inattendu
pour le sablier, cadeau absent pour le parcours cadeau. La correction publiée
au commit **`1dd5b53`** :

- helper `cloudUrl()` partagé, avec chargement de la configuration comme Next dev ;
- tests explicitement ignorés lorsque le cloud n’est pas configuré ;
- noms « avec le serveur » pour les sélectionner dans le job cloud existant ;
- toutes les assertions conservées, RPC simulées, aucune connexion production.

Ce n’est pas une suppression des tests : **42 tests sans cloud ont passé, avec
6 cloud ignorés ; les 6 cloud ont passé séparément**, bureau/téléphone simulé.
Typecheck et lint ont passé. La CI complète du nouveau commit est devenue verte.

### 4. Un dry-run réussi ne prouvait pas que le CLI pouvait appliquer le SQL

Le dry-run du script Node vérifiait réellement TLS, cible, schéma minimal et
historique, puis calculait le plan. Il ne lançait pas le CLI d’application.
Il pouvait donc réussir pendant que le CLI restait incompatible avec le dépôt.

Le run manuel **38139794012** a affiché :

```text
Connexion TLS, projet CreatorDeck et historique vérifiés.
Migrations validées : 0047_sabliers_en_ligne.sql
failed to parse config ... invalid keys
```

Les champs refusés étaient notamment `health_timeout`, `orioledb_version`,
`storage.analytics`, `s3_protocol`, `vector`, `email_optional`, `oauth_server`,
`pgdelta` et `local_smtp`. Malik a copié cette erreur expurgée car les logs
restaient inaccessibles depuis le chat.

**Cause vérifiée :** le workflow installait le CLI officiel **2.39.2**, plus
ancien que les options présentes dans `supabase/config.toml`. Le parsing a
échoué avant l’exécution SQL. Ce n’était pas une erreur de mot de passe, de
certificat ou de migration. Il n’y avait aucune raison de changer les secrets,
de désactiver TLS ou de réparer l’historique.

### 5. La migration était volontairement protégée par le mode manual

0047 est classée `manual`. Les runs automatiques sans `approve_manual`
refusent un tel plan lorsqu’il est en attente : cette protection est attendue.
Une CI verte n’autorise donc pas à elle seule l’application automatique.

Malik a d’abord demandé de ne rien appliquer faute de sauvegarde. Il a ensuite
confirmé être seul à tester, l’absence de sauvegarde sur son forfait gratuit,
et accepté explicitement le risque de perte des données actuelles. Enfin, il
a demandé d’effectuer les étapes proposées. Nous n’avons pas redemandé cette
permission déjà donnée ; elle concernait uniquement l’application ciblée de 0047.

## Correction finale de l’outil

Commit **`5832b5d5584f62d915e6724afbdd323a0bccc5a5`**.

Dans `scripts/supabase-deploy.mjs`, `db push` utilise désormais `--workdir` avec
un dossier temporaire contenant une configuration minimale compatible et les
copies exactes des SQL déjà contrôlés. Le CLI 2.39.2 et la configuration locale
du dépôt sont conservés. Le dossier temporaire et le certificat temporaire
sont nettoyés après succès ou échec. Cible explicite, TLS vérifié, contrôle de
baseline/historique et validation manual restent obligatoires.

La compatibilité a été testée avec le binaire officiel 2.39.2, après vérification
de son checksum officiel : erreur reproduite avec la configuration du dépôt,
configuration acceptée dans le dossier temporaire, puis refus attendu sur une
connexion locale factice. Aucun SQL réel dans cet essai.

Après le CLI, une nouvelle connexion lit l’historique et vérifie :

- toutes les versions attendues enregistrées, dont `0047` ;
- table `public.hourglass_spends` présente ;
- RPC `public.use_hourglass(uuid)` présent ;
- trigger `guard_hourglass_spends` actif sur `public.saves`.

Le workflow ne peut plus annoncer la réussite si ces vérifications échouent.
Le contrôle s’applique aussi si la base est déjà à jour. Tests de l’outil :
**24/24 réussis**, avec copie exacte, nettoyage et rejet des versions/objets
manquants ; politique, syntaxe, ESLint ciblé et diff-check réussis.

## Preuves finales

| Contrôle sur le code 5832b5d | Résultat |
|---|---|
| [CI 38140313000](https://github.com/GoodFight37/CreatorDeck/actions/runs/38140313000) | success, quatre jobs verts |
| [Dry-run 38140323824](https://github.com/GoodFight37/CreatorDeck/actions/runs/38140323824) | success avant application |
| [Application 38140515537](https://github.com/GoodFight37/CreatorDeck/actions/runs/38140515537) | success, application et contrôles post-CLI exécutés |
| [Contrôle final 38140562490](https://github.com/GoodFight37/CreatorDeck/actions/runs/38140562490) | success, lecture seule après application |

Les preuves serveur reposent sur les résultats/étapes GitHub et les contrôles
obligatoires du script exact publié ; les logs détaillés restent bloqués au
proxy. Le statut GitHub Vercel de 5832b5d était success, mais la version réellement
servie et le comportement sur téléphone n’ont pas été inspectés.

La passation de fin d’application est publiée dans **`b30892b`**. Le présent
rapport est une livraison documentaire ultérieure, sans nouvelle application.
Les docs communes sont `docs/agent-handoff.md`, `roadmap.md`, `known-issues.md`,
`decisions.md`, `mises-a-jour-automatiques.md` et `cloud-supabase.md`.

## Ce qui n’a pas été changé

0047 et les migrations 0001–0046 n’ont pas été modifiées pendant cette reprise.
Aucun reset, repair, include-all ou rejeu historique. Aucun secret/variable
persistant modifié, aucune valeur secrète extraite. Aucun déploiement Vercel
manuel, APK ou fonction Edge. Les pushes ont pu lancer les automatisations
habituelles du dépôt ; les publications de code et les runs nécessaires ont
été faits après l’autorisation élargie de Malik, pas pendant l’étape réseau seule.

La relecture de 0047 confirme : aucune suppression, remise à zéro ou modification
des lignes existantes à l’installation. Elle ajoute table/fonctions/trigger/droits.
Le DROP TRIGGER ne remplace que son propre trigger ; ON DELETE CASCADE ne nettoie
le registre que lors d’une suppression ultérieure de la réserve. Le débit et
la recharge se produisent uniquement lors d’un appel à `use_hourglass`.

## Ce que l’autre chat doit faire maintenant

1. Lire AGENTS et le checkpoint courant sur **main GitHub**, vérifier le HEAD
   actuel avant de travailler. Ne pas reprendre un ancien SHA de ce rapport.
2. Considérer **0047 appliquée et vérifiée**, avec les preuves ci-dessus.
3. Recueillir le test de Malik sur téléphone : réserve non pleine, solde positif,
   utiliser 1 sablier → débit de 1 et avance de recharge de 15 minutes ; recharger
   le jeu, vérifier la conservation puis ouvrir un booster quand il est disponible.
   Aucun test téléphone réel ne doit être annoncé réussi avant son retour.
4. Laisser **K-031** séparé : le helper historique `_pack_refresh` a un défaut
   de report du temps ; il n’a pas été corrigé globalement ici. 0047 utilise son
   propre helper correct. Les gains de sabliers restent calculés localement ;
   leur origine n’est pas intégralement certifiée par le serveur.

Il n’est pas nécessaire de recréer l’environnement, modifier les secrets,
réinitialiser la base ou réappliquer les anciennes migrations pour reprendre.
