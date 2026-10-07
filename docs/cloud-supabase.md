# Compte, cloud et jeu à plusieurs : sauvegarde, profils, échanges, amis, hôtel (Supabase)

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
     `src/data/creators.json` : ne pas modifier à la main. Il porte aussi la
     **famille** de chaque créateur (`region`), qui sert à la complétion par
     saison : si tu avais déjà collé une version antérieure, recolle-le.
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
     Holo, tri Gold, **complétion par famille** et **classement par famille**).
     Il recalcule les statistiques de tous les joueurs déjà en ligne : c'est
     normal qu'il travaille quelques secondes. Comme il grandit au fil des
     versions, recolle-le : il est rejouable (`create or replace`).
   - [`supabase/migrations/0007_direct.sql`](../supabase/migrations/0007_direct.sql)
     → **Run** pour activer le **statut EN LIVE** (cache `live_streams` et
     `live_state`), puis **re-coller `0003_catalogue.sql`** : il apporte la
     colonne `login`, la clé qui relie une diffusion Twitch à sa carte. Détail :
     §8, « Le direct ».
   - [`supabase/migrations/0008_friends.sql`](../supabase/migrations/0008_friends.sql)
     → **Run** pour activer les **amis** (`friend_requests`, `friends`,
     `send_friend_request()`, `list_friends()`, `has_friendship()`…). Détail :
     §8, « Les amis ».
   - **Se connecter avec Twitch** (facultatif, mais recommandé : c'est le
     compte le plus simple à retenir). Twitch est un fournisseur **intégré** de
     Supabase : pas de fournisseur personnalisé à créer, juste deux réglages et
     l'adresse de retour.
     1. **Console Twitch** ([dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps))
        → ton application → **OAuth Redirect URLs** → ajoute exactement
        `https://<ton-projet>.supabase.co/auth/v1/callback`, puis **Add** et
        **Save**. (Si une ancienne adresse `http://localhost:3000` traîne dans
        la liste, elle ne gêne pas : elle peut rester.)
     2. **Supabase** → *Authentication → **Sign In / Providers*** → dans la
        liste, **Twitch** → active-le et colle le **Client ID** et le
        **Client Secret** de ton application Twitch → **Save**.
        *(Le Client ID est une longue suite de lettres et de chiffres affichée
        en haut de la page « Manage » ; ce n'est pas le nom de l'application.)*
     3. **Supabase** → *Authentication → URL Configuration → Redirect URLs* →
        ajoute les retours possibles : l'adresse du site (`https://<ton-site>/`),
        `http://localhost:3000` (le jeu en local) et
        `com.creatordeck.app://auth` (l'application Android).
     Supabase demande à Twitch la portée `user:read:email` : l'adresse n'est
     renvoyée que si elle est **vérifiée** sur le compte Twitch (c'est le cas de
     la plupart). Un compte Twitch sans adresse vérifiée ne peut pas servir de
     compte de jeu — l'écran Compte le dit alors clairement.
     ⚠️ Si tu **régénères** le secret Twitch, il faut le recopier aux **deux**
     endroits : ici, et dans les secrets de la fonction `refresh-live`
     (`TWITCH_CLIENT_SECRET`), sinon le badge « Direct » s'éteint.
   - [`supabase/migrations/0017_reinitialiser.sql`](../supabase/migrations/0017_reinitialiser.sql)
     → **Run** pour que « **Réinitialiser la progression** » (écran Toi → menu)
     rejoue vraiment la partie à zéro **en ligne aussi** : sans cette migration,
     le serveur gardait sa réserve de boosters, son journal de tirages et le
     Paquet Scène du jour, et un joueur qui repartait de zéro attendait quand
     même la recharge de la partie qu'il venait d'effacer. Détail : §8,
     « Recommencer sa partie ».
   - [`supabase/migrations/0016_sortants.sql`](../supabase/migrations/0016_sortants.sql)
     → **Run** pour que **les Sortants** (les créateurs qui ont quitté le
     classement lors d'une régénération du catalogue) le soient aussi côté
     serveur : plus jamais tirés en booster, ni comptés dans la complétion, ni
     servis par le Paquet Scène — alors que leur ligne reste au catalogue, parce
     que leurs cartes circulent encore (classeur, échange, hôtel). Sans cette
     migration, une rotation du catalogue ne changerait rien en ligne. Détail :
     §8, « Les Sortants ».
   - [`supabase/migrations/0015_wishlist.sql`](../supabase/migrations/0015_wishlist.sql)
     → **Run** pour que le **créateur épinglé** existe côté serveur : un joueur
     épingle **un** créateur (celui qui lui manque), et son nom s'affiche sur sa
     fiche publique (`wishlist_slug`). Aucune possession exigée — on réclame
     justement ce qu'on n'a pas — et l'écriture passe par les fonctions, jamais
     par un `PATCH` de la table. Détail : §8, « La wishlist ».
   - [`supabase/migrations/0014_scene_pack.sql`](../supabase/migrations/0014_scene_pack.sql)
     → **Run** pour que le **Paquet Scène** existe côté serveur : une fois par
     **jour de jeu** (6 h UTC), cinq cartes de la famille visée, sans jamais de
     Légendaire. Le joueur **choisit** ses cartes parmi cinq listes de
     propositions, et le serveur recalcule ces listes avant d'accepter — un
     client ne peut pas répondre cinq Holo. Ce paquet ne fait pas monter le
     plancher de malchance (le journal distingue `kind = 'live'`). Détail :
     §8, « Le Paquet Scène ».
   - [`supabase/migrations/0013_progression.sql`](../supabase/migrations/0013_progression.sql)
     → **Run** pour que le **plancher de malchance** et la **série de jours**
     existent aussi côté serveur : après 80 boosters d'affilée sans Légendaire,
     le tirage en garantit une, et le 7ᵉ jour d'affilée offre un Perfect (ou
     3 sabliers). Les deux compteurs sont relus depuis le journal des tirages,
     pas depuis la sauvegarde du téléphone — un compteur client se trafiquerait.
     Détail : §8, « Le plancher de malchance ».
   - [`supabase/migrations/0012_last_pack.sql`](../supabase/migrations/0012_last_pack.sql)
     → **Run** pour que **le paquet reste exposé dix minutes** : les cinq cartes
     du dernier booster d'un joueur sont visibles par ses amis, qui peuvent y
     prendre une carte (une par jour). La carte quitte vraiment la collection du
     propriétaire, et une vieille sauvegarde ne peut pas la faire revenir.
     Détail : §8, « Le Last Pack ».
   - [`supabase/migrations/0011_direct.sql`](../supabase/migrations/0011_direct.sql)
     → **Run** pour que le **Direct fasse tomber plus**, côté serveur comme dans
     le moteur : les créateurs qui streament pèsent ×1,5 dans leur rareté, la
     variante Live leur est réservée (20 %, et systématiquement sur la carte
     garantie), et rien de tout cela ne s'applique si le cache du direct a plus
     de dix minutes. Détail : §8, « Le bonus Direct ».
   - [`supabase/migrations/0010_ventes.sql`](../supabase/migrations/0010_ventes.sql)
     → **Run** pour que le **carnet** sache dire « ta carte a été vendue » : une
     seule fonction (`market_sales()`), trois lignes de SQL. Le carnet marche
     sans — il n'annonce alors que les échanges et les amis.
   - [`supabase/migrations/0009_marche.sql`](../supabase/migrations/0009_marche.sql)
     → **Run** pour activer l'**hôtel des ventes** : déposer un doublon (payé
     comptant en points) et acheter au comptoir. Crée la table
     `market_listings` et les RPC `market_sell()`, `market_buy()`,
     `market_shelf()`, `market_listings_of()`. Détail : §8, « L'hôtel des
     ventes ».

