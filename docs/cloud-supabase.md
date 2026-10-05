# Compte, sauvegarde cloud et classement (Supabase)

CreatorDeck est jouable **sans aucun serveur** : la partie vit dans le
`localStorage` de l'appareil et le catalogue est embarqué dans l'APK. Le cloud
ajoute trois choses, et rien de plus :

1. **un compte** (adresse e-mail + code à 6 chiffres, pas de mot de passe) ;
2. **une sauvegarde cloud** de la partie, pour retrouver sa collection sur un
   autre appareil ;
3. **un classement mondial** calculé par le serveur.

Tout le reste continue de fonctionner hors ligne, y compris si le projet
Supabase n'existe pas encore : dans ce cas l'écran de compte affiche simplement
« cloud non configuré ».

---

## 1. Ce qui monte dans le cloud, et ce qui n'y monte pas

| Donnée | Où elle vit | Détail |
| --- | --- | --- |
| Catalogue (créateurs, raretés, taux) | **Dans l'APK** | fichiers JSON générés à la compilation, jamais envoyés |
| Partie (cartes, points, paliers, thème) | **Local d'abord** | copie envoyée au cloud seulement si tu te connectes |
| Adresse e-mail | Cloud | sert uniquement à te renvoyer ton code |
| Statistiques (cartes uniques, légendaires…) | Cloud | recalculées **par le serveur** depuis ta sauvegarde, visibles dans le classement |
| Vitrine (4 cartes épinglées) | Cloud | publiable plus tard sur un profil public |

Aucun mot de passe n'est stocké, aucune donnée n'est envoyée tant que tu n'as
pas validé un code, et « Déconnexion » efface la session de l'appareil.

## 2. Créer le projet (5 minutes)

1. Compte sur [supabase.com](https://supabase.com) → **New project**.
   Choisis une région européenne (`eu-west-3` / Paris ou `eu-central-1` /
   Francfort) : c'est là que vivront la sauvegarde et le classement.
   Le palier gratuit suffit largement (500 Mo de base, 50 000 utilisateurs
   actifs par mois).
2. **SQL Editor** → *New query* → colle tout le contenu de
   [`supabase/migrations/0001_comptes_cloud.sql`](../supabase/migrations/0001_comptes_cloud.sql)
   → **Run**. La requête crée les tables, les politiques RLS, les déclencheurs
   et les fonctions d'envoi / lecture / classement.
3. **Authentication → Sign In / Providers** : garde **Email** activé, et
   laisse « Confirm email » au choix (le code à 6 chiffres confirme l'adresse
   à lui seul).
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

## 3. Compiler avec le cloud (sur ta machine, PowerShell)

```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

Renseigne les deux lignes, puis :

```powershell
npm run build
npx serve out
```

`NEXT_PUBLIC_*` est **inliné à la compilation** : après un changement de clé, il
faut relancer `npm run build` (et refaire l'APK), pas seulement recharger la
page.

## 4. Compiler l'APK avec le cloud (GitHub Actions)

Le workflow lit deux **variables de dépôt** (pas des secrets : la clé anon est
publique par conception) :

1. GitHub → **Settings → Secrets and variables → Actions → onglet Variables**
   → *New repository variable* ;
2. `NEXT_PUBLIC_SUPABASE_URL` = `https://xxxxxxxx.supabase.co` ;
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la clé anon ;
4. relance le workflow **APK Android (debug)** en choisissant bien
   `arena/01a10b32-test` dans « Use workflow from ».

Sans ces variables, l'APK se construit quand même : il est simplement 100 %
hors ligne, avec l'écran de compte qui explique que le cloud n'est pas
configuré.

## 5. Vérifier que tout fonctionne

1. Ouvre l'app → **Profil → Sauvegarde cloud** ;
2. saisis ton adresse → **Recevoir un code** ;
3. recopie le code reçu → **Valider le code** ;
4. **Envoyer ma collection**, puis ouvre **Classement mondial** : tu dois y
   apparaître (les statistiques sont recalculées par le serveur).

Ensuite, l'envoi est automatique une vingtaine de secondes après ta dernière
action, et la ligne du profil indique l'état (« à envoyer », coche verte).

## 6. Comment les conflits sont traités

Deux appareils peuvent jouer la même collection. La règle est volontairement
prudente :

* **le contenu identique** → rien à faire ;
* **un côté nettement plus récent** (plus de 30 s d'écart) → l'app propose
  d'envoyer ou de charger, jamais les deux ;
* **les deux ont bougé** → l'app ne tranche pas : « Charger le cloud » adopte
  la version du serveur, « Envoyer ma collection » écrase celle du cloud.

Aucune fusion automatique : mélanger deux progressions produirait une
collection impossible à défendre côté serveur.

## 7. Ce que le serveur vérifie (et ce qu'il ne vérifie pas)

`push_save()` recalcule lui-même les statistiques à partir de la sauvegarde et
**refuse** ce qu'aucune partie réelle ne peut produire : carte sans créateur,
rareté ou variante inconnue, plus de créateurs que le catalogue, compteurs
négatifs. Seules les collections cohérentes sont classées.

En revanche, le serveur ne rejoue pas le moteur : il ne peut pas prouver qu'une
carte a bien été tirée par un booster. Tant que le tirage se fait sur
l'appareil, une sauvegarde fabriquée à la main peut donc gonfler une
collection. La suite logique est de déplacer le tirage côté serveur
(`pg_cron` + fonction Postgres, ou Edge Function) — c'est le prérequis avant
d'ouvrir les **échanges**.

## 8. Après : échanges, profils publics, notifications

* `supabase/migrations/0002_echanges.sql` — offres de troc avec transaction
  atomique (les deux collections changent ou aucune) ;
* profils publics : la table `profiles` est déjà lisible par tous, il reste à
  exposer la vitrine des 4 cartes épinglées ;
* notifications push : `@capacitor/push-notifications` + FCM, à brancher sur
  les éditions limitées.

## 9. Dépannage

| Symptôme | Cause probable |
| --- | --- |
| « Cloud non configuré » alors que `.env.local` existe | `npm run build` n'a pas été relancé (variables inlinées à la compilation) |
| « Code incorrect ou expiré » à chaque essai | modèle *Magic Link* sans `{{ .Token }}`, ou code d'un précédent envoi |
| « Trop de tentatives » | limite d'envoi d'e-mails de Supabase (1 par minute) : attends |
| « Session expirée : reconnecte-toi » | jeton révoqué ou projet migré : redemande un code |
| « Réseau injoignable » | hors ligne : la partie locale continue, l'envoi reprendra |
| « Sauvegarde refusée par le serveur » | sauvegarde modifiée à la main (voir § 7) |
