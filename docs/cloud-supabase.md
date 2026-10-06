# Compte, sauvegarde cloud, profil public, classements et échanges (Supabase)

CreatorDeck est jouable **sans aucun serveur** : la partie vit dans le
`localStorage` de l'appareil et le catalogue est embarqué dans l'APK. Le cloud
ajoute cinq choses, et rien de plus :

1. **un compte** (invité par défaut, ou adresse e-mail + code à 6 chiffres en
   option — pas de mot de passe) ;
2. **une sauvegarde cloud** de la partie, pour retrouver sa collection sur un
   autre appareil ;
3. **une vitrine publique** de quatre cartes épinglées sur le profil ;
4. **un classement mondial** calculé par le serveur ;
5. **le tirage des boosters** décidé par le serveur (les cartes sont
   infalsifiables, prérequis des échanges) ;
6. **les échanges de cartes** entre joueurs, tranchés par le serveur (les deux
   collections changent ensemble, ou aucune des deux).

Tout le reste continue de fonctionner hors ligne, y compris si le projet
Supabase n'existe pas encore : dans ce cas l'écran de compte affiche simplement
« cloud non configuré » et la réserve de boosters reste locale. Dans un build
**avec** cloud, la seule action qui exige une connexion est l'ouverture d'un
booster (son contenu est décidé par le serveur) : la collection, l'Atelier et
les saisons restent jouables hors ligne.

---

## 1. Ce qui monte dans le cloud, et ce qui n'y monte pas

| Donnée | Où elle vit | Détail |
| --- | --- | --- |
| Catalogue (créateurs, raretés, taux) | **Dans l'APK** | fichiers JSON générés à la compilation, jamais envoyés |
| Partie (cartes, points, paliers, thème) | **Local d'abord** | copie envoyée au cloud seulement si tu te connectes |
| Adresse e-mail | Cloud | sert uniquement à te renvoyer ton code |
| Statistiques (cartes uniques, légendaires…) | Cloud | recalculées **par le serveur** depuis ta sauvegarde, visibles dans le classement |
| Vitrine (4 cartes épinglées) | Cloud | 4 slugs au maximum, contrôlés par le serveur ; affichés sur le profil public |
| Contenu des boosters | **Serveur** | le tirage est décidé par la fonction `open_pack()` ; le client ne peut pas choisir ni inventer les cartes |
| Réserve de boosters | **Serveur** | `pack_status()` à la connexion ; le client adopte le compteur et l'ancre de recharge, sans rien consommer |
| Cartes possédées, en lignes | **Serveur** | table `user_cards` : une **projection** de ta sauvegarde, recalculée à chaque écriture. Aucune politique RLS : aucun client ne la lit, seules les fonctions du serveur la consultent |
| Complétion, rangs, variantes d'une collection | **Serveur** | calculés par `player_profile()` et `leaderboard()` ; un joueur ne voit des autres que des compteurs et la vitrine |
| Échanges (offres en attente, historique) | Cloud | table `trades` : lecture réservée aux deux joueurs concernés, écriture par les fonctions du serveur uniquement |
| Cartes données et reçues | **Serveur** | déplacées par `respond_trade()` dans la même transaction ; l'appareil applique ensuite le même mouvement pour rester d'accord |

Aucun mot de passe n'est stocké. Les données restent locales tant que tu ne
crées pas de compte invité ou ne valides pas ton code ; « Déconnexion » efface
la session de l'appareil.

## 2. Trois façons d'avoir un compte

**Tu n'as pas besoin du Magic Link.** L'e-mail est une méthode parmi d'autres :
ce qui compte pour le cloud, c'est un identifiant `user_id`. Il y en a trois, et
la deuxième est celle qu'il faut connaître — elle **ne demande aucun e-mail** :

| | Compte invité | Invité **+ adresse et mot de passe** | Adresse e-mail + code |
| --- | --- | --- | --- |
| Ce qu'il faut activer | **Anonymous sign-ins** | Anonymous sign-ins + **Confirm email désactivé** | un **SMTP** configuré |
| Ce qu'il faut posséder | rien | rien | un domaine ou un compte d'envoi gratuit |
| Mise en route | immédiate | immédiate | 10 minutes de configuration |
| Récupérable sur un autre appareil | non | **oui, par mot de passe** | oui, par code reçu par e-mail |
| Si le mot de passe est perdu | — | compte perdu (pas de « mot de passe oublié » sans SMTP) | — |

Pourquoi Supabase réclame un SMTP pour le code à 6 chiffres : son service
d'e-mail intégré est **réservé aux tests** (quelques envois par heure, et il
n'écrit qu'aux adresses de l'équipe du projet). Dès qu'on veut envoyer un code à
quelqu'un d'autre, il faut brancher son propre serveur d'envoi. **Le mot de
passe, lui, n'envoie aucun e-mail** : c'est la voie de secours sans
configuration.

### Compte invité (recommandé pour commencer)

1. Dashboard → **Authentication → Sign In / Providers** → active
   **Anonymous sign-ins** → Save.