> **Avant de coller une migration qui touche au tirage**, on peut la jouer sur
> un Postgres jetable, en local, sans toucher au projet Supabase :
>
> ```powershell
> npm install --no-save embedded-postgres pg
> npm run supabase:verify
> ```
>
> Le script exécute **les dix-sept migrations** (`0001` à `0017`) pour de vrai, dans
> un Postgres jetable, puis contrôle : le catalogue (1000 créateurs), les
> cartes (aucun doublon, une garantie Rare ou mieux), la recharge, la
> reprise de l'état local, la distribution du slot garanti (82 / 15 / 3 de
> `pull-rates.json` — 400 boosters) et **les échanges joués de bout en bout**
> avec trois joueurs : recherche, offre, refus, annulation, acceptation
> atomique, carte disparue entre-temps, droits et lecture par un tiers — plus
> le profil public (projection, complétion, rangs, tri Gold) sur trois autres
> joueurs, dont un dont la sauvegarde est invraisemblable, le direct, et **les
> amis joués de bout en bout** — demande, demande croisée, acceptation, refus,
> annulation, retrait, et ce qu'un joueur étranger ne voit pas. S'y ajoutent
> l'**hôtel des ventes** (dépôt payé comptant, comptoir, achat par un autre
> joueur, refus motivés), le **carnet des ventes** (`market_sales()`), le
> **bonus Direct** (poids ×1,5, variante Live réservée aux créateurs en direct,
> cache périmé → aucune carte Live) et le **Last Pack** (paquet exposé dix
> minutes, vol des deux côtés, refus d'un inconnu, garde-fou de `push_save`) et
> le **plancher de malchance** (journal amorcé à 79 boosters sans Légendaire, le
> 80ᵉ qui en sort une, compteur remis à zéro par un Légendaire de chance, série
> de jours cassée par un trou puis raccommodée, récompense du 7ᵉ jour dépensée
> une seule fois, fonctions internes fermées aux joueurs), le **Paquet
> Scène** (cinq listes de choix, tirage conforme accepté et normalisé, mauvaise
> famille, mauvaise rareté, variante non proposée, Légendaire, second paquet du
> jour → refus, plancher de malchance intact) et la **wishlist** (épingler,
> remplacer, retirer, créateur hors catalogue → refus, lecture par un autre
> joueur, écriture directe fermée).
> **241 contrôles** au total. Les deux
> dépendances ne sont **pas** enregistrées dans `package.json` : elles ne
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

Sans ces variables, l'APK se construit quand même : il se joue alors
uniquement sur l'appareil, et l'écran de compte explique que le cloud n'est pas
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

### Le plancher de malchance, les jetons, les missions du jour

`0013_progression.sql` ajoute au serveur ce que le moteur local applique déjà :
**après 80 boosters d'affilée sans Légendaire, le 5ᵉ slot en garantit une**. Le
seuil est celui de `src/data/pull-rates.json` (bloc `pity`), donc publié dans
l'écran « Taux de drop » avec sa probabilité réelle de s'activer, et
`src/lib/supabase-progression.test.ts` tombe si les deux divergent.

Ce que la migration change, et pourquoi :

* `_pack_pity(user)` relit le **journal des tirages** (`pack_draws`) à l'envers
  et s'arrête au premier tirage contenant une Légendaire : ce qu'elle a compté
  avant, c'est le compteur. Un Légendaire de **chance** remet donc le compteur à
  zéro au même titre que celui de la garantie.
* `_pack_streak(user, now)` compte les jours de jeu d'affilée avec un booster,
  la journée commençant à **6 h UTC** — exactement la conversion de
  `gameDay()` côté moteur, sinon les deux ne tomberaient plus le même jour.
  `_pack_perfect_today()` dit si le Perfect du jour est déjà sorti.
* `open_pack(p_jackpot text)` force le tirage quand le compteur atteint le seuil
  ou quand c'est le 7ᵉ jour de série. Le joueur peut préférer **3 sabliers** :
  il le dit (`p_jackpot = 'hourglasses'`), et le serveur se contente de ne pas
  forcer le tirage — cette monnaie ne vit que sur l'appareil, il n'y a donc rien
  à créditer côté serveur, et rien à y gagner en trichant. La récompense attend
  **toute la journée** : un booster normal le matin ne la consomme pas, c'est le
  premier Perfect du jour qui la dépense.
* `pack_status()` renvoie `pity`, `streak` et `jackpot_ready` : le chiffre
  affiché (« Légendaire garanti dans N boosters ») est **celui qui décidera du
  tirage**, pas une illustration.
* La migration **supprime l'ancienne `open_pack()` sans argument** avant de la
  recréer : sans ce `drop`, Postgres garderait les deux signatures et un appel
  sans argument continuerait d'ignorer la garantie.

**Pourquoi le compteur ne vient pas de la sauvegarde.** `open_pack()` reçoit une
sauvegarde d'appareil que le joueur peut éditer : un compteur rangé là-dedans
suffirait à obtenir une Légendaire à chaque booster. Les deux compteurs sont
donc **déduits** du journal, que seule `open_pack()` écrit — et comme rien n'est
stocké, il n'y a rien à resynchroniser. Les fonctions internes sont fermées aux
joueurs (`revoke … from public, anon, authenticated`).

**Les jetons restent locaux.** Comme les points et l'XP : 5 par booster (7 en
Prime Time), 400 pour la carte au choix à l'Atelier — jamais une Légendaire.
Ils sont crédités par `applyPackResult()`, donc aussi bien pour un tirage local
que pour un tirage décidé par le serveur.

