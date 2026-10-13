# Pilote automatique de portraits — 13 octobre 2026

## Demande et périmètre

Malik autorise un essai concret après recherche : automatiser recherche, tri et
cadrage, puis passer derrière pour corriger les problèmes, en conservant ses
300 choix manuels. Base main vérifiée `34fdf0b2de0b21a2e42e4ac4482e084d4669d394`.
20 créateurs du catalogue restant : mélange de rangs 301–965, noms connus et
moins connus, quelques identifiants ambigus. Ce n’est pas un échantillon aléatoire
ni une preuve de rendement pour les 697 créateurs encore sur avatar Twitch.

Le prototype est dans `tools/portrait-pilot/`. Le jeu, ses sélecteurs et ses
assets ne changent pas. Les choix manuels, les Commons déjà intégrés, Diverron
et SolaryHS/j0niq/toaststix explicitement acceptés sont exclus par le programme,
même dans une sélection explicite de slugs. Aucun portrait tiers n’est publié.

## Recherche réellement exécutée

Une première collecte via la recherche d’images de session a donné 73 candidates
pour 20 requêtes ; elle est conservée séparément et ne sert pas à annoncer les
résultats SerpApi. Malik a ensuite fourni une clé : SerpApi Google Images a été
réellement utilisé, avec les liens d’originales et leurs pages sources.

Première formulation trop restrictive (nom + Twitch + jeu courant + portrait) :
934 résultats cumulés et beaucoup de recherches vides. Les dix recherches vides
ont été reprises avec une formulation plus simple. Les résultats et images sont
mis en cache ; leurs relectures et les corrections locales ne lancent pas une
nouvelle collecte complète. Les dimensions annoncées ont été récupérées dans
les réponses SerpApi mises en cache, puis les dimensions réelles ont été mesurées
au décodage. Un message « Google Images hasn't returned any results » est traité
comme absence de résultats, distinct d’un refus de clé/quota.

Au relevé **2026-10-13 10:59:47 UTC**, le compte indiquait **Free Plan,
30 recherches utilisées / 250, 220 restantes**. Aucun abonnement/achat effectué.
La clé temporaire a été supprimée du workspace et n’est ni dans Git ni dans
le ZIP ; la clé envoyée dans le chat doit être remplacée côté SerpApi.

## Résultat final du pilote

| Mesure | Run final |
| --- | --- |
| Créateurs | 20 |
| Résultats trouvés, tous créateurs confondus | 1 925 |
| Candidates retenues pour téléchargement/décodage | 100 (5 par créateur) |
| Images téléchargées et analysées dans cette sélection finale | 33 |
| Propositions techniques | 6 |
| Images actuelles conservées par défaut | 14 |
| Identités certifiées automatiquement | 0 |
| Nouveaux portraits prêts à publier | 0 |

Propositions : **Mmorpg, TheViper, Jukeyz, Sologesang, AbbyCakes et arii**.
Ce sont des propositions de fichier/cadrage, pas six validations finales.
Exemples de limites visibles : texte au bord pour Mmorpg, bouche partiellement
masquée pour une candidate Jukeyz, source secondaire à examiner pour TheViper.
Une candidate arii provenant d’un article TikTok, sans contexte Twitch, a été
écartée pour risque d’homonyme ; la proposition finale vient d’un clip Twitch.
La même image 2lew dans un autre encodage/résolution a été écartée.

Le ratio **6/20** ne justifie pas une publication aveugle sur 697 noms. Le pilote
réduit le travail de revue des propositions, mais ne résout pas encore la
recherche des quatorze cas restant sur leur avatar. Les sources indiquées ne
suffisent pas à confirmer les droits de réutilisation.

## Traitement et garanties

MediaPipe **1.1.0**, modèle **BlazeFace short range**, traitement CPU ; Pillow
12.3.0, NumPy 2.5.4, OpenCV 5.0.0. Le SHA-256 du modèle est
`b4578f35940bf5a1a655214a1cce5cab13eba73c1297cd78e1a04c2380b0152f`.
La détection repère un visage, pas une identité. Aucun visage généré, aucune
photo agrandie. Cadrage jusqu’à 900 px, sans dépasser le détail réellement
présent ; cadrages <450 px non proposés. Les noms concordants, tailles annoncées,
faces uniques et doublons aident au tri, sans preuve de qualité esthétique.
L’indicateur de netteté est conservé comme diagnostic, sans seuil universel.

Téléchargements HTTPS bornés à 20 Mio, 20 secondes et quatre workers. Les échecs
sont enregistrés : pas de boucle de tentative face à un 403. Les retries réseau
et de recherches vides doivent être demandés explicitement. Modèle/interpréteur
et bibliothèques sont contrôlés avant la première recherche facturable.
Dans cet environnement Linux, `libGLESv2.so.2` manquait ; le paquet Debian
libgles2 1.6.0-1 a été extrait hors dépôt et utilisé uniquement pour ce processus.
Les refus des sites restent des refus, sans contournement de protection.

## Livrables

- `/workspace/artifacts/portrait-pilot/CreatorDeck-pilote-portraits.zip` :
  galerie autonome, images avant/après locales, manifeste et instructions.
  **56 fichiers, 2 632 181 octets**, intégrité ZIP vérifiée.
  SHA-256 `57b5540b14f22f4b739db096504df7951129ff8622022fbcbe15aeac05b044de`.
- `/workspace/artifacts/portrait-pilot/serpapi-run/` : recherches normalisées,
  originaux téléchargés, erreurs, manifestes et galerie.
- Captures de revue hors Git : `galerie-desktop.png`, `galerie-mobile.png`.
- [Mode d’emploi et commandes](../tools/portrait-pilot/README.md).

Extraire entièrement le ZIP, ouvrir `index.html` dans Edge/Chrome, filtrer
« Avec proposition technique », comparer les six propositions, garder/refuser,
puis **Exporter mes choix**. Le JSON reste un brouillon visuel à transmettre
avec le ZIP ; aucun patch publiable n’est créé tant que personne et sources ne
sont pas vérifiées. Les autres candidates et leurs rejets sont consultables.

## Vérifications

**7/7 tests Node** : protections des choix existants, normalisation sans clé,
homonymes, dimensions annoncées, confinement des sorties, galerie réelle avec
persistance/filtre/export et échappement du contenu tiers. **3/3 tests Python** :
URL locales/credentials refusées, cadrage au bord, même image redimensionnée.
ESLint ciblé et diff-check réussis. La galerie finale a été ouverte dans Chromium
aux largeurs 1 400 et 412 px : 20 créateurs, six propositions, images locales
chargées, export effectivement téléchargé, aucune erreur JavaScript relevée.
Le ZIP a été vérifié par Python zipfile et ses références d’images contrôlées.

Diff `34fdf0b2` → livrable : aucune modification de `src/`, `public/`, des
registres ou des dépendances du jeu. Aucun nouvel essai Android/téléphone
physique ; Windows physique non testé. Les tests Node du pilote sont ajoutés
au job navigateur GitHub existant ; aucune exécution SerpApi payante en CI.
La suite Python et le modèle ne sont pas installés par la CI : validation locale
du worker annoncée distinctement. Publication des outils sur main après contrôle
du HEAD distant ; état de sa nouvelle CI à relever après push.