2. Dans l'app : Profil → **Sauvegarde cloud** → **Créer un compte invité**.
3. Donne-toi un nom (il apparaît au classement), puis **Envoyer ma collection**.

Rien à installer, rien à payer, aucun e-mail. À savoir : le compte vit avec la
session enregistrée sur l'appareil. Réinstaller l'app ou vider ses données perd
l'accès au compte (la collection locale, elle, est sauvegardée par le mécanisme
habituel d'export/import).

### Garder un compte invité : adresse + mot de passe (sans SMTP)

C'est ce qu'il faut faire dès qu'un joueur tient à sa collection, et **avant**
de mettre l'app sur un second appareil.

1. Dashboard → **Authentication → Sign In / Providers → Email** : laisse le
   fournisseur **Email activé**, mais **désactive « Confirm email »** → Save.
   C'est ce réglage qui rend l'opération possible sans envoyer un seul e-mail.
2. Dans l'app (compte invité connecté) : Profil → **Garder ce compte** →
   adresse e-mail + mot de passe (8 caractères minimum) → **Attacher l'adresse**.
3. Sur l'autre appareil : Profil → **Se connecter avec un e-mail et un mot de
   passe** → puis **Charger le cloud** (ou rien à faire : une partie locale
   vierge est reprise automatiquement, voir plus bas).

Ce que fait l'app : un seul appel, `PUT /auth/v1/user` avec l'adresse **et** le
mot de passe, avec le jeton du joueur. Aucun mot de passe ne transite en clair
ailleurs qu'ici, et il est haché par Supabase. La reconnexion se fait par
`POST /auth/v1/token?grant_type=password` — donc **aucun e-mail n'est jamais
envoyé**, ni à l'attachement ni à la connexion.

Deux limites, à dire au joueur :

* **Il n'y a pas de « mot de passe oublié ».** Sans SMTP, un mot de passe perdu
  ne se récupère pas : l'écran le rappelle au moment du choix.
* **L'adresse n'est pas vérifiée** (c'est le prix de « pas d'e-mail envoyé »).
  C'est le mot de passe qui protège le compte, pas l'adresse.

> **Bug Supabase à connaître** (`supabase/auth#2847`) : attacher une adresse à un
> compte **invité** échoue (erreur `Email address "" is invalid`) tant que
> **« Confirm email » est activé** — GoTrue valide une adresse vide faute de
> savoir laquelle confirmer. L'app traduit ce cas en clair : elle nomme le
> réglage à désactiver, au lieu d'afficher « adresse refusée ». Pour un compte
> qui a déjà une adresse, l'ajout d'un mot de passe marche dans les deux réglages.

### Garder un compte invité : adresse seule + code (SMTP requis)

Variante du chemin précédent, quand un SMTP est configuré (§ *Adresse e-mail +
code*) : le joueur n'a aucun mot de passe à choisir, et retrouve sa collection
par un code reçu par e-mail.

1. Branche le SMTP **et** les deux modèles qui portent un jeton : *Magic Link*
   (connexion) **et** *Change email address* (changement d'adresse). Les deux
   doivent contenir `{{ .Token }}`.
2. Dans l'app (compte invité connecté) : Profil → **Garder ce compte** →
   adresse e-mail → **Attacher l'adresse**. Le mot de passe est **facultatif**
   sur ce chemin.
3. L'app affiche **« Code reçu »** : saisis les 6 chiffres arrivés par e-mail →
   **Confirmer l'adresse**. Rien reçu ? **Renvoyer le code** (un envoi par
   minute), puis regarde les indésirables.
4. Sur l'autre appareil : **Recevoir un code par e-mail** → **Charger le cloud**.