### Le direct (statut EN LIVE)

Une carte dont le créateur **streame à cet instant** le dit : pastille « Direct »
sur la carte, bandeau sous le titre de l'accueil (« 12 sur 1000 · @kamet0 4 120 »),
ligne rouge au moment de la révélation, et un filtre « En direct » dans le
classeur. Rien de tout ça n'apparaît si la donnée est vieille de plus de dix
minutes : un badge « en direct » périmé serait un mensonge.

Le badge n'est pas la variante : le badge est un fait qu'on constate (il
s'allume sur n'importe quelle carte d'un créateur en direct, le temps du
direct), la variante Live est une **matière** qu'on tire au sort — mais depuis
`0011_direct.sql`, cette matière ne se tire **que pour un créateur qui
streame** (voir ci-dessous). Une carte Live dit donc toujours quelque chose de
vrai : elle est née pendant un direct.

### Le bonus Direct

Le badge seul ne changeait rien au tirage : il fallait que le direct **paie**.

- quand l'app sait qui streame (cache du serveur, **moins de dix minutes**),
  les créateurs en direct **pèsent ×1,5** dans leur rareté : ils tombent plus
  souvent ;
- leur carte a **20 %** de chance d'être en variante Live ; la carte garantie
  (le 5ᵉ slot) l'est **systématiquement** quand son créateur streame — c'est le
  moment fort du paquet ;
- sans information fraîche (cache périmé, table absente, aucun streamer), le
  bonus est neutre et **aucune carte Live ne sort**. Un « Live » qui
  désignerait quelqu'un qui ne streame pas ne vaudrait rien.

Les raretés publiées ne changent pas : le bonus ne touche ni les poids des
slots, ni le « Perfect ». Il décide seulement **qui** tombe, et sous quelle
matière. Les valeurs (×1,5 · 200‰ · dix minutes) vivent dans
`src/data/pull-rates.json` (section `direct`), sont affichées dans l'écran
« Taux de drop », et sont appliquées des deux côtés : le moteur local
(`src/lib/game-engine.ts`) et la migration `0011_direct.sql`. Deux garde-fous
empêchent les deux de diverger : `src/lib/supabase-direct.test.ts` (les valeurs
du fichier doivent être dans le SQL) et `npm run supabase:verify` (le tirage
serveur, joué pour de vrai, y compris avec un cache périmé).

Mise en place : `0011_direct.sql` → **Run** (§3), puis
`npm run supabase:verify` si tu veux le voir toi-même.

### Le Last Pack

Un booster ouvert n'est plus un moment privé. Ses cinq cartes restent
**exposées dix minutes** (`last_packs`), et **un ami** peut venir y prendre une
carte — **une par jour et par joueur** (`last_pack_steals`, index unique sur le
jour UTC).

Ce que le serveur vérifie avant de laisser faire, dans l'ordre :
authentification, paquet existant, fenêtre de dix minutes **ouverte**, paquet
qui n'est pas le tien, amitié (`has_friendship()`), carte encore disponible,
vol du jour non utilisé, **et la carte encore présente dans la collection du
propriétaire**. Ce dernier point est le plus important : sans lui, un vol
créerait une carte que personne n'a tirée. Le vol réécrit alors **les deux
sauvegardes** (la carte part chez l'un, arrive chez l'autre, marquée
`fromLastPack`) dans une seule transaction, verrous pris dans un ordre stable —
comme un échange accepté.

Deux garde-fous qui font la différence entre une mécanique et une décoration :

- **rien n'est exposé à un inconnu** : `last_pack_shelf()` ne rend que tes
  paquets et ceux de tes amis, jamais celui d'un joueur que tu ne connais pas ;
