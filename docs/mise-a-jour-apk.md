# Mise à jour de l'APK de test depuis l'appli (D-144)

Une APK installée à la main se met à jour toute seule : quand une version plus
récente est publiée, l'appli affiche **« Nouvelle version disponible → Mettre à
jour »**. Un appui télécharge l'APK ; Android ouvre alors sa fenêtre
d'installation, où il faut appuyer sur **« Installer »**. Android interdit
l'installation totalement silencieuse d'une appli hors Play Store : ce second
appui ne peut pas être supprimé.

## Comment ça marche

1. Chaque fois que `main` reçoit un commit et que le workflow **Vérification**
   est vert, le workflow **APK de test** (`.github/workflows/apk.yml`) construit
   l'APK debug, signée avec la clé partagée (D-139), avec un numéro de version
   qui augmente à chaque compilation (`android/app/build.gradle`).
2. Il la publie comme *release* du dépôt **public** `GoodFight37/creatordeck-apk`
   (ce dépôt ne contient aucun code : seulement les APK et un fichier
   `latest.json`). Il garde les 10 dernières.
3. Dans l'appli Android, au démarrage et à chaque retour dans l'appli,
   `useAppUpdate` lit `latest.json`, compare son numéro à celui de l'appli
   installée et affiche le bandeau sous la barre du haut.
4. Le plugin natif `AppUpdater` télécharge l'APK, vérifie son empreinte SHA-256,
   que c'est bien CreatorDeck, que le numéro est plus récent, puis ouvre
   l'installateur. Android vérifie la signature.

Pourquoi pas le stockage Supabase : l'APK pèse ~110 Mo (portraits et images
MEMES), et le plan gratuit limite chaque fichier à 50 Mo. Les releases GitHub
acceptent 2 Go par fichier, gratuitement, sans connexion pour télécharger.

Sur le site (navigateur), rien ne s'affiche : le site est toujours à jour.

## À faire une seule fois (Malik)

1. **Créer le dépôt** : GitHub → New repository → nom `creatordeck-apk`,
   **Public**, cocher « Add a README » (il faut au moins un commit).
2. **Créer le jeton** : GitHub → Settings (ton profil) → Developer settings →
   Personal access tokens → **Fine-grained tokens** → Generate new token.
   - Repository access : *Only select repositories* → `creatordeck-apk`.
   - Permissions → Repository permissions → **Contents : Read and write**.
   - Expiration : la plus longue proposée (noter la date pour le renouveler).
3. **Ajouter trois secrets** au dépôt `CreatorDeck` : Settings → Secrets and
   variables → Actions → New repository secret.
   - `APK_RELEASE_TOKEN` : le jeton de l'étape 2.
   - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` : les mêmes
     valeurs que dans Vercel (Settings → Environment Variables). Sans elles,
     l'APK n'aurait ni compte, ni échanges.
4. **Premier lancement** : Actions → **APK de test** → *Run workflow* sur `main`
   (après la fusion de la branche `maj-apk`). Attendre la fin (≈ 15 min).
5. **Dernière installation à la main** : sur le téléphone, ouvrir
   `https://github.com/GoodFight37/creatordeck-apk/releases/latest`, télécharger
   `creatordeck.apk` et l'installer. Les APK installées avant n'ont pas le
   bouton : c'est la dernière fois qu'il faut le faire.
6. La toute première mise à jour depuis l'appli, Android demande d'autoriser
   CreatorDeck à « installer des applis inconnues » : l'appli ouvre le bon
   réglage, il suffit de l'activer puis de revenir et d'appuyer à nouveau.

## Si ça ne marche pas

| Symptôme | Cause probable |
| --- | --- |
| Le workflow s'arrête sur « Secrets manquants » | un des trois secrets de l'étape 3 |
| « Resource not accessible by personal access token » | le jeton n'a pas *Contents : Read and write* sur `creatordeck-apk` |
| Pas de bandeau dans l'appli | APK installée avant D-144, ou aucune release plus récente, ou pas de réseau |
| « Application non installée » | APK signée avec une autre clé que D-139 : désinstaller une dernière fois |
| « Fichier abîmé : empreinte différente » | téléchargement coupé : réessayer |

## Sécurité

- L'appli n'accepte qu'une adresse `https://github.com/GoodFight37/creatordeck-apk/releases/download/…`
  (vérifiée en JavaScript **et** dans le plugin Java), une empreinte SHA-256 et
  un fichier dont le paquet est `com.creatordeck.app` et le numéro plus récent.
- Android refuse toute APK signée par une autre clé que celle de l'appli
  installée.
- Les APK publiées sont des APK **de test** (clé debug). Elles ne doivent jamais
  servir à une publication Play Store.
- Le dépôt des APK est public : n'importe qui ayant l'adresse peut télécharger
  le jeu. C'est déjà le cas du site Vercel ; aucune donnée secrète n'est dans
  l'APK (seulement la clé publique Supabase, déjà servie par le site).