Ce qui se passe côté serveur : `PUT /auth/v1/user` avec la seule adresse ne
l'applique **pas** tout de suite — Supabase la renvoie dans `new_email` et
envoie un code à cette nouvelle adresse. L'app garde l'adresse « en attente »
(rappelée dans l'écran Compte) et la valide par `POST /auth/v1/verify` avec
`type` = `email_change` : la session porte alors la nouvelle adresse, sans
déconnexion et sans perdre la collection. C'est la raison d'être du champ
**Code reçu** : il n'y a pas de page web pour recevoir un lien de confirmation.

Sans SMTP, ce chemin s'arrête à l'adresse en attente : l'app affiche alors la
marche à suivre (ajouter un mot de passe, qui n'envoie rien, ou désactiver
« Confirm email » pour enregistrer l'adresse tout de suite).

**Nouveau téléphone, partie locale vierge** : à la connexion (mot de passe ou
code), si cette partie n'a **ni carte ni ouverture**, l'app charge d'elle-même
la collection du cloud — il n'y a rien à perdre, et cela évite qu'un premier
envoi écrase la collection. Dès que la partie locale a servi, rien n'est
remplacé sans que le joueur le demande (« Charger le cloud »).

### Adresse e-mail + code (optionnel)

1. **Authentication → Emails → SMTP Settings** : branche un service d'envoi.
   Deux options gratuites qui ne demandent aucun domaine :
   * **Brevo** — vérifie une simple adresse d'expéditeur, 300 e-mails/jour ;
   * **Resend** — en mode test, envoie depuis `onboarding@resend.dev` vers
     l'adresse du propriétaire du compte (parfait pour tester).
2. **Authentication → Email Templates → Magic Link** : le modèle doit contenir
   le jeton, sinon le code reçu est un lien inutilisable :

   ```html
   <p>Ton code CreatorDeck : <strong>{{ .Token }}</strong></p>
   ```

3. Vérifie **Email OTP Length = 6** et **Email OTP Expiration** (1 heure par
   défaut convient).

## 3. Créer le projet (5 minutes)

1. Compte sur [supabase.com](https://supabase.com) → **New project**.
   Choisis une région européenne (`eu-west-3` / Paris ou `eu-central-1` /
   Francfort) : c'est là que vivront la sauvegarde et le classement.
   Le palier gratuit suffit largement (500 Mo de base, 50 000 utilisateurs
   actifs par mois).
2. **SQL Editor** → *New query* → colle tout le contenu de
   [`supabase/migrations/0001_comptes_cloud.sql`](../supabase/migrations/0001_comptes_cloud.sql)
   → **Run**. La requête crée les tables, les politiques RLS, les déclencheurs
   et les fonctions d'envoi / lecture / classement. Exécute-la en premier, puis
   ouvre une nouvelle requête pour chacune des migrations suivantes, dans
   l'ordre :
   - [`supabase/migrations/0002_vitrine.sql`](../supabase/migrations/0002_vitrine.sql)
     → **Run** pour activer la vitrine et le contrôle de possession.
   - [`supabase/migrations/0003_catalogue.sql`](../supabase/migrations/0003_catalogue.sql)
     → **Run** pour peupler la table des créateurs (utilisée par le tirage
     serveur) et la passer en lecture seule pour les clients (RLS activée).
     **Fichier généré** par `scripts/build-supabase-catalogue.mjs` depuis
     `src/data/creators.json` : ne pas modifier à la main.
   - [`supabase/migrations/0004_tirage.sql`](../supabase/migrations/0004_tirage.sql)
     → **Run** pour activer le tirage des boosters côté serveur (`open_pack()`
     et `pack_status()`).
   - [`supabase/migrations/0005_echanges.sql`](../supabase/migrations/0005_echanges.sql)
     → **Run** pour activer les échanges de cartes (`create_trade()`,
     `respond_trade()`, `cancel_trade()`, `list_trades()`, `search_players()`,
     `player_variants()`).
   - [`supabase/migrations/0006_profil_public.sql`](../supabase/migrations/0006_profil_public.sql)
     → **Run** pour activer le profil public et les classements enrichis
     (`player_profile()`, projection `user_cards`, complétion, compteurs Gold et
     Holo, tri Gold). Il recalcule les statistiques de tous les joueurs déjà en
     ligne : c'est normal qu'il travaille quelques secondes.

> **Avant de coller une migration qui touche au tirage**, on peut la jouer sur
> un Postgres jetable, en local, sans toucher au projet Supabase :
>
> ```powershell
> npm install --no-save embedded-postgres pg
> npm run supabase:verify
> ```
>
> Le script exécute **les six migrations** (`0001` à `0006`) pour de vrai, dans
> un Postgres jetable, puis contrôle : le catalogue (1000 créateurs), les
> cartes (aucun doublon, une variante « live » garantie), la recharge, la
> reprise de l'état local, la distribution du slot garanti (82 / 15 / 3 de
> `pull-rates.json` — 400 boosters) et **les échanges joués de bout en bout**
> avec trois joueurs : recherche, offre, refus, annulation, acceptation
> atomique, carte disparue entre-temps, droits et lecture par un tiers — plus
> le profil public (projection, complétion, rangs, tri Gold) sur trois autres
> joueurs, dont un dont la sauvegarde est invraisemblable. Les
> deux dépendances ne sont **pas** enregistrées dans `package.json` : elles ne
> servent qu'à cette vérification et n'entrent ni dans l'APK ni dans la CI.
3. **Authentication → Sign In / Providers** : active **Anonymous sign-ins**
   pour la voie invitée. Garde **Email** activé si tu veux aussi proposer
   l'adresse + code ; « Confirm email » reste au choix (le code à 6 chiffres
   confirme l'adresse à lui seul).
4. **Authentication → Email Templates → Magic Link** : le modèle doit contenir
   le jeton, sinon le code reçu est un lien et l'application ne peut rien en
   faire. Ajoute par exemple :

   ```html
   <p>Ton code CreatorDeck : <strong>{{ .Token }}</strong></p>
   ```

   Pense aussi à **Email OTP Expiration** (1 heure par défaut, très bien) et à
   **Email OTP Length** = 6.
5. **Settings → API** : note l'**URL du projet** et la clé **anon public**
   (ou la clé **publishable** `sb_publishable_…`, qui la remplace dans les
   nouveaux projets). Prends bien l'« URL du projet » — `https://<référence>.supabase.co` —
   et non l'URL REST : un suffixe `/rest/v1/` est toléré (l'app le retire), mais
   l'adresse nue évite toute confusion.

> La clé `anon` est prévue pour être embarquée dans une application : ce sont
> les politiques RLS qui protègent les données. La clé `service_role`, elle, ne
> doit **jamais** apparaître dans l'app ni dans ce dépôt — elle contourne
> toutes les règles.

## 4. Compiler avec le cloud (sur ta machine, PowerShell)

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

(`.env` fonctionne aussi — Next lit les deux, `.env.local` l'emporte. Ce fichier
est ignoré par Git : il ne part jamais dans le dépôt.)

Renseigne les deux lignes, puis :

```powershell
npm run build
npx serve out
```

`NEXT_PUBLIC_*` est **inliné à la compilation** : après un changement de clé, il
faut relancer `npm run build` (et refaire l'APK), pas seulement recharger la
page.

## 5. Compiler l'APK avec le cloud (GitHub Actions)

Le workflow lit deux **variables de dépôt** (pas des secrets : la clé anon est
publique par conception) :

1. GitHub → **Settings → Secrets and variables → Actions → onglet Variables**
   → *New repository variable* ;
2. `NEXT_PUBLIC_SUPABASE_URL` = `https://xxxxxxxx.supabase.co` ;
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la clé anon ;
4. relance le workflow **APK Android (debug)** en choisissant `main` dans
   « Use workflow from » (ou la branche de la PR si tu testes avant sa fusion).

Sans ces variables, l'APK se construit quand même : il est simplement 100 %
hors ligne, avec l'écran de compte qui explique que le cloud n'est pas
configuré.

## 6. Vérifier que tout fonctionne

1. Ouvre l'app → **Profil → Sauvegarde cloud** ;
2. **Créer un compte invité** (ou, si tu as configuré un SMTP : adresse →
   **Recevoir un code** → recopie le code → **Valider le code**) ;
3. donne-toi un **nom** (2 à 24 caractères), puis **Envoyer ma collection** ;
4. ouvre **Classement mondial** : tu dois y apparaître — les statistiques sont
   recalculées par le serveur, jamais envoyées par le téléphone ;
5. dans **Ma vitrine**, épingle jusqu'à quatre créateurs possédés et enregistre ;
   touche une ligne du classement pour ouvrir le profil public, avec sa vitrine
   et ses chiffres.

6. dans **Garder ce compte** (si tu es en invité), attache une adresse et un mot
   de passe, puis déconnecte-toi et reconnecte-toi par **« Se connecter avec un
   e-mail et un mot de passe »** : ta collection doit être reprise ;
7. dans **Échanges**, cherche un autre joueur par son pseudo (le classement en
   fournit), choisis une de tes cartes puis une carte qu'il possède, et
   **Proposer l'échange** ; avec un second compte, accepte l'offre : les deux
   collections bougent, et le message confirme le troc.

Ensuite, l'envoi est automatique une vingtaine de secondes après ta dernière
action, et la ligne du profil indique l'état (« à envoyer », coche verte).

## 7. Comment les conflits sont traités

Deux appareils peuvent jouer la même collection. La règle est volontairement
prudente :

* **le contenu identique** → rien à faire ;
* **un côté nettement plus récent** (plus de 30 s d'écart) → l'app propose
  d'envoyer ou de charger, jamais les deux ;
* **les deux ont bougé** → l'app ne tranche pas : « Charger le cloud » adopte
  la version du serveur, « Envoyer ma collection » écrase celle du cloud.

Aucune fusion automatique : mélanger deux progressions produirait une
collection impossible à défendre côté serveur.

## 8. Ce que le serveur vérifie (et ce qu'il ne vérifie pas)

`push_save()` recalcule lui-même les statistiques à partir de la sauvegarde et
**refuse** ce qu'aucune partie réelle ne peut produire : carte sans créateur,
rareté ou variante inconnue, plus de créateurs que le catalogue, compteurs
négatifs. Seules les collections cohérentes sont classées.

La migration `0002_vitrine.sql` ajoute `set_showcase(p_slugs)`. Le serveur
normalise les slugs, refuse plus de quatre cartes et les noms de créateur au
format invalide, puis vérifie que chaque créateur figure dans `cards` de la
sauvegarde cloud de l'utilisateur connecté. Une carte encore uniquement sur
l'appareil doit d'abord être envoyée. L'écriture directe de `showcase_slugs`
est révoquée par privilège de colonne : le client ne peut modifier directement
que `display_name` (et son horodatage), la vitrine passe par cette fonction.

Depuis la migration `0004_tirage.sql`, le **contenu des boosters est décidé
par le serveur** : la fonction `open_pack()` tire les 5 cartes avec le même
algorithme que le moteur local (mêmes poids, mêmes variantes, même événement
« Perfect »), et le client ne peut ni les choisir ni les inventer. Une
sauvegarde fabriquée à la main peut encore mentir sur les points, l'XP ou le
niveau (calculés localement), mais plus sur les cartes — c'est le prérequis
des échanges.

Depuis la migration `0006_profil_public.sql`, les compteurs qui servent au
**profil public** ne retiennent que les créateurs qui existent au catalogue :
`unique_creators`, `legendary_cards`, `gold_cards`… sont recompilés en croisant
la sauvegarde avec `public.creators`. Sans ce garde-fou, une sauvegarde
inventant 900 slugs fabriquait une complétion de 90 % sans posséder une seule
carte réelle. `total_cards`, lui, reste le compte brut de la sauvegarde.

### Ce que le serveur ne vérifie pas (volontairement)

Les points, l'XP et le niveau restent calculés sur l'appareil : seul le
contenu des boosters (et donc les cartes) est décidé par le serveur. Hors
périmètre actuel : une sauvegarde trafiquée peut encore gonfler les compteurs
de ressources — et, en trichant sur des créateurs **réels**, gonfler sa
complétion. Ce qui n'est pas falsifiable, c'est ce qui passe par le serveur :
le tirage et les échanges.

### Le profil public, calculé par le serveur

Ouvrir le classement puis toucher une ligne affiche la fiche d'un joueur :
vitrine, complétion du catalogue, rang, répartition par rareté, et une affiche
à partager (dessinée sur l'appareil, voir `src/lib/poster.ts`).

Tout vient de `player_profile(p_user_id)` en un appel :

* les chiffres de `public.stats` (recalculés à chaque sauvegarde) ;
* la **complétion** = créateurs uniques / taille du catalogue, calculée côté
  serveur — le client ne fait pas la division ;
* le **rang** = nombre de joueurs vérifiés devant, sur la complétion et sur le
  nombre total de cartes ;
* la **répartition par rareté** (« 12 / 50 légendaires ») : la rareté est relue
  dans `public.creators`, pas dans la sauvegarde ;
* les **quatre cartes épinglées** : les seuls noms de cartes qui sortent d'un
  profil public — jamais la collection.

La lecture se fait par une **projection** : `public.user_cards` reçoit une ligne
par carte possédée, recalculée par le trigger `project_cards()` à chaque
écriture de `saves`. C'est ce qui rend ces questions répondables sans ouvrir
toutes les sauvegardes à chaque requête — et c'est cette table qui portera le
marché entre joueurs. Elle porte une RLS active **sans aucune politique** :
même le joueur dont les cartes y sont ne peut pas la lire directement. La
sauvegarde JSON reste la source de vérité ; la table n'est qu'un index que le
serveur reconstruit tout seul.

Le **lien de partage** est de la forme `…/?profil=<identifiant>`. Une
application sans serveur ne peut pas fabriquer une page par joueur (l'export
statique n'a pas de route dynamique) : c'est donc une adresse unique avec un
paramètre, qui ouvre la fiche. Dans l'APK, où l'app est servie depuis
`https://localhost`, elle n'a de sens que sur place — l'écran le dit, et
propose l'affiche à la place.

### Les échanges sont tranchés par le serveur

Un échange déplace des cartes entre **deux** collections : c'est le seul
endroit où une erreur serait irréparable (une carte volée ou dupliquée). La
logique vit donc entièrement dans `0005_echanges.sql` :

* `public.trades` est en **lecture seule** pour les joueurs : une politique de
  `select` limite chaque offre à ses deux participants, et il n'existe **aucune**
  politique d'insertion, de mise à jour ou de suppression. Tous les changements
  passent par les fonctions `security definer`, qui revérifient tout ;
* **un client ne peut pas écrire dans la sauvegarde d'un autre joueur** : la
  politique de `saves` ne l'autorise que sur la sienne, et `respond_trade()`
  écrit les deux collections dans la même transaction, sous verrou
  (`for update`, dans l'ordre des identifiants pour éviter les interblocages) ;
* le serveur **ne croit pas le client sur la valeur des cartes** : la rareté est
  recopiée depuis `public.creators`, et la variante doit exister au catalogue ;
* l'acceptation vérifie que **chacun possède encore ce qu'il donne**, sur sa
  sauvegarde cloud (jamais sur une liste envoyée par le client). Si une carte a
  disparu entre-temps, l'exception annule tout : personne ne perd rien ;
* les deux sauvegardes réécrites doivent rester valides (`save_problems`) :
  sans ce contrôle, un troc pourrait faire passer un joueur en « collection non
  vérifiée » au classement. Les statistiques sont recalculées par le trigger
  habituel (`refresh_stats`) ;
* un troc **ne touche ni aux points, ni à l'XP, ni au niveau, ni aux
  boosters** : il ne fait que déplacer des cartes. En revanche, une carte
  épinglée qui part en échange **quitte la vitrine publique** (`set_showcase`
  n'aurait jamais accepté de l'y laisser) ; Les cartes reçues portent
  `fromTrade` (numéro de l'échange), ce qui permet au client d'appliquer le
  mouvement **une seule fois** — même si l'appareil recharge sa partie après
  coup ;
* la collection des autres joueurs reste privée. Deux réponses seulement sont
  ouvertes : la **recherche par pseudo** (nom, niveau, nombre de créateurs
  uniques — pas les cartes) et `player_variants()`, qui dit quelles variantes
  un joueur possède **pour un créateur donné**, afin qu'une offre puisse
  aboutir. Jamais la collection entière, jamais les quantités.

Côté app, un échange se joue en deux temps :

| Moment | Ce que fait l'appareil |
| --- | --- |
| Proposer | envoie d'abord la partie locale au cloud (le serveur vérifie cette collection-là) ; si le cloud est plus récent, l'offre est abandonnée avec un message |
| Accepter | envoie aussi la partie locale d'abord, puis applique le mouvement renvoyé par le serveur et pousse le résultat |
| Consulter | `list_trades()` renvoie les offres ; un échange accepté pendant que l'appareil était ailleurs est appliqué automatiquement à la collection locale |

### Le tirage est décidé par le serveur

Depuis la migration `0004_tirage.sql`, ouvrir un booster demande une
connexion. La fonction `open_pack()` tire les 5 cartes avec exactement le même
algorithme que le moteur local (`src/lib/game-engine.ts`) : mêmes poids par
slot (recopiés depuis `src/data/pull-rates.json` avec un commentaire qui pointe
le fichier), même événement « Perfect » (1 ‰), même ordre de révélation — la
carte garantie en **dernier** (aucun mélange, c'est le moment fort de
l'ouverture) —, aucun créateur en double dans un même booster.

Trois situations possibles côté client :

| Situation | Comportement |
| --- | --- |
| Cloud configuré + connecté | ouverture via `open_pack()` ; les cartes sont poussées immédiatement (`sync("push")`) |
| Cloud configuré + hors ligne ou sans compte | message « Connecte-toi pour ouvrir un booster » + raccourci vers l'écran Compte ; **pas de repli silencieux** |
| Cloud non configuré (dev, tests) | tirage local inchangé : le moteur local reste le comportement par défaut |

**Pas de repli silencieux** : si le cloud est configuré et que la connexion
est coupée, on n'ouvre pas « en attendant » côté local. L'écran explique
qu'il faut se connecter, et propose un accès direct à l'écran Compte.

**La réserve aussi vient du serveur.** Dès qu'un compte est connecté, le client
lit `pack_status()` — même calcul de recharge que `open_pack()`, sans rien
consommer — et adopte le compteur et l'ancre (`last_regen_at`) dans la partie
locale : l'affichage et le tirage ne divergent plus si l'horloge de l'appareil
dérive ou si la sauvegarde locale a été bricolée. Le sablier (`spendHourglass`)
ne sait avancer qu'une réserve locale : il est donc désactivé dans les builds
avec cloud (l'écran l'explique), et reste actif dans les builds sans cloud.

**Le catalogue est en lecture seule.** La table `public.creators`
(`0003_catalogue.sql`) a la RLS activée et **aucune politique d'écriture** : ni
le client ni un appel direct à l'API ne peuvent changer une rareté, un nom ou
un rang. Seul le SQL Editor (propriétaire des tables) la modifie — c'est ce qui
garantit que le tirage serveur lit toujours le catalogue publié.

En cas de refus « aucun booster », le client relit aussitôt `pack_status()` :
si un sablier ou une horloge locale avait gonflé la réserve affichée, le
compteur et le compte à rebours se réalignent sur le serveur immédiatement.

### Le direct (statut EN LIVE)

Une carte dont le créateur **streame à cet instant** le dit : pastille « Direct »
sur la carte, bandeau sous le titre de l'accueil (« 12 sur 1000 · @kamet0 4 120 »),
ligne rouge au moment de la révélation, et un filtre « En direct » dans le
classeur. Rien de tout ça n'apparaît si la donnée est vieille de plus de dix
minutes : un badge « en direct » périmé serait un mensonge.

Ce n'est **pas** la variante Live d'une carte. La variante est une matière qu'on
tire au sort ; le direct est un fait qu'on constate. Les deux peuvent cohabiter
sur la même carte.

Pourquoi ça ne peut pas vivre dans l'APK : l'API Helix demande un **client
secret**, et un APK se dézippe. L'appel vit donc dans une **Edge Function**
(`supabase/functions/refresh-live/index.ts`), qui interroge Twitch et publie le
résultat dans une table que tout le monde peut lire. Dix requêtes Helix pour
1 000 créateurs, une fois pour tous les joueurs.

| Élément | Rôle |
| --- | --- |
| `0007_direct.sql` | tables `live_streams` (le cache) et `live_state` (son horodatage) + `live_publish()`, réservée au serveur |
| `supabase/functions/refresh-live` | seul endroit qui connaît le secret Twitch : jeton d'application, `GET /helix/streams` par lots de 100, publication |
| `src/lib/live.ts`, `src/lib/live-store.ts` | lecture de la table (sans compte), cache local daté, règle des dix minutes |
| `src/components/creator-deck-app.tsx` | bandeau d'accueil, filtre du classeur, ligne de révélation |

**Il n'y a pas de tâche planifiée** : c'est l'app qui demande le
rafraîchissement quand elle s'ouvre et que son cache a plus de trois minutes. La
fonction se limite elle-même à **une requête Twitch toutes les 90 secondes**
(c'est `live_state.refreshed_at` qui le dit), donc l'appeler plus souvent ne
coûte rien — c'est ce qui permet de la laisser sans jeton.

**Mise en place (une fois).**

1. Créer une application sur <https://dev.twitch.tv/console/apps> (nom libre,
   *OAuth Redirect URL* : `http://localhost`, catégorie *Application
   integration*). Noter le **Client ID**, générer un **secret**.
2. Supabase → **Edge Functions** → **Secrets** : ajouter
   `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET`.
3. Supabase → **Edge Functions** → *Deploy a new function* → **Via Editor** :
   nom `refresh-live`, coller le contenu de
   `supabase/functions/refresh-live/index.ts`, **désactiver « Verify JWT »**,
   déployer. (La fonction ne publie que des données publiques et se limite
   elle-même ; un jeton n'apporterait rien.)
4. SQL Editor : coller `0007_direct.sql`, puis **re-coller `0003_catalogue.sql`**
   (il apporte la colonne `login`, la clé qui relie une diffusion à sa carte).
5. Ouvrir l'app : le premier affichage déclenche le rafraîchissement. Pour
   forcer un rafraîchissement tout de suite, ouvrir l'URL de la fonction avec
   `?force=1` (l'app, elle, ne le fait jamais).

En cas de doute, `POST /functions/v1/refresh-live` répond en JSON :
`{"skipped":true,"age_ms":…}` (trop récent), `{"ok":true,"checked":1000,
"live":12,…}` (publié), ou `{"error":…}` (secret manquant, catalogue vide,
refus de Twitch).

## 9. Suite : notifications

**Fait :** **statut EN LIVE** (le direct réel, alimenté par Helix côté serveur —
voir §8) ; vitrine de quatre cartes ; **profil public complet** et classements
enrichis (`0006_profil_public.sql` : projection `user_cards`, complétion, rangs,
Gold et Holo, affiche de partage) ; tirage des boosters côté serveur
(`0004_tirage.sql`, les cartes sont infalsifiables) ; échanges de cartes
arbitrés par le serveur (`0005_echanges.sql`, une carte contre une carte
jusqu'à cinq de chaque côté) ; compte gardable par adresse + mot de passe,
**sans SMTP**.

**Reste à faire, dans cet ordre :**

* notifications push Capacitor (`@capacitor/push-notifications` + FCM), à
  brancher quand elles auront un usage produit — c'est ce qui rendra les offres
  d'échange visibles sans ouvrir l'écran Compte ;
* **complétion par famille de langue ou par saison** : la table `creators` ne
  stocke pas encore la famille de langue (elle est dans `src/data/creators.json`)
  — il faudra l'ajouter à la migration générée `0003_catalogue.sql` ;
* **marché entre joueurs** : la projection `user_cards` est prête, les règles
  (prix en points, anti-duplication, expiration) restent à écrire ;
* **connexion Twitch (OAuth)** : le même client Twitch qui alimente le direct
  peut servir d'identité de joueur (plus rien à retenir, plus de mot de passe à
  perdre) — à faire quand le parc de comptes le justifiera ;
* idées non engagées : échanges avec plusieurs partenaires à la fois,
  historique complet des échanges, recherche de joueur par slug de créateur,
  temps réel sur les offres (aujourd'hui : rafraîchissement manuel), marché
  entre joueurs (la projection `user_cards` est prête).

## 10. Dépannage

| Symptôme | Cause probable |
| --- | --- |
| « Cloud non configuré » alors que `.env.local` existe | `npm run build` n'a pas été relancé (variables inlinées à la compilation) |
| « Code incorrect ou expiré » à chaque essai | modèle *Magic Link* sans `{{ .Token }}`, ou code d'un précédent envoi |
| « Trop de tentatives » | limite d'envoi d'e-mails de Supabase (1 par minute) : attends |
| « Session expirée : reconnecte-toi » | jeton révoqué ou projet migré : redemande un code |
| « Réseau injoignable » | hors ligne : la partie locale continue, l'envoi reprendra |
| « Réseau injoignable » **dans l'APK** alors que le même appel marche dans Chrome | le WebView sert l'app depuis `https://localhost`, origine que Supabase peut refuser en CORS. Les appels passent par le client HTTP natif (`src/lib/cloud/transport.ts`, `CapacitorHttp`) depuis la PR #7 : si le message persiste, il nomme désormais l'hôte, le chemin et la cause — colle-les dans le ticket |
| « Les échanges ne sont pas installés sur ce projet » | `0005_echanges.sql` n'a pas été collé : § 3 |
| « Le profil public n'est pas installé sur ce projet » | `0006_profil_public.sql` n'a pas été collé : § 3 |
| Le classement affiche « 0 % » ou pas de rang | le joueur n'a jamais envoyé sa collection, ou sa sauvegarde a été jugée invraisemblable (« collection en cours de vérification ») |
| Une carte présente dans la sauvegarde n'apparaît pas dans la complétion | son créateur n'existe pas au catalogue, ou sa rareté ne correspond pas : le serveur ne compte que ce qui existe vraiment |
| « Supabase refuse d'attacher une adresse à un compte invité tant que Confirm email… » | bug GoTrue connu : désactive **Confirm email** (Authentication → Sign In / Providers → Email) puis réessaie |
| L'app demande un « Code reçu » après avoir attaché l'adresse | normal avec « Confirm email » + SMTP : saisis les 6 chiffres, ou désactive le réglage pour enregistrer l'adresse sans confirmation |
| Attachement refusé : « Supabase n'a pas pu envoyer l'e-mail » | pas de SMTP configuré : ajoute un mot de passe (aucun envoi) ou branche un SMTP, § 2 |
| Le code reçu est un lien, pas 6 chiffres | modèle *Magic Link* ou *Change email address* sans `{{ .Token }}` : corrige le modèle, puis **Renvoyer le code** |
| « E-mail ou mot de passe incorrect » | mot de passe saisi différemment, ou compte créé par code (sans mot de passe) : attache-en un depuis l'appareil d'origine |
| « Cette adresse est déjà utilisée par un autre compte » | cette adresse appartient à un autre compte : connecte-toi avec elle, ou change d'adresse |
| « Cette adresse n'est pas confirmée » | **Confirm email** est activé et l'adresse n'a jamais été confirmée : désactive le réglage, ou confirme l'adresse |
| « echange : tu ne possèdes plus … » | la carte donnée a été recyclée ou échangée depuis l'offre : annule l'offre et recommence |
| « Synchronise d'abord ta collection » (échange) | la partie locale et le cloud ont divergé : **Synchroniser** puis recommence (le serveur écrit toujours dans la collection du cloud) |
| Aucun badge « Direct » n'apparaît | table `0007` non collée, `0003` non recollée (colonne `login`), secrets Twitch absents, ou fonction `refresh-live` non déployée — l'appel à la fonction répond alors le détail |
| Un échange accepté n'apparaît pas tout de suite | l'appareil du proposeur s'aligne sur `list_trades()` : **Actualiser mes offres**, ou rouvre l'écran Compte |
| « Le tirage serveur n'est pas installé sur ce projet » | `0003_catalogue.sql` et `0004_tirage.sql` ne sont pas (ou pas à jour) : § 3 |
| « Connecte-toi pour ouvrir un booster » | build avec cloud : le tirage est décidé par le serveur — connecte-toi (raccourci « Mon compte ») |
| « set-returning functions are not allowed in CASE », « BY value of FOR loop must be greater than zero » ou un `cards` NULL | `0004_tirage.sql` collé est une version antérieure : recolle le fichier (il est rejouable, `create or replace`) |
| « Sauvegarde refusée par le serveur » | sauvegarde modifiée à la main (voir « ce que le serveur vérifie ») |
| « Les comptes invités sont désactivés » | Dashboard → Authentication → Sign In / Providers → **Anonymous sign-ins** |
| « Le service d'e-mail par défaut n'écrit qu'aux adresses de l'équipe » | normal : branche un SMTP, ou passe par un compte invité |
| « vitrine : carte non possédée (…) » | envoie d'abord ta collection ; seule la dernière sauvegarde cloud sert à vérifier la possession |
| « 4 cartes maximum » | une vitrine contient au plus quatre cartes ; retire-en une avant d'en ajouter une autre |
| « nom de créateur invalide » | la vitrine n'accepte que les slugs de créateur au format attendu |
| Supabase réclame un « custom SMTP » | son service intégré est réservé aux tests : ce n'est pas un bug de l'app |

### Diagnostiquer un souci de connexion

Deux outils, dans l'ordre :

1. **Dans l'app** — Profil → Sauvegarde cloud → **« Tester la connexion au
   cloud »** : joint `/auth/v1/health` en lecture seule et affiche le nom d'hôte.
   Un échec nomme l'hôte, le chemin **et** la cause technique.
2. **Dans un navigateur** — la page `public/diagnostic.html` (servie avec
   l'application) rejoue les appels un par un : lecture simple, lecture sans
   CORS, écriture simple, écriture avec les en-têtes de l'app, puis la séquence
   complète (compte invité → `pack_status` → `leaderboard`). Elle distingue un
   blocage réseau d'un refus CORS, et affiche la session enregistrée par le jeu.

### Pourquoi les appels passent par le client HTTP natif dans l'APK

Le WebView sert l'application depuis `https://localhost` : ce n'est pas une
adresse publique, et un `fetch` y est soumis au CORS. Sur certains projets
Supabase, ce preflight est refusé — l'échec apparaît alors comme une panne
réseau (« Réseau injoignable ») alors que le même appel fonctionne dans Chrome.
`src/lib/cloud/transport.ts` fait donc passer les appels par `CapacitorHttp`
(module du cœur de Capacitor, aucune dépendance en plus) sur un appareil, et par
`fetch` partout ailleurs. Appel **explicite** au plugin, et non son patch
automatique de `fetch` : l'interception Android des requêtes du WebView ne voit
pas le corps des POST, ce qui laissait échouer la création de compte invité.
