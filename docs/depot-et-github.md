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
  Supabase (`0001` → `0021`, dans l'ordre) se collent dans le SQL Editor.
- La **PR #7** suit cette branche et sert de journal : elle reste ouverte
  jusqu'à la fin du chantier — on ne la fusionne pas au milieu.
- Une branche `arena/…` par session : `arena/01a10c2b`, `arena/01a10c54`,
  `arena/01a10c75`. Pendant qu'une session écrit, pas d'autre push, merge ni
  réécriture en parallèle (même règle que « Un seul écrivain à la fois »).
- Les branches d'essai (`claude/…`) ne sont **jamais fusionnées** : elles se
  relisent avant toute conclusion.

## État au 7 octobre 2026

- **Le jeu est en ligne.** L'APK distribué (workflow *APK Android (debug)*) est
  compilé **avec** le cloud : les boosters sont tirés par le serveur
  (`open_pack()`), les comptes, les échanges, l'hôtel, les classements et
  l'Arène passent par Supabase. Le mode **sans cloud** (build sans les deux
  variables publiques) n'existe que pour le développement et les tests : c'est
  le seul cas où le moteur de l'appareil tire les cartes. Ne pas décrire le jeu
  comme « hors ligne » ou « sans compte » sans cette nuance — c'était vrai avant
  le chantier online, ça ne l'est plus.
- Migrations Supabase collées par le joueur, dans l'ordre : `0003`, `0011` →
  `0028` (les points sont passés au serveur : `0027` pour la caisse, `0028` pour
  la grille des familles et leurs paliers, générée depuis le jeu). Les dernières ferment des trous d'intégrité : `0019` (la sauvegarde, la
  réserve de boosters et les raretés déclarées ne s'écrivent plus depuis le
  client), `0020` (un pseudo = un joueur), `0021` (registre de provenance : une
  Légendaire ou une variante Live/Holo/Gold doit venir du serveur), `0023` (les
  notifications de direct), `0024` (l'état de l'interrupteur se relit). La
  bascule de `0021` a inscrit 40 lignes pour toutes les collections existantes —
  personne ne perd son rang.
- Le vérifieur `npm run supabase:verify` joue `0001` → `0028` sur un Postgres
  jetable : 395 contrôles. Il pose les droits de table comme Supabase
  (`alter default privileges` **avant** les migrations), sinon il redonnerait à
  `authenticated` ce que les migrations retirent et trois contrôles passeraient
  pour de mauvaises raisons.

## Comment l'APK arrive sur le téléphone

Le workflow **APK Android (debug)** construit à chaque poussée de **code** (les
poussées qui ne touchent que la documentation ne construisent rien : l'APK
précédent reste valable). Il fait les contrôles d'abord (`lint`, `typecheck`,
`test`, catalogue), puis :

1. **il envoie un mail** avec le lien d'installation — Firebase App Distribution,
   groupe `testers` — c'est la voie du téléphone : on ouvre le mail, on touche le
   lien, l'APK s'installe par-dessus l'ancien ;
2. il met à jour la **pré-release roulante**, dont le lien public est stable et
   ne demande aucune connexion :
   `https://github.com/GoodFight37/CreatorDeck/releases/download/debug-apk/creatordeck-debug.apk` ;
3. il dépose l'**artefact** du run (`creatordeck-debug-apk`), pour un
   téléchargement depuis GitHub — mais il faut y être connecté.

Deux réglages, une seule fois, pour la voie n° 1 (console Firebase du projet
`creatordeck-6a9ce`) :

* **App Distribution → Testers & groups** : créer le groupe `testers` (ce nom
  exact, le workflow l'écrit) et y ajouter l'adresse du joueur. C'est ce groupe
  qui reçoit le mail — sans lui, l'étape échoue en `404` ;
* **le secret de dépôt `FIREBASE_SERVICE_ACCOUNT`** (Settings → Secrets and
  variables → Actions → New repository secret) : le JSON du compte de service
  Firebase, celui-là même qui sert de `FCM_SERVICE_ACCOUNT` à Supabase. Il doit
  porter le rôle *Firebase App Distribution Admin*.

Le workflow annule le build précédent si une nouvelle poussée arrive
(`concurrency`) : seul le dernier APK compte, et deux builds ne peuvent pas
écraser la pré-release en même temps.

## Un seul écrivain à la fois

Pendant qu'une session Arena travaille sur le dépôt, pas d'autre push, merge
ni réécriture en parallèle. C'est la seule règle : elle évite les conflits
de force-push et les pertes de travail.

### Le travail d'un autre outil : une branche d'essai (7 octobre 2026)

Un autre outil peut modifier le dossier sans connaître cette règle : il écrit
dans les fichiers, sans branche à lui, et ces modifications se retrouveraient
mêlées à la branche de travail — le `git pull` suivant se cognerait à elles. D'où
**deux commandes** :

1. **`npm run essai:start`**, avant de lancer l'outil : le dossier passe sur une
   branche `essai/<date>-<heure>`, et la branche de travail est notée pour le
   retour. Tout ce que l'outil écrit (et commite, s'il le fait) atterrit là ;
2. **`npm run essai:push`**, quand il a fini :
   * il range tout (fichiers neufs compris) et **refuse** de committer une vraie
     clé secrète (`sb_secret_…` avec sa valeur, jeton complet, clé privée) — les
     docs qui *citent* ces motifs en toutes lettres ne le déclenchent pas ;
   * si l'outil a commité **lui-même** sur la branche de travail, il **déplace**
     ces commits sur la branche d'essai (créée au même endroit, poussée), puis
     remet la branche de travail exactement sur le dépôt distant : le dossier
     redevient celui de tout le monde ;
   * il **revient** sur la branche de travail, donc les `git pull` continuent
     d'arriver.

`essai:push` fonctionne aussi sans `essai:start` (il crée la branche d'essai au
moment du rangement). Deux rattrapages lui ont été appris après un vrai incident :

* **GitHub refuse l'envoi** (« Internal Server Error ») : le commit reste rangé
  dans la branche locale, et **relancer la même commande** finit le travail —
  c'est le seul cas où « rien à pousser » serait faux, il est testé ;
* **la note de retour manque** (essai ouvert par une version précédente de
  l'outil) : la branche de travail est retrouvée sur GitHub — la branche distante
  dont le sommet est exactement le commit d'où l'essai est parti. Une seule
  candidate, sinon rien n'est deviné et la commande à taper est affichée.

Ce qui n'est pas touché : jamais de `--force`, jamais de suppression de branche,
jamais de fusion. Une branche d'essai **se relit** — c'est le seul moyen de
savoir si ce qu'un autre outil a proposé mérite d'entrer dans le jeu.

Le workflow APK ne construit que `main` et la branche de travail
(`.github/workflows/android-apk.yml`, `on.push.branches`) : pousser un essai
**ne remplace pas** l'APK installé sur le téléphone.

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