- **un vol ne se défait pas** : `push_save()` est réécrite dans cette migration
  pour refuser une sauvegarde d'appareil qui contiendrait encore une carte
  volée (le contrôle vise l'identifiant exact de la carte prise, pas son couple
  créateur + variante : elle a le droit de retomber d'un booster). Le message
  renvoie vers « Charger le cloud », où le vol est déjà écrit.

Le carnet annonce au propriétaire « X t'a piqué ton légendaire » (ou « ton
épique », ou « une carte ») — le voleur, lui, ne voit pas ses propres vols : on
ne raconte pas au joueur ce qu'il vient de faire. L'écran est « Toi → Last
Pack », avec le compte à rebours, la pastille sur l'onglet, et le vol en **deux
temps** (on choisit la carte, puis on la prend) parce qu'il n'y en a qu'un par
jour.

Le paquet est publié par un **déclencheur sur `pack_draws`** : `open_pack()`
n'est pas touchée, le tirage reste celui de `0004`/`0011` au caractère près.
L'expiration (`expires_at`) est écrite par le serveur : reculer l'horloge de son
téléphone ne rallonge pas la fenêtre.

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
5. Ouvrir l'app : le premier affichage déclenche le rafraîchissement.

**Diagnostiquer depuis un navigateur** — la fonction répond en JSON, sans outil :

| URL à ouvrir | Ce qu'elle dit |
| --- | --- |
| `…/functions/v1/refresh-live?check=1` | secrets présents ou non, catalogue lisible, âge du cache. **Aucune requête Twitch** |
| `…/functions/v1/refresh-live` | déclenche le rafraîchissement et renvoie ce qui a été publié |

Réponses possibles de l'appel normal : `{"skipped":true,"age_ms":…}` (le cache a
moins de 90 secondes — recharge la page plus tard), `{"ok":true,"checked":1000,
"live":12,…}` (publié), ou `{"error":…}` (secret manquant, catalogue vide, refus
de Twitch — le message dit lequel).

Si l'app ne déclenche rien alors que la fonction répond à la main, regarder
**Edge Functions → refresh-live → Logs** : une invocation refusée par
« Verify JWT » y apparaît comme un 401, une absence d'invocation veut dire que
l'app n'a pas appelé (cloud non configuré dans son `.env.local`).

### Les amis

Un joueur cherche un pseudo, envoie une demande, l'autre accepte : la relation
existe alors **des deux côtés à la fois**, et rien n'est décidé par l'appareil.
Trois listes dans l'écran (Amis, Reçues, Envoyées), accessible depuis
**Profil → Amis**.

Ce que le serveur garantit, et pourquoi c'est lui qui s'en occupe :

* une amitié ne se crée **que** par l'acceptation du destinataire — un client ne
  peut pas écrire une ligne dans `friends` (RLS active, aucune politique
  d'écriture, tout passe par des fonctions `security definer`) ;
* une demande est unique dans chaque sens : renvoyer une demande déjà en attente
  la renvoie telle quelle, et une demande **croisée** est signalée au joueur
  (« réponds dans Reçues ») au lieu de créer un doublon ;
* une ancienne demande (refusée, annulée, ou l'historique d'une amitié retirée)
  est **réutilisée** : on peut donc redevenir ami avec quelqu'un qu'on a retiré ;
* personne ne voit les demandes ni les amitiés des autres : un tiers qui lit
  `friend_requests` ne voit que les lignes qui le concernent.

| Élément | Rôle |
| --- | --- |
| `0008_friends.sql` | tables `friend_requests` et `friends`, RPC `send`/`accept`/`reject`/`cancel`/`remove`, listes, `has_friendship()` |
| `src/lib/social/friends.ts` | types et règles pures (tri, recherche, « il y a 3 jours »), testés sans navigateur |
| `src/lib/cloud/api.ts`, `cloud-store.ts` | appels RPC et états (`friends`, `friendsAt`) : la feuille lit, le store écrit |
| `src/components/friends-sheet.tsx` | l'écran : chercher un joueur, envoyer, accepter, refuser, annuler, retirer |

L'ajout se fait par **recherche de pseudo** (`search_players()`, le RPC des
échanges) : le serveur attend un identifiant de joueur, pas un code inventé.
Après chaque geste, l'écran recharge les trois listes au lieu de les bricoler
localement — une amitié affichée que le serveur n'a pas enregistrée serait pire
qu'un écran lent.

**Ce qui se passe si la migration n'est pas collée** : les appels répondent
`PGRST202` (« fonction introuvable ») et la feuille affiche un message ; rien ne
casse dans le reste du jeu.

### Le carnet de notifications

« Qu'est-ce qui est arrivé pendant que je n'étais pas là ? » — les offres
d'échange reçues, les réponses à tes offres, les demandes d'ami, les amitiés
acceptées et tes ventes à l'hôtel. L'écran s'ouvre depuis **Toi →
Notifications**, avec une pastille quand il y a du nouveau.

**Aucune table `notifications` côté serveur**, et c'est volontaire : chaque ligne
du carnet correspond à un fait que le serveur garde déjà — une ligne de
`trades` (`0005`), une demande ou une amitié (`0008`), une annonce vendue
(`0009`). Le carnet les **relit** (`src/lib/social/inbox.ts`) et les met en
français. Une table dédiée aurait créé un deuxième endroit où la même vérité
pourrait diverger — le genre d'écart qu'on ne découvre qu'un mois plus tard.

