# Compte, sauvegarde cloud, vitrine et classement (Supabase)

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
   infalsifiables, prérequis des échanges).

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

Aucun mot de passe n'est stocké. Les données restent locales tant que tu ne
crées pas de compte invité ou ne valides pas ton code ; « Déconnexion » efface
la session de l'appareil.

## 2. Deux façons d'avoir un compte

**Tu n'as pas besoin du Magic Link.** L'e-mail est une méthode parmi d'autres :
ce qui compte pour le cloud, c'est un identifiant `user_id`. Il y en a deux :

| | Compte invité | Adresse e-mail + code |
| --- | --- | --- |
| Ce qu'il faut activer | **Anonymous sign-ins** (une case à cocher) | un **SMTP** configuré |
| Ce qu'il faut posséder | rien | un domaine ou un compte d'envoi gratuit |
| Mise en route | immédiate | 10 minutes de configuration |
| Limite | lié à la session de l'appareil | récupérable sur n'importe quel appareil |

Pourquoi Supabase réclame un SMTP : son service d'e-mail intégré est **réservé
aux tests** (quelques envois par heure, et il n'écrit qu'aux adresses de l'équipe
du projet). Dès qu'on veut envoyer un code à quelqu'un d'autre, il faut brancher
son propre serveur d'envoi.

### Compte invité (recommandé pour commencer)

1. Dashboard → **Authentication → Sign In / Providers** → active
   **Anonymous sign-ins** → Save.
2. Dans l'app : Profil → **Sauvegarde cloud** → **Créer un compte invité**.
3. Donne-toi un nom (il apparaît au classement), puis **Envoyer ma collection**.

Rien à installer, rien à payer, aucun e-mail. À savoir : le compte vit avec la
session enregistrée sur l'appareil. Réinstaller l'app ou vider ses données perd
l'accès au compte (la collection locale, elle, est sauvegardée par le mécanisme
habituel d'export/import). Attacher une adresse e-mail à un compte invité se
fera quand un SMTP existera — c'est prévu côté Supabase (`PUT /auth/v1/user`).

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
5. **Settings → API** : note l'**URL du projet** et la clé **anon public**.

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

### Ce que le serveur ne vérifie pas (volontairement)

Les points, l'XP et le niveau restent calculés sur l'appareil : seul le
contenu des boosters (et donc les cartes) est décidé par le serveur. Hors
périmètre actuel : une sauvegarde trafiquée peut encore gonfler les compteurs
de ressources, mais pas la collection.

### Le tirage est décidé par le serveur

Depuis la migration `0004_tirage.sql`, ouvrir un booster demande une
connexion. La fonction `open_pack()` tire les 5 cartes avec exactement le même
algorithme que le moteur local (`src/lib/game-engine.ts`) : mêmes poids par
slot (recopiés depuis `src/data/pull-rates.json` avec un commentaire qui pointe
le fichier), même événement « Perfect » (5 ‰), même Fisher-Yates, aucun
créateur en double dans un même booster.

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

## 9. Suite : échanges, notifications

**Fait :** vitrine de quatre cartes et profil public consultable depuis le
classement ; tirage des boosters côté serveur (`0004_tirage.sql`, les cartes
sont infalsifiables).

**Reste à faire, dans cet ordre :**

* `supabase/migrations/0003_echanges.sql` — troc avec transaction atomique :
  les deux collections changent ou aucune (le journal `pack_draws` permet de
  vérifier qu'une carte échangée provient d'un tirage réel) ;
* permettre d'attacher une adresse e-mail à un compte invité (récupération
  multi-appareil), sans rendre le SMTP obligatoire pour les comptes invités ;
* notifications push Capacitor (`@capacitor/push-notifications` + FCM), à
  brancher quand elles auront un usage produit.

## 10. Dépannage

| Symptôme | Cause probable |
| --- | --- |
| « Cloud non configuré » alors que `.env.local` existe | `npm run build` n'a pas été relancé (variables inlinées à la compilation) |
| « Code incorrect ou expiré » à chaque essai | modèle *Magic Link* sans `{{ .Token }}`, ou code d'un précédent envoi |
| « Trop de tentatives » | limite d'envoi d'e-mails de Supabase (1 par minute) : attends |
| « Session expirée : reconnecte-toi » | jeton révoqué ou projet migré : redemande un code |
| « Réseau injoignable » | hors ligne : la partie locale continue, l'envoi reprendra |
| « Connecte-toi pour ouvrir un booster » | build avec cloud : le tirage est décidé par le serveur — connecte-toi (raccourci « Mon compte ») |
| « Sauvegarde refusée par le serveur » | sauvegarde modifiée à la main (voir « ce que le serveur vérifie ») |
| « Les comptes invités sont désactivés » | Dashboard → Authentication → Sign In / Providers → **Anonymous sign-ins** |
| « Le service d'e-mail par défaut n'écrit qu'aux adresses de l'équipe » | normal : branche un SMTP, ou passe par un compte invité |
| « vitrine : carte non possédée (…) » | envoie d'abord ta collection ; seule la dernière sauvegarde cloud sert à vérifier la possession |
| « 4 cartes maximum » | une vitrine contient au plus quatre cartes ; retire-en une avant d'en ajouter une autre |
| « nom de créateur invalide » | la vitrine n'accepte que les slugs de créateur au format attendu |
| Supabase réclame un « custom SMTP » | son service intégré est réservé aux tests : ce n'est pas un bug de l'app |