| Élément | Rôle |
| --- | --- |
| `src/lib/social/inbox.ts` | construit les lignes depuis les faits déjà connus, compte les nouveautés — pur, testé |
| `src/lib/cloud/cloud-store.ts` | `loadInbox()` (les sources en parallèle, chacune tolérante à l'échec), `markInboxSeen()`, `clearInbox()` |
| `src/hooks/use-inbox.ts` | ajoute la seule ligne qui ne vient pas du serveur : **ton créateur épinglé est en direct** (croisement de l'épinglé et du cache du direct) |
| `src/components/notifications-sheet.tsx` | l'écran ; l'ouvrir **marque le carnet comme lu** |
| `0010_ventes.sql` | `market_sales()` : tes ventes conclues, avec l'acheteur (le comptoir ne montre que ce qui reste à vendre) |
| `0012_last_pack.sql` | `last_pack_shelf()` : les boosters de tes amis encore ouverts → « X a ouvert Kamet0, Last Pack encore 8 min » |

Deux détails d'usage :

* la « dernière visite » vit **sur l'appareil**, par joueur
  (`creatordeck.inbox.seen.<userId>`) : changer de compte ne mélange pas les
  nouveautés des deux ;
* un carnet qui raconte au joueur ce qu'il vient de faire ne sert à rien : tes
  propres offres, celles que tu as acceptées, les annonces que tu viens de
  déposer, les amis que tu viens d'accepter et **ton propre Last Pack** n'y
  figurent pas.

Deux lignes plus récentes, qui n'obéissent pas à la même règle :

* **« X a ouvert Kamet0, Last Pack encore 8 min »** vient de
  `last_pack_shelf()`, que le joueur a déjà le droit de lire pour aller voler
  une carte. Le titre nomme la **meilleure carte du paquet** (la plus rare selon
  `RARITY_META`) : « a ouvert un commun » ne fait aller voir personne. Les
  minutes sont arrondies vers le haut, plafonnées à la fenêtre, et après la
  fenêtre la ligne dit simplement « Last Pack terminé ».
* **« Kamet0 est en direct »** ne vient d'aucune table : c'est le croisement du
  créateur épinglé et du cache du direct, fait dans `use-inbox.ts`. La raison
  est pratique : la **pastille** de la navigation et la **feuille** doivent
  compter exactement la même liste, sinon la pastille annonce une ligne que
  l'écran ne montre pas. La date de la ligne est celle du **début du direct**
  telle que Twitch la donne — un direct commencé il y a vingt minutes arrive
  donc déjà lu, et un nouveau direct crée une nouvelle ligne.

### La wishlist

Un joueur épingle **un** créateur — celui qui lui manque le plus — et son nom
s'affiche sur sa fiche publique. C'est une demande, pas un secret : elle est
lisible par tout le monde, y compris par un visiteur.

`0015_wishlist.sql` apporte trois fonctions et une table d'une ligne par joueur
(`user_id` en clé primaire, donc **épingler remplace**) :

| Fonction | Ce qu'elle fait |
| --- | --- |
| `wishlist_slug(p_user_id uuid default null)` | lit l'épinglé — le sien par défaut, celui d'un autre joueur si on le nomme |
| `set_wishlist(p_slug text)` | épingle (ou remplace) ; **refuse** un slug absent du catalogue |
| `clear_wishlist()` | retire l'épinglé |

Deux choix qui méritent d'être écrits :

* **aucune possession exigée.** C'est l'inverse de `set_showcase()`, qui relit
  la sauvegarde du joueur pour vérifier qu'il possède la carte. Ici, on réclame
  justement ce qu'on n'a pas : le serveur vérifie seulement que le créateur
  existe au catalogue.
* **l'écriture directe dans la table est retirée aux clients**
  (`revoke insert, update, delete`). Sans ça, un client pourrait `PATCH`er sa
  ligne avec un slug périmé, ou celle d'un autre joueur si une politique était
  mal écrite ; les trois fonctions sont le seul chemin, et elles vérifient
  `auth.uid()`.

`player_profile()` est **redéfinie** dans cette migration (la version de `0006`
ne connaissait pas la wishlist) et renvoie `wishlist_slug`. Un client qui n'a pas
encore collé `0015` ne reçoit simplement pas le champ : la fiche s'affiche sans
la ligne, et l'écran « Toi » propose l'épinglage sans erreur bloquante.

### Le Paquet Scène

Le second paquet du jeu, et le seul où **le joueur choisit**. Une fois par
**jour de jeu** (la journée commence à 6 h UTC, comme les missions et la
série), `scene_pack_choices(p_family)` fabrique cinq listes de propositions —
une par emplacement — dans la famille visée, et `open_scene_pack(p_family,
p_cards)` accepte la réponse après l'avoir **recalculée**.

Pourquoi tant de précautions : un paquet où le client choisit ses cartes est un
paquet où le client peut mentir. Le serveur refuse donc toute carte qui ne
figure pas, **au triplet exact** (créateur, rareté, variante), dans la liste de
son emplacement. Un commun annoncé en Légendaire est refusé ; une Holo que le
serveur n'avait pas offerte aussi. Les listes elles-mêmes sont tirées avec
`hashtext(user | jour | emplacement)` — reproductibles, donc vérifiables, mais
impossibles à deviner pour les composer d'avance.

Trois règles qui viennent du reste du jeu :

* **jamais de Légendaire** dans les listes (et `catalog:ci` le vérifie côté
  catalogue) : ce paquet sert à compléter une famille, pas à casser le plancher
  de malchance ;
* **il ne compte pas dans le plancher de malchance, la série ni la Prime Time.**
  Le journal `pack_draws` distingue ses lignes (`kind = 'scene'`) et les trois
  compteurs du Live Drop ne lisent plus que `kind = 'live'`. Sans ça, un paquet
  gratuit chaque jour ferait monter le compteur et offrirait la Légendaire du
  80ᵉ sans un seul booster ouvert ;
* **le Direct ne l'influence pas** : la variante Live reste au Live Drop.

### Se connecter avec Twitch

Twitch sert d'**identité** : un appui sur « Continuer avec Twitch » (écran
Compte), le navigateur demande l'autorisation, et le joueur revient connecté —
sans mot de passe, sans code par e-mail. C'est le fournisseur **intégré** de
Supabase (`provider=twitch`, *Authentication → Sign In / Providers → Twitch*) :
Supabase connaît déjà les adresses de Twitch et ajoute lui-même l'en-tête
`Client-ID` que l'API Twitch exige.

Ce que l'appareil fait, et ce qu'il ne fait pas :

* il ouvre `…/auth/v1/authorize?provider=twitch&redirect_to=…`
  (`twitchAuthorizeUrl()`) : **le client Twitch secret ne quitte jamais
  Supabase**, l'appareil ne connaît même pas l'identifiant du client ;
* au retour, il lit les jetons **dans le fragment** de l'adresse
  (`parseOAuthReturn()`), demande à Supabase à qui ils appartiennent
  (`/auth/v1/user`), puis enregistre la session (`adoptSession()`) — à partir de
  là, une connexion Twitch est indiscernable d'un compte invité, avec sa
  collection déjà en place si le compte en avait une ;
* sur le site, l'adresse est **nettoyée après lecture**
  (`history.replaceState`) : un jeton laissé dans la barre d'adresse finirait
  dans l'historique du navigateur ;
* dans l'application Android, la page servie est `https://localhost` : aucune
  redirection ne peut y arriver. Le retour passe donc par un schéma d'application
  (`com.creatordeck.app://auth`, déclaré dans `AndroidManifest.xml`) et par
  l'événement `appUrlOpen` du plugin `@capacitor/app`.

Ce qu'il faut déclarer une fois : l'adresse de retour dans la console Twitch, le
Client ID et le secret dans Supabase, et les adresses de retour dans *URL
Configuration* — voir §3.

| Élément | Rôle |
| --- | --- |
| `src/lib/cloud/twitch.ts` | adresse du dialogue, lecture du retour, adresse de retour, nettoyage — testés sans navigateur |
| `src/lib/cloud/api.ts` | `twitchAuthorizeUrl()`, `adoptSession()` (jetons → session enregistrée) |
| `src/lib/cloud/cloud-store.ts` | `twitchSignInUrl()` (donne l'adresse, ne navigue pas), `completeTwitchSignIn()` (installe, relit l'identité) |
| `src/hooks/use-twitch-return.ts` | le retour : fragment de l'adresse sur le site, `appUrlOpen` dans l'APK |
| `src/components/account-sheet.tsx` | le bouton « Continuer avec Twitch » |
| `android/app/src/main/AndroidManifest.xml` | le filtre `com.creatordeck.app://auth` |

### L'hôtel des ventes

L'hôtel est **asynchrone** : on n'attend personne. Un joueur dépose un doublon,
**l'hôtel le paie tout de suite** en points, et la carte va au comptoir. Un autre
joueur l'achète plus tard, au prix de l'étiquette. Deux joueurs n'ont jamais
besoin d'être connectés en même temps.

| Prix | Valeur | Où c'est écrit |
| --- | --- | --- |
| `payout` (payé au vendeur) | 20 / 40 / 100 / 250 / 400 points selon la rareté, ×1 (Standard), ×2 (Live), ×3 (Holo), ×5 (Gold) | `market_payout()` en base, `PAYOUTS` dans `src/lib/market.ts` |
| `price` (payé par l'acheteur) | une fois et demie le `payout`, arrondi au supérieur | `market_price()` en base, `shelfPrice()` dans `src/lib/market.ts` |

L'écart entre les deux est la marge de l'hôtel : sans elle, on vendrait et on
rachèterait la même carte en boucle sans rien perdre. Les deux grilles sont
écrites deux fois — en SQL (le serveur paie) et en TypeScript (l'écran affiche
« Vendre · 400 pts » sans un aller-retour par carte). Elles sont vérifiées des
deux côtés : `scripts/verify-supabase-migrations.mjs` et `src/lib/market.test.ts`.

Ce que le serveur vérifie, dans `market_sell()` et `market_buy()` :

* la carte déposée est bien **dans la collection envoyée** (et la rareté vient du
  **catalogue**, jamais de la carte : une sauvegarde bricolée ne se vend pas au
  prix d'une légendaire) ;
* ce n'est pas la **dernière copie** d'un couple créateur + variante — même règle
  que le recyclage, elle protège la complétion ;
* on n'achète pas sa propre annonce, ni deux fois la même (le verrou
  `for update` sur l'annonce tranche entre deux acheteurs simultanés) ;
* l'acheteur a les points, et la partie locale est **à jour dans le cloud** avant
  l'opération (comme un échange accepté) ;
* passé **trente jours**, une annonce quitte le comptoir : le vendeur a déjà été
  payé, personne ne perd rien.

La table `market_listings` n'a **aucune politique** et ses droits sont révoqués :
un client ne la lit ni ne l'écrit jamais directement, tout passe par les RPC
`security definer`. Les cartes achetées portent la marque `fromMarket` (le numéro
de l'annonce), exactement comme les cartes d'échange portent `fromTrade` : si la
même réponse est appliquée deux fois, la carte n'entre qu'une seule fois dans le
classeur.

**Où le voir** : **Profil → Hôtel des ventes** (déposer un doublon, acheter au
comptoir), et la section « En vente à l'hôtel » d'une fiche publique.

| Élément | Rôle |
| --- | --- |
| `0009_marche.sql` | table `market_listings`, grilles de prix, RPC `market_sell`/`market_buy`/`market_shelf`/`market_listings_of` |
| `src/lib/market.ts` | grille de prix (miroir du serveur), liste des doublons déposables, libellés — testés sans navigateur |
| `src/lib/game-engine.ts` | `applyMarketSale()` / `applyMarketPurchase()` : l'appareil rejoue ce que le serveur a écrit |
| `src/lib/cloud/api.ts`, `cloud-store.ts` | appels RPC et états (`market`, `marketAt`, `profileMarket`) |
| `src/components/market-sheet.tsx` | l'écran : le portefeuille, « Déposer un doublon », « Le comptoir » |

### La complétion par famille de collection

Le catalogue est découpé en **familles** par langue de diffusion — France &
francophonie, Espagne & Amérique latine, Anglophonie… —, comme les séries d'un
jeu de cartes. Chaque créateur appartient à une famille (`creators.region`), et
le serveur sait donc répondre à « combien ce joueur possède-t-il en
Anglophonie ? » **sans connaître sa collection** : c'est `player_profile()` qui
renvoie `by_region`, la même mécanique que la répartition par rareté.

Pourquoi côté serveur : la complétion par famille est la seule information
qu'on ne peut pas recalculer sur l'appareil quand on regarde **la fiche d'un
autre joueur**. Son catalogue n'existe pas dans cette app ; le nôtre ne dit rien
de ses cartes.

| Élément | Rôle |
| --- | --- |
| `0003_catalogue.sql` | la colonne `region` de chaque créateur (`S01`…`S09`, `S10` pour la fourre-tout) |
| `0006_profil_public.sql` | `by_region` dans `player_profile()` : `{ "S01": { "owned": 12, "total": 155 }, … }` |
| `src/lib/cloud/api.ts` | `byRegion` (type `ProfileFamily`), trié du plus complet au plus vide |
| `src/lib/regions.ts`, `src/lib/cosmetics.ts` | libellé de famille et teinte — les mêmes que l'écran des saisons et les emblèmes |
| `src/components/public-profile-sheet.tsx` | la liste « Familles de collection » sur la fiche publique |

Deux choses à savoir sur les chiffres :

* les familles sans aucune carte possédée sont **présentes à zéro**, pas
  absentes : c'est justement ce qu'il reste à collectionner ;
* un créateur possédé en deux exemplaires ne compte **qu'une fois** (comme la
  complétion du catalogue), et un créateur absent du catalogue ne compte nulle
  part.

L'écran **Objectifs** du jeu, lui, garde ses paliers et ses récompenses
(points, sabliers, emblème) : ils sont calculés localement, avec la famille
comme unité. Ce que le serveur ajoute, c'est la comparaison entre joueurs.

### Les Sortants

Le catalogue bouge : une régénération remplace des créateurs. Ceux qui quittent
le classement ne disparaissent pas pour autant — leurs cartes sont dans des
classeurs, dans des échanges, en vente à l'hôtel. Ils deviennent des
**Sortants** : `0003_catalogue.sql` leur met un drapeau (`creators.retired`),
et `0016_sortants.sql` fait lire ce drapeau à tout ce qui décide.

| Ce que change `0016_sortants.sql` | Pourquoi |
| --- | --- |
| `_pack_choose_creator()` ignore un Sortant | il n'est plus tirable, en booster comme sur le slot garanti |
| `scene_pack_choices()` (et l'ouverture) l'ignore aussi | le Paquet Scène ne doit pas servir ce que le booster refuse |
| `refresh_stats()` ne le compte plus dans la complétion | « X / 1000 » se mesure sur le catalogue courant — sinon 100 % deviendrait inatteignable dès la première rotation |
| `player_profile()` publie `catalog_size` sans eux | la fiche publique et le classement comparent des périmètres comparables |

Ce qui ne change **pas** : la ligne du créateur. Elle reste dans `creators`, donc
une carte gardée continue de s'afficher, de s'échanger, de se vendre et de
compter comme une carte (pas comme une découverte). Le serveur ne supprime
jamais un créateur.

Deux garde-fous, côté application : `src/data/retired.json` porte les Sortants
avec l'édition de leur départ (`retiredEdition`), et l'Atelier n'en propose
l'artisanat que **pendant cette édition-là** — jamais une Légendaire. Le
vérificateur (`npm run supabase:verify`) joue la rotation sur une base jetable :
deux créateurs marqués, 40 boosters ouverts, zéro Sortant tiré, complétion
inchangée pour la carte possédée, ligne toujours là.

### Recommencer sa partie

« Réinitialiser la progression » (écran **Toi** → menu, tout en bas) remet la
partie à zéro **partout** : l'appareil et le serveur. C'est `reset_progress()`
(`0017`) qui s'occupe de la moitié serveur, et elle efface exactement quatre
choses :

| Ce qui s'efface | Pourquoi |
| --- | --- |
| `pack_state` (la réserve de boosters) | **supprimée**, pas remise à zéro : la lecture suivante la reconstruit depuis la sauvegarde neuve, donc le joueur retrouve ses 3 boosters tout de suite |
| `pack_draws` (le journal des tirages) | il porte le plancher de malchance, la série de jours et le Perfect du 7e — une partie neuve repart de zéro sur les trois |
| `pack_scene` (le Paquet Scène du jour) | de nouveau disponible, comme dans une partie neuve |
| `last_packs` (les Last Pack exposés) | ils montrent cinq cartes d'un booster qui n'existe plus |

Ce qui **survit**, volontairement : le pseudo et la vitrine (ce n'est pas de la
progression), la wishlist (une envie, pas un acquis), les amitiés, les échanges
conclus, les annonces en cours à l'hôtel, et la sauvegarde — c'est elle que la
partie neuve remplace, juste après, par un `push_save()`.

Trois garde-fous, parce que c'est la seule fonction du jeu qui **supprime** des
lignes à la demande du client :

* elle n'efface que **la partie de l'appelant** (`auth.uid()`, jamais un
  paramètre) ;
* elle est fermée à `anon` (`revoke all … from public, anon`), comme la
  wishlist : sans compte, on n'efface rien ;
* le vérificateur la joue pour de vrai : réserve vidée, Paquet Scène du jour
  ouvert, douze tirages au journal → la fonction rend les boosters, rouvre le
  Paquet Scène, ramène le plancher à zéro, et laisse le profil intact.

#### Le classement par famille

Dans **Compte → Classement**, la puce « Par famille » classe les joueurs sur une
famille précise : « qui complète le mieux l'Anglophonie ? ». Les puces de famille
n'apparaissent qu'à ce moment-là, et chaque ligne affiche « 23 / 402 ».

Ce tri est le seul qui lit `user_cards` — la projection des cartes possédées, à
laquelle **aucun client n'a accès** (RLS active, aucune politique, et les droits
de table révoqués). La fonction de classement est donc `security definer`, comme
`player_profile()` : elle peut compter, et ne renvoie qu'un couple de nombres
par joueur, sur des joueurs déjà `verified`.

| Point d'attention | Pourquoi |
| --- | --- |
| L'ancienne signature à deux arguments est supprimée | sinon deux fonctions coexisteraient, et un client pourrait appeler celle qui ignore les familles |
| La famille a une valeur par défaut (`null` → fourre-tout `S10`) | l'APK déjà installé appelle avec deux arguments : il continue de fonctionner au lieu de casser |
| Une famille inconnue ne fait pas échouer la requête | elle rend zéro partout, plutôt qu'une erreur PostgREST en plein écran |

**Où le voir** : `?profil=<identifiant>` (le lien de partage), la ligne du
classement d'un joueur, ou **Profil → Ma fiche publique** pour la sienne.

## 9. Suite : notifications

**Fait :** **carnet de notifications** (offres, réponses, amis, ventes —
reconstruit depuis les faits déjà enregistrés, pastille dans le menu « Toi ») ;
**connexion Twitch** (identité OAuth par le fournisseur Twitch
intégré à Supabase, le secret restant côté serveur) ;
**hôtel des ventes** (`0009_marche.sql` : dépôt payé comptant,
comptoir asynchrone, vitrine « En vente » sur la fiche publique) ;
**complétion par famille de collection** (colonne `region` du
catalogue et `by_region` de `player_profile()`) ; **amis côté serveur**
(`0008_friends.sql` : demandes, acceptation, retrait, invisibilité pour les
tiers) ; **statut EN LIVE** (le direct réel,
alimenté par Helix côté serveur — voir §8) ; vitrine de quatre cartes ; **profil public complet** et classements
enrichis (`0006_profil_public.sql` : projection `user_cards`, complétion, rangs,
Gold et Holo, affiche de partage) ; tirage des boosters côté serveur
(`0004_tirage.sql`, les cartes sont infalsifiables) ; échanges de cartes
arbitrés par le serveur (`0005_echanges.sql`, une carte contre une carte
jusqu'à cinq de chaque côté) ; compte gardable par adresse + mot de passe,
**sans SMTP**.

**Reste à faire, dans cet ordre :**

* **réveil du téléphone** (notifications push Capacitor + FCM) : le carnet sait
  déjà *quoi* dire, il reste à le faire *sonner* quand l'app est fermée. Trois
  pièces, dans cet ordre :
  1. un projet Firebase (gratuit) et son fichier `google-services.json` dans
     `android/app/` — **obligatoire avant d'ajouter le greffon**, sinon l'APK ne
     se construit plus ;
  2. `@capacitor/push-notifications` côté app, qui enregistre le jeton du
     téléphone dans une table `push_devices` (RLS : chacun ne voit que le sien) ;
  3. une fonction serveur `send-push` (clé de service FCM dans un secret
     Supabase), appelée quand un fait nouveau est écrit — c'est là qu'un
     déclencheur SQL et `pg_net` entrent en jeu.
  Le carnet reste la source des lignes : le push ne fait que prévenir qu'il y a
  du nouveau ;
* idées non engagées : échanges avec plusieurs partenaires à la fois,
  historique complet des échanges, recherche de joueur par slug de créateur,
  temps réel sur les offres et le carnet (aujourd'hui : rafraîchissement
  manuel ou à l'ouverture de l'écran), revente entre joueurs (l'hôtel, lui,
  est en place — §8).

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
| Un message du serveur s'affiche avec des caractères bizarres (« paquet sc├¿ne ») | la migration a été collée depuis la console Windows, qui a relu ses octets UTF-8 en CP850. L'application **répare** ces phrases (`src/lib/cloud/mojibake.ts`), donc l'écran reste lisible ; pour nettoyer aussi la base, recolle la migration concernée depuis le navigateur (Ctrl+A, Ctrl+C) |
| « Réinitialiser la progression » ne rend pas les boosters | le serveur n'avait pas encore `0017` : sa réserve vivait à part de la sauvegarde. Colle `0017_reinitialiser.sql` (§ 3) |
| « echange : tu ne possèdes plus … » | la carte donnée a été recyclée ou échangée depuis l'offre : annule l'offre et recommence |
| « Synchronise d'abord ta collection » (échange) | la partie locale et le cloud ont divergé : **Synchroniser** puis recommence (le serveur écrit toujours dans la collection du cloud) |
| La puce « Par famille » n'apparaît pas dans le classement | `0006_profil_public.sql` n'a pas été recollé : il apporte la signature à trois arguments |
| « Par famille » affiche 0 / 0 pour tout le monde | la famille choisie n'est pas la bonne, ou le catalogue n'a pas été recollé (`0003_catalogue.sql`, colonne `region`) |
| La liste « Familles de collection » n'apparaît pas sur une fiche | `0006_profil_public.sql` n'a pas été recollé (il apporte `by_region`) |
| Les familles sont toutes « Sans frontière » ou vides | `0003_catalogue.sql` n'a pas été recollé : la colonne `region` manque |
| « Les amis ne sont pas installés sur ce projet » | `0008_friends.sql` n'a pas été collé : § 3 |
| L'entrée « Amis » n'apparaît pas dans le profil | le cloud n'est pas configuré dans ce build : sans serveur, il n'y a personne à ajouter |
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
