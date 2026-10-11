# Décisions CreatorDeck

Ce registre est autonome, mais ne remplace pas le code ni les décisions
détaillées existantes. Ajouter des entrées datées ; marquer une décision
remplacée plutôt que l'effacer. Une proposition en attente n'est pas adoptée.

| ID / date | Décision et contexte | Justification / conséquences / preuve |
|---|---|---|
| D-036 / 2026-10-11 | Séparer politique des fichiers et plan issu de l'historique réel pour K-034. | Demande ciblée et publication main autorisée. Le baseline prouve les empreintes, pas les migrations en attente ; approbation exigée uniquement pour manual à appliquer. Modes/versions contrôlés même si enregistrés. Cible/TLS/historique/contrôles finaux conservés, aucun SQL ni K-031 modifié. 28/28 tests locaux ; log automatique 38140833700 désormais lu et refus manual confirmé. Code ee10a6d, CI 38142506934 quatre jobs verts ; automatique 38142681999 success, log base à jour vérifiée sans SQL de migration. |
| D-035 / 2026-10-11 | Transférer dans un nouvel environnement choisi par Malik et documenter K-034 avant reprise. | Bouton Edit inutilisable signalé, cause non déterminée ; outils de brouillon sans outil d’activation. Réseau initial conseillé avec domaine exact des logs, accès à tester. K-034 non corrigé ; 0047 déjà appliquée ne doit pas être rejouée. Risque accepté pour application passée uniquement. |
| D-034 / 2026-10-11 | Isoler le CLI de migration des réglages locaux et vérifier l’historique/objets après application. | Erreur invalid keys fournie par Malik : CLI 2.39.2 incompatible avec config locale récente, avant SQL. Workdir temporaire et mêmes SQL contrôlés, sans rétrograder config locale ni changer SQL/droits/cible/TLS. Lecture post-CLI obligatoire, échec si version/objet 0047 absent. Test binaire officiel de compatibilité, 24/24 tests locaux. Correctif 5832b5d, CI 38140313000 verte, application autorisée sans sauvegarde 38140515537 success avec vérification des versions/objets ; contrôle final 38140562490 success. Téléphone réel à tester. |
| D-033 / 2026-10-11 | Exécuter les scénarios cadeau et sablier dans le job cloud simulé, puis appliquer uniquement 0047 après CI verte et dry-run. | Reprise demandée par Malik (« Fais tout ça »). Échecs sans cloud reproduits, assertions conservées ; configuration publique chargée comme Next dev. Malik confirme l’absence de sauvegarde gratuite et accepte explicitement le risque de perte ; cette acceptation remplace le blocage sauvegarde, sans prétendre disposer d’une récupération. Cible du script : CreatorDeck yzxchpybqrfegvecihxf. Aucune application avant contrôles ; aucun reset/historique 0001–0046 rejoué. |
| D-032 / 2026-10-11 | Raccorder la dépense des sabliers au serveur sans migration globale de leurs récompenses ni XP/niveau. | Malik autorise le correctif après diagnostic K-030. 0047 manual : gains synchronisés, débit/recharge atomiques, UUID rejouable conservé par compte et compteur protégé contre les anciennes sauvegardes. Les gains restent calculés localement, leur provenance n’est pas certifiée par ce RPC. Sources/montants/taux conservés et moteur hors cloud maintenu. K-031 découvert par les tests : remplacement global refusé par auto-review ; helper correct limité aux sabliers retenu. Code aded8ff ; 1117 unitaires, 83 DOM, 643 SQL, E2E 2/2 et contrôles statiques/build réussis localement. Activation SQL réelle et téléphone encore à vérifier. |
| D-031 / 2026-10-11 | Une ouverture Live côté serveur doit préserver les compteurs de mission calculés localement. | `open_pack()` reste l'autorité pour cartes/réserve et le Paquet Scène reste exclu de la mission « Ouvre un booster ». Le JSON serveur ne contenant pas ces missions locales, le client reprend uniquement `missionDay`/`missions` de son état calculé après tirage. Test `cloud-store.test.ts` 135/135, typecheck/ESLint ciblé réussis. Correctif publié sur main, bd97f71 ; aucune règle de mission/SQL changée. Les sabliers restent locaux et ne modifient pas la réserve serveur conformément au périmètre. |
| D-001 / 2026-10-10 | Quatre documents de coordination + AGENTS communs à Codex Cloud, PC et ChatGPT | Demande utilisateur de continuité sans conversation ni quota ; mêmes règles pour tous, checkpoints réguliers, code/tests comme preuves. Le quota n'est pas observable de façon fiable. |
| D-002 / 2026-10-10 | Documenter sur design, maintenir la base réelle de PR #8 | Git/page de PR : design `4955d9b`, base arena, main ancien. Aucun merge/main autorisé ; cette mission ne change pas le jeu. |
| D-003 / 2026-10-10 | Un écrivain par branche, relecture distante avant chaque checkpoint/push | Préserver les travaux alternés et éviter l'écrasement ; passation indicative, aucun faux verrou technique. Push normal, fichiers ajoutés explicitement. |
| D-004 / 2026-10-10 | Garder les historiques et séparer implémentation, validation et déploiement | La roadmap et les compteurs antérieurs ont vieilli ; leur contexte reste utile. Les runs actuels sont dans la passation, avec limites et SHA. |
| D-005 / 2026-10-10 | SHA du code audité explicite ; commit du document retrouvé dans Git | Un fichier ne peut contenir le hash du commit qui le contient. `git log -1 --format=%H -- docs/agent-handoff.md` retrouve le checkpoint documentaire sans SHA fictif. |
| D-006 / 2026-10-10 | Audit documentaire seulement : documenter K-007 sans changer le jeu ou son banc ici | La coordination est l'objet de la mission. Le test SQL dépend de la date réelle ; la prochaine tâche ciblée doit le rendre déterministe, sans masquer l'échec ni changer la règle arène. |
| D-007 / 2026-10-10 | Garder la lecture du lock dans `dev:setup` | Désactiver `package_lock` a fait dériver Next/Playwright ; correction par `npm ci` puis setup normal, versions comparées et contrôles rejoués. E2E et production non exécutés restent non validés. |
| D-008 / 2026-10-10 | Scénarios de draft fermés/ouverts imposés seulement dans la base SQL jetable | Reprise autorisée par l’utilisateur après la mission documentaire (D-006 achevée). Supprime la dépendance au jour réel ; garde les dates explicites pour la règle calendaire, la vraie RPC pour les parcours et la restauration exacte en `finally`. Aucun changement du jeu ou de migration. Contre-épreuve : suppression temporaire de la garde dans une copie externe, jamais dans les fichiers produit. |
| D-009 / 2026-10-10 | Capturer la cible du focus avant la désactivation du bouton et la conserver entre déchirure et révélation | K-010 reproduit dans Chromium : désactiver le bouton avant la capture tardive fait perdre le déclencheur. Cible en état React, transmise aux deux scènes, hook avec cible optionnelle ; même capture Live/Scène et focus OBS toujours désactivé. Pas de temporisation ni sélection du bouton par son texte. E2E existant inchangé : 2 échecs avant, 2 réussites après, écrans 9/9, typecheck/lint ciblé réussis. Correctif `4b9fcca`. |

| D-010 / 2026-10-10 | Visite Chromium locale pour avancer sur VIS-01, puis validation humaine sur téléphone réel | Choix explicite de l’utilisateur après blocage du preview protégé. Même code produit que le preview `2d933c9`, HEAD documentaire `66b78d5`. Visites, captures et gestes simulés prouvent les comportements observés ; elles ne prouvent ni l’accès au déploiement, ni la fluidité, le son ou l’haptique d’un vrai téléphone. Pas de changement d’hébergeur ou de recréation d’environnement. |

| D-011 / 2026-10-10 | Après consommation Scène, retour clavier au titre de sa section si le déclencheur ne reçoit plus le focus | Cible explicitement marquée, tabIndex=-1 : contexte conservé sans nouvel arrêt Tab ni réactivation du paquet consommé. Live continue de rendre le focus au bouton disponible. K-011 reproduit avant correction (2/2 échecs), puis Scène/Live bureau/téléphone 4/4 réussis ; code `d87b72c`. |

## Décisions héritées, retrouvées dans le dépôt

Les dates ci-dessous sont celles des sources/commits, pas des décisions
inventées par cet audit. Consulter les liens avant de réouvrir un sujet.

| ID / date source | Décision | Justification / source |
|---|---|---|
| H-001 / 2026-10-07 à 09 | Jeu en ligne ; tirage, points, jetons tenus par serveur ; dev sans cloud autorisé | Intégrité des échanges/classements. Règles miroir TS/SQL. Pas de repli silencieux en client cloud. [Périmètre](perimetre.md), [revue](revue-externe-2026-10.md), migrations `0019` à `0035`. |
| H-002 / 2026-10-08 | Quatre piliers Drop/Binder/Craft/Toi ; simulation de streameur retirée de l'interface | Direction produit, pas une dette à réactiver. Moteur et migrations conservés. [Ta chaîne](ta-chaine.md), [journal](historique-livraisons.md), roadmap historique. |
| H-003 / 2026-10-08 | Déplacements et navigation silencieux ; sons réservés aux actions | Préférence joueur et fatigue sonore. Interrupteur/volume existants ; [sons](assets-sonores.md) et tests d'écran/son. |
| H-004 / 2026-10-07 à 09 | Pas de Server Actions, secret de service dans l'APK, refonte relationnelle ou promesse 100 % en ligne | Export statique, transport Capacitor/web et intégrité. i18n/analytics différés, découpage dynamique mesuré puis refusé. [Périmètre](perimetre.md), [revue § 3](revue-externe-2026-10.md). |
| H-005 / 2026-10-09 | Sachet en image imprimée ; WebGL et slider retirés | Visibilité garantie et geste tactile de soudure ; les expériences WebGL précédentes ne représentent plus la direction active. Commits `135376c`, `27965c7`, `beadb63` ; `pack-tear.tsx`, images foil Live/Scène. |
| H-006 / 2026-10-09 | Microphone de diffusion gravé plutôt que chevron rejeté | Identité visuelle imprimée du paquet. Commits `57fafef`, `6996172`, images `public/packs/`. Ne pas réintroduire le motif refusé. |
| H-007 / 2026-10-09 | Fallback DIVERRON honnêtement nommé | Ne pas présenter le visuel de remplacement comme un portrait officiel ; commits `799a533`, `25970c1`, `diverron-fallback.svg`. |
| H-008 / 2026-10-10 | Ouverture et révélation dans une scène cinématique continue | Éviter une rupture de scène entre geste, cinq dos et faces ; commit `4955d9b`, CSS `booster-continuity.css`. L'implémentation est présente ; le verdict visuel humain reste à obtenir. |

## D-012 — 10 octobre 2026 : sachet compact et ouverture au toucher

Demande explicite du joueur après capture mobile et vidéos Pokémon TCG Pocket :
réduire le sachet de l'écran noir et atteindre sa soudure à une main ; rendre
l'appui sur le sachet accueil effectif. Le sachet est désormais un bouton,
avec tirage vers le haut conservé et exclusion du clic après glissement.
Cette demande remplace pour l'appui immobile la préférence historique qui
exigeait un tirage ; la règle pure `pullVerdict` ne change pas et les gestes
retirés n'ouvrent rien. Le bouton sous la réserve reste disponible.

Le paquet a une taille indépendante des cartes, sa soudure est placée près du
milieu de l'écran, le tracé fonctionne dans les deux sens avec un seuil relatif.
Les dos rejoignent la taille/position de révélation pendant l'extraction.
Aucune reproduction d'assets Pokémon, refonte générale, règle de tirage ou
économie modifiée. L'ancien sachet presque plein écran est rejeté par le joueur.
Code `0beb6b37027ced0630ed828604754aed17f7ffb7` ; E2E ciblés 20/20, tactile simulé 4/4,
TypeScript/lint code 0. Approbation et ergonomie sur appareil réel encore ouvertes.

## D-013 — 10 octobre 2026 : petits viviers du Paquet Scène

Décision explicite du joueur : cinq créateurs différents d'une famille, jamais
Légendaires ; Scène pleine conserve 0,3 %, utilise cinq Épiques si possible,
sinon tous les Épiques disponibles et complète avec les raretés autorisées.
La garantie Rare/Épique reste au cinquième emplacement. Les tirages ordinaires
réservent le dernier candidat de cette garantie. Une famille avec moins de
cinq candidats non légendaires ou sans Rare/Épique est incompatible : exclue
du ciblage automatique et refusée explicitement par le moteur de tirage.

La décision corrige une impossibilité du moteur, sans changer de poids nominal,
récompense, coût ou seuil. Régressions synthétiques de 0 à 6 Épiques, garantie
unique Rare/Épique, épuisement ordinaire et frontière 3/1000 ; preuves et
limites du chemin Supabase dans [l'audit](audit-progression.md). Aucun déploiement.

L'audit utilise un RNG déterministe dans son seul processus, un fuseau imposé
et compare épargne / craft-et-jetons ; ne pas remplacer le RNG du jeu ni
conclure à un rééquilibrage sur ces seuls horaires et stratégies.

## D-014 — 10 octobre 2026 : parité SQL du Paquet Scène

Ajouter la migration additive `0043_scene_pack_eligibilite.sql` au lieu de
modifier `0016_sortants.sql`, déjà publié. Le serveur garde les poids déclarés
et le seuil 3/1000, exclut les Légendaires, sert les Épiques disponibles lors
de Scène pleine et réserve un candidat distinct pour le dernier slot. Une
famille de moins de cinq créateurs non légendaires ou sans Rare/Épique est
refusée. Le vérifieur exercera les cinq familles réelles à peu d’Épiques, les
deux branches déterministes et l’acceptation par `open_scene_pack()` sur une
base reconstruite. Aucun déploiement n’est autorisé par cette décision.

Preuve actuelle : tests Vitest ciblés 35/35, TypeScript et syntaxe Node OK.
`npm run supabase:verify` n’a pas pu démarrer PostgreSQL sous le compte
Administrateur Windows ; **aucune migration ni aucun contrôle d’intégration
SQL n’a été exécuté**. La parité reste non validée jusqu’à un run PostgreSQL
jetable réussi (local non administrateur ou CI Linux).

## Questions ouvertes

L'appréciation du dos → face, du halo, de l'éclat, du Perfect et des limites de
sélection reste à valider au pouce. Les anciens timings du dossier d'atelier ne
doivent pas remplacer les constantes actuelles. Aucune décision de réintroduire
le simulateur, publier en magasin ou refondre l'application n'est prise ici.

## Format d'une nouvelle décision

ID, date (Europe/Paris), agent/opérateur, demande et contexte, options examinées,
décision et pourquoi, conséquences/réversibilité, preuves (fichier/commit/test),
statut adopté/proposé/remplacé et lien vers l'entrée qui remplace la décision.

## D-015 — 10 octobre 2026 : volume et poids de l’ouverture

La demande est de rapprocher la sensation de l’ouverture d’un objet foil manipulé,
en gardant la direction artistique bordeaux et les créateurs CreatorDeck. Le
chantier est CSS/SVG uniquement, sans WebGL ni dépendance nouvelle. L’objet suit
le doigt seulement si Reflets des cartes et le mouvement ne sont pas désactivés.
Les flaps plient, une lumière traverse la fente, cinq dos sortent sous une seconde,
puis RevealOverlay s’ouvre selon le relais déjà en place. Le Rare reçoit un halo
bordeaux et un punch distincts des Communes ; aucun flash blanc ne lui est ajouté.

La déchirure gagne un glissement de hauteur plus long. Le silence Épique (520 ms),
le verrou Perfect (2,6 s), le bang calé sur le début du flip et le relais de
1,9 s restent inchangés. Pas de changement d’économie, de taux, de récompense ou
de backend. Adopté à la demande utilisateur ; validations et limites actuelles
sont consignées dans [la passation](agent-handoff.md).

## D-016 — 10 octobre 2026 : première collection et boucle post-ouverture

Le retour joueur décrit le classeur vide et l’absence de conclusion après
l’ouverture comme deux ruptures de la boucle de collection. Le Binder ouvre
maintenant sur « Obtenues » ; quand aucune carte n’est encore possédée, il
remplace les compteurs à zéro et la pagination par une invitation à ouvrir un
booster et un accès volontaire au catalogue. Le catalogue reste disponible,
mais n’est plus le premier écran. Les pages du catalogue affichent au plus
12 cartes.

Après les cinq révélations, l’écran présente les cartes du paquet, le nombre de
nouvelles et un bouton « Rouvrir un booster » qui relance réellement le tirage
si la réserve Live le permet. Sinon, le bouton revient au Drop. L’overlay OBS
garde son flux existant ; les sons de révélation, verrous et minutages ne
changent pas.

Le son et les reflets sont déjà actifs par défaut lorsqu’aucun choix local
n’est enregistré. Un choix explicite « OFF » reste respecté ; les reflets
restent coupés par `prefers-reduced-motion` sauf choix explicite prévu par le
réglage, tandis que les animations lourdes suivent toujours le garde-fou de
mouvement réduit. Aucun choix stocké n’est écrasé automatiquement. Décision
adoptée à partir du retour joueur ; tests et état de validation sont consignés
dans [la passation](agent-handoff.md) et [la roadmap](roadmap.md).

## D-017 — 10 octobre 2026 : objectifs précoces, Craft et identité

Le retour joueur pointe les premiers jours comme la période où l’Atelier, les
menus de réglages et les objectifs trop nombreux peuvent noyer la collection.
Le pilier Craft reste accessible, mais avant 10 copies recyclables il montre
seulement la progression `N / 10` et un retour au Drop ; les listes de 1000
créateurs et de recyclage ne s’affichent pas. À partir de 10, l’Atelier existant
reprend sans changement de règles.

Drop met en évidence une mission quotidienne déjà définie dans le moteur et
ouvre le panneau d’objectifs existant. Toi place en tête une vitrine locale des
trois meilleures cartes possédées (rareté, puis variante), avec l’état actuel
de la série ; aucune donnée n’est publiée sans le parcours cloud existant. Les
missions, leur économie et les récompenses restent inchangées. Décision adoptée
sur le retour joueur ; critères et limites dans la passation et la roadmap.

## D-018 — 10 octobre 2026 : version visible liée au commit Git

Le joueur doit pouvoir distinguer un ancien build d’un build récent sans
deviner le comportement de la mise à jour automatique. Le profil affiche donc
un identifiant court dérivé du SHA Git embarqué : Vercel/GitHub transmettent le
SHA du commit pendant la compilation, et le checkout local sert de repli pour
les builds locaux/Android. Aucun numéro n’est incrémenté à la main ; un build
sans dépôt Git affiche « locale ». Le SHA complet reste disponible dans
l’infobulle et aucun secret n’est exposé. La preuve de compilation et l’état de
publication sont consignés dans la passation.


## D-019 — 11 octobre 2026 : reset global, tutoriel et cadeau de reprise

À la demande explicite de Malik, réinitialiser une seule fois la progression de tous les comptes, y compris le sien, pour le lancement du tutoriel. Préserver comptes, identités, profils, amis et historique des ventes/échanges terminés ; annuler les échanges en cours et retirer les annonces actives. Effacer collections, réserves/journaux de tirage, monnaies/ressources, missions/série, Paquet Scène et progression d’arène. Chaque compte pourra réclamer **cinq boosters** une fois, uniquement après le tutoriel ; le texte de cadeau attribue la décision à Malik. Le stock cadeau reste distinct de la réserve normale et le tirage passe par le moteur serveur existant. Le récapitulatif d’ouverture se ferme sur « Retour au Drop », sans CTA de réouverture directe.

Les règles de tirage et les récompenses existantes ne changent pas. L’implémentation doit être additive et testée sur PostgreSQL jetable ; aucune migration de production n’est comprise dans le travail de code. Avant une application réelle, vérifier le projet cible, le schéma, une sauvegarde et la possibilité de récupération. Au checkpoint du 11 octobre, cette décision est adoptée mais **aucune ligne de code de cette demande n’est encore implémentée**. Le scope détaillé et les critères de validation figurent dans la [roadmap](roadmap.md) et la [passation](agent-handoff.md).


## D-020 — 10 octobre 2026 : tutoriel avant le cadeau de reprise

Le reset global est one-shot, via migration additive, et garde comptes, profils,
amis et historiques terminés ; il annule les échanges ouverts et retire les
annonces actives. Le tutoriel précède l'accès au cadeau. Une table de cinq
ouvertures cadeau est séparée de la réserve de boosters ordinaire ; chaque appel
sert cinq cartes au moyen des fonctions serveur de tirage courantes, puis la
réserve cadeau diminue d'un. Le cadeau ne change ni le barème ni la récompense
des tirages ordinaires et n'accorde pas d'XP/points/jetons. Le récapitulatif
retourne au Drop.

Preuve locale du commit `f97ea42` (docs de checkpoint à part): 1 109 tests projet, 73 tests
écrans, SQL jetable avec reset/données préservées/idempotence/ordre/claim unique
et cinq ouvertures, typecheck/lint/build webpack réussis. Le build Turbopack est
bloqué par l'interdiction de bind un port dans le Cloud. Production et téléphone
réel non vérifiés ; le reset réel est interdit sans projet cible, schéma et
sauvegarde récupérable explicitement vérifiés.


## D-021 — 11 octobre 2026 : accès et préparation du reset réel

Malik autorise le reset réel après publication du code, avec vérification maintenue
de la cible, du schéma et d'une sauvegarde récupérable. L'accès Cloud effectif
refuse Supabase en CONNECT 403 et n'a aucun identifiant de gestion prêt. Le
brouillon réseau/secret est sauvegardé mais non publié. La voie directe par le
tableau de bord Supabase sur téléphone permet de commencer les vérifications
sans déplacer de secrets ou contourner le proxy. Aucune écriture réelle exécutée.

Le helper cadeau est isolé pour éviter de remplacer `_save_add_pack_cards`,
utilisé par les boosters ordinaires. Les tests vérifient la conservation exacte
de ce helper et l'absence de droits clients sur le nouveau helper cadeau.
Validation locale : 1 109 tests projet et SQL jetable réussis.

## D-022 — 11 octobre 2026 : claim cadeau rejouable après la première ouverture

En production, le premier appui réclame les cinq boosters puis en ouvre un.
Le client appelait encore `claim_return_gift()` aux appuis suivants ; la base
refusait « déjà réclamé » alors que quatre boosters restaient. Le claim garde
une seule transition de stock, mais un appel répété renvoie un succès sans
ajouter de boosters. Le statut serveur expose `gift_claimed` à partir de
`claimed_at`, et l'interface transforme ensuite l'action en ouverture directe
d'un booster cadeau. Ainsi les anciennes versions du client passent aussi la
barrière serveur après application de la migration. Le tirage cadeau et ses
poids restent inchangés. Validation locale et statut de publication consignés
dans la passation ; la correction de schéma n'est pas encore appliquée.

| D-023 / 2026-10-11 | Une réinitialisation individuelle rejoue le tutoriel, tout en préservant le cadeau unique | Demande de Malik : rejouer la séquence depuis le bouton reset. 0046 efface la fin du tutoriel du seul compte authentifié ; le client retire ses deux marqueurs et revient au Drop. Le stock cadeau et le claim restent intacts : reset n'accorde pas cinq nouveaux boosters et ne touche pas les autres comptes. SQL jetable et UI simulée couvrent l'ordre tutoriel puis cadeau et les quatre ouvertures restantes ; validation téléphone/production séparée. |

| D-024 / 2026-10-11 | Automatiser les nouvelles migrations via GitHub Actions après CI verte sur main, avec CLI officiel Supabase | Demande explicite utilisateur. Secret PostgreSQL réservé au workflow, cible projet/TLS/historique vérifiés, anciennes migrations figées et jamais rejouées. Mode automatic déclaré après revue ; défaut absent refusé et mode manual nécessite lancement explicite. Historique SQL Editor à réconcilier seulement après preuves, aucun repair automatique. 14 tests locaux ; activation et accès réel non validés. Vercel indépendant et publication client doit rester compatible. |

| D-025 / 2026-10-11 | Les tests navigation/tirage commencent avec un joueur ayant terminé le tutoriel | Corriger la fixture après ajout du tutoriel, sans clic forcé ni suppression du tutoriel produit. RPC onboarding simulé renvoie un état valide ; assertions de cartes serveur, absence de push et persistance inchangées. Scénarios tutoriel séparés dans les tests d'écran. |

## D-026 — 11 octobre 2026 : diagnostic PostgreSQL sûr et rapide

Le log fourni après changement du mot de passe reste générique, car le script efface tous les codes du pilote. Classer les erreurs de connexion par messages fixes (authentification, DNS, TCP, TLS, pooler, timeout), jamais par impression de message/detail brut. Tests de non-divulgation et erreurs agrégées. La cause production ne peut pas être déduite rétroactivement du message masqué.

Le dry_run manuel sur main courant fait uniquement les lectures existantes et peut donc précéder la CI complète ; le CLI de migration n’est pas installé dans ce mode. Déploiement automatique et validation manual restent conditionnés à une CI verte et à la bonne révision. Choix motivé par les attentes inutiles du propriétaire ; pas de désactivation TLS, de migration, de changement de secret ni de politique réseau.

## D-027 — 11 octobre 2026 : autorité TLS Supabase explicite

Le nouveau log GitHub établit SELF_SIGNED_CERT_IN_CHAIN avant authentification. Accepter le certificat CA PEM officiel via SUPABASE_DB_CA_CERT, conservant rejectUnauthorized=true et verify-full. Le même certificat sert au contrôle pg et au CLI (sslrootcert privé temporaire, supprimé dans finally). Sans CA fournie, la confiance système actuelle reste utilisée ; aucun bypass TLS. La documentation officielle indique Database Settings → SSL Configuration → Download Certificate. Connexion réelle non validée tant que le certificat n’est pas configuré et le dry_run réussi.

## D-028 — 11 octobre 2026 : certificat CA public intégré au dépôt

Malik fournit le fichier prod-ca-2021.crt téléchargé du tableau de bord après SELF_SIGNED_CERT_IN_CHAIN. La CA publique est versionnée dans supabase/certificates et chargée par défaut via un chemin relatif au script, ce qui évite une manipulation de secret sur téléphone. SUPABASE_DB_CA_CERT reste un override optionnel. Empreinte et expiration vérifiées et testées ; même CA Node/CLI avec vérification TLS/hôte. Une signature CA valide ne prouve pas le succès d’une connexion réelle ; prochain contrôle dry_run requis. Aucun nouveau secret ou bypass TLS.

## D-029 — 11 octobre 2026 : le Drop comme table de collectionneur

Demande explicite de Malik : refaire l’accueil avec une âme, puis améliorer le
Binder pendant son absence. Direction : fond sombre chaud, lettres condensées,
sachet réel et ticket crème où ouvrir ; les objectifs et activités viennent
après. Les dernières cartes deviennent consultables et donnent accès au Binder.
On conserve les visuels, le moteur et les quatre piliers existants : pas de
dépendance ou d’image inventée, pas de refonte générale. Le ticket regroupe la
réserve, le prochain réapprovisionnement et les garanties ; jetons/sabliers se
déplient sans déplacer l’action principale au milieu de liens secondaires.

Le Binder invite à finir une page déjà commencée, calculée à partir des saisons
et des slugs réellement configurés. Seule la page la plus proche est visible
par défaut ; les suivantes se déplient. Son bouton filtre les vrais manquants.
« Dernières reçues » retrouve les cartes possédées et le classeur vide retourne
au Drop. Doublons, compteurs, tri, pagination de 12 cartes et règles restent
ceux du moteur. 999/1 000 vaut 99 %, sans faux accomplissement.

Choix écartés : tableau de bord de panneaux identiques, carrousel automatique,
nouvelles récompenses pour compléter une page. La mise en page privilégie les
cartes et une action d’ouverture. Fiche récente rendue dans un portail hors de
l’app-shell pour éviter les conteneurs transformés ; focus piégé, retour au
déclencheur et bouton retour utilisent les hooks existants.

Preuves et commandes finales dans la passation ; captures et Chromium local
ne remplacent pas une validation esthétique et tactile sur téléphone réel.

## D-030 — 11 octobre 2026 : ne pas masquer l’action suivante du cadeau

Le scénario E2E tutoriel + cinq boosters, repris depuis le brouillon de session,
a montré que le toast vert « Cadeau réclamé » reste au-dessus du bouton
« Ouvrir un booster cadeau » après la révélation. Il répète le message/la quantité
que la boîte met déjà à jour et oblige à le fermer pour continuer. Retirer ce
toast de succès seulement ; conserver le message officiel du cadeau, le solde et
le toast des autres notifications. Aucun RPC/serveur/règle de jeu modifié.
Parcours Playwright avec RPC interceptées : 2/2 bureau et téléphone simulé,
réserve ordinaire intacte ; voir le checkpoint pour les autres contrôles.

## D-037 — 11 octobre 2026 : sablier visible et booster bonus 5/4

Après le retour de Malik sur l’écran Drop, le sablier ne doit plus être caché
dans un détail replié ni désactivé uniquement parce que la réserve ordinaire
est pleine. Le bouton est visible sous l’action d’ouverture ; garanties,
compteur légendaire et texte « réserve pleine » redondant sont retirés de cette
carte ; les jetons restent consultables dans une section repliée distincte.

Règle choisie par Malik : à 4/4, dépenser un sablier crée un booster bonus à
5/4. Un seul dépassement est admis ; un second sablier attend l’ouverture du
bonus. L’ouverture ramène à 4/4 et reprend la recharge ordinaire. Le moteur
local, la sauvegarde et le RPC restent alignés dans 0048. Celle-ci est `manual`.
Base jetable jusqu’à 0048, tests ciblés et CI sont décrits dans la passation.
Après l’autorisation permanente de Malik, le run manuel 38146774310 a appliqué
0048 seule ; cible CreatorDeck, TLS, historique et vérification après
application ont réussi. Le rendu réel sur téléphone et la version effectivement
servie restent à constater avant de qualifier l’expérience de livrée.

## D-038 — 11 octobre 2026 : autorisation permanente de publier les changements demandés

Malik demande de ne plus être interrompu pour redonner son accord aux commits
ciblés et pushes normaux sur `main` correspondant à ses demandes de code ou de
documentation, ni aux migrations Supabase nécessaires en production après CI
automatique verte. `AGENTS.md` porte cette autorisation permanente, pour réduire
les allers-retours ; les résultats et contrôles GitHub restent à observer et à
consigner après chaque publication/opération.

Cette autorisation ne vaut pas pour force-push, réécriture d’historique,
suppression de branche, fusion de PR ni modification destructrice des données.
Les migrations classées `manual` exigent le paramètre `approve_manual` et une CI
automatique verte ; cette autorisation permanente les couvre lorsqu’elles sont
nécessaires à la demande. La migration 0048 a été appliquée par 38146774310
après CI verte ; voir D-037. Restent hors autorisation : resets/réparations,
force-push, réécriture/suppression de branches et fusion de PR.


## D-039 — 11 octobre 2026 : audit produit P0/P1

Malik demande l’implémentation de son audit, en autorisant les changements de
périmètre produit concernés. Un pack tutoriel fixe permet d’essayer l’ouverture
avant compte ; ses cartes restent un aperçu, sans collection, récompense ni RPC.
La limite d’un essai par navigateur sert le parcours, pas une protection économique
(un stockage effacé permet de revoir un aperçu sans valeur). La connexion reste
nécessaire pour démarrer la collection serveur et accéder au cloud/social.
Les choix son/Reflets mémorisés sont conservés ; sans choix ils étaient déjà ON,
et les animations continuent de suivre prefers-reduced-motion et Reflets OFF.

Tribunal et objectif sont placés avant le sachet. Après un booster, l’objectif
priorise les cinq dossiers du Tribunal. Cette quatrième mission paie le même
sablier local que les missions existantes, une seule fois par journée ; les
points de la séance restent calculés et payés par le serveur. Aucun nouveau SQL
n’est nécessaire pour ce compteur JSON. Le bilan n’efface plus la cinquième
réaction, et le calcul d’annonce inclut désormais les cinq verdicts.

Taux/activités et Paquet Scène sont repliés. La vitrine de trois cartes, série,
faces CSS, flaps, cascade et hiérarchie de rareté déjà présentes sont conservées.
Ombre du sachet renforcée ; aucun WebGL ni modification des timings de silence,
Perfect et déchirure. Validation courante et limites dans la passation ; aucun
essai sur téléphone physique affirmé. P2 et K-031 restent hors de ce lot.

## D-040 — 11 octobre 2026 : séparer scroll de Drop et déchirure

Malik signale une ouverture involontaire en essayant de défiler. La zone entière
capturait le pointeur et le seuil vertical déclenchait l’ouverture. Décision :
retirer le tirage de l’accueil et autoriser le scroll/pincement natifs. Un appui
sur le sachet ou le CTA prépare la scène dédiée ; le clavier reste disponible.
Un mouvement de plus de 8 px ou pointercancel neutralise le clic tactile/souris
qui pourrait suivre sur le sachet. Aucun pointer capture ni preventDefault sur
Drop. Le geste de déchirure est conservé dans la scène, ses timings et Perfect
restent inchangés. Garder le tirage en réduisant sa zone a été écarté : cela
laisserait le même conflit lorsqu’un scroll commence sur le sachet. Preuves et
limites dans la passation ; validation physique du téléphone encore requise.

## D-041 — 11 octobre 2026 : petits objectifs de collection dans le Binder

Malik autorise à commencer par le Binder, avant Craft et identité du profil.
Les saisons existantes sont de grands objectifs ; les présenter en pages de
12 cartes maximum rend la prochaine étape atteignable et les manquantes lisibles.
Les vagues existantes sont regroupées par famille avant ce découpage d’affichage.
Le critère est le créateur unique possédé, indépendamment des copies/variantes.
Un créateur actuel appartient à une seule petite page ; les Sortants restent
consultables dans les vues existantes mais hors de ces objectifs actuels.

Une page commencée proche de la fin est suggérée ; un choix explicite prévaut
et est gardé sur cet appareil, par édition du catalogue. Il ne se synchronise
pas au compte et n’ajoute pas de champ à la sauvegarde. Les cartes affichées au
démarrage restent les Obtenues. Aucun gain ajouté, aucun palier de saison ni
règle serveur modifié ; ces pages sont des objectifs de collection visuels.
Le choix par jeu est écarté : les catégories changent, les familles par langue
existent déjà (seasons.ts). Preuves et limites dans la passation.

Malik demande aussi le mode économie : tests adaptés, documentation dans le
même commit, suites longues sur GitHub sans surveillance continue. L’agent
transmet des liens et des instructions compréhensibles ; état pending conservé
comme tel. Protections SQL/TLS/historique et autorisations existantes inchangées.

## D-042 — 11 octobre 2026 : rendre Craft compréhensible avant le seuil

Malik demande d’enchaîner sur Craft après le Binder. La progression existait,
mais le panneau ne montrait ni la future carte ni l’utilité des doublons.
Décision : conserver le seuil de dix copies recyclables et montrer trois aperçus
Standard manquants, coûts et écart au solde actuel, plus la valeur estimée du
recyclage groupé. Cette valeur suit duplicateGroups/unitValue existants et
exclut les Live, comme bulkRecyclableIds. La dernière copie reste protégée.

Priorité aux cartes artisanables de la collection Binder choisie, puis aux
moins coûteuses ; sans choix, réutiliser la suggestion de page commencée. Une
page déjà réunie ou sans manquante artisanable ne promet pas un achat ciblé :
le texte annonce les autres idées. Les aperçus montrent le résultat Standard,
ne sont pas des cartes possédées et ne déclenchent aucune dépense. Au-dessus
du seuil les actions existantes sont conservées. Aucun taux, coût, gain ou SQL
modifié. Accès Binder ajouté pour choisir la collection ; moteur/cloud inchangés.
Validation DOM/navigateur ciblée dans la passation, pas de validation physique.

## D-043 — 11 octobre 2026 : Scène doit refléter le serveur avant ouverture

Malik signale faux état disponible, déchirure fugace, refus répété et mise à
l’écart du paquet. Le statut RPC existe déjà, mais ses champs Scène étaient
ignorés. Décision : statut dédié au compte/jour, inconnu pendant vérification
ou panne, adoption du jour serveur en lecture et nouvelle vérification avant
toute déchirure. Réponses anciennes ignorées ; succès/refus déjà ouvert ferment
le bouton. Le refus normal devient une notice lisible. Aucun SQL ajouté, aucune
réinitialisation pour rendre un paquet disponible. Les protections serveur et
la règle un paquet par jour restent intactes. Section visible après Live et avant
les activités secondaires, rôle de complétion expliqué, aucun timing reveal changé.

## D-044 — 11 octobre 2026 : profil de collectionneur avec les données existantes

Pseudo et trois cartes sont au premier plan. Les cartes épinglées dans l’éditeur
public existant sont prioritaires si possédées, les meilleures cartes complètent
la vitrine ; le profil public conserve ses quatre emplacements. L’accès à la
personnalisation ouvre Compte. Pages réunies et Légendaires uniques sont calculées
sur la collection réelle, pas des récompenses nouvelles. Collection Binder
mémorisée/suggérée et série existante restent visibles ; état vide avec accès Drop.
Version technique descend près des crédits et menus sous l’identité. Pas de
nouvelle préférence concurrente avec la vitrine publique, pas de migration.
Preuves et limites dans la passation, suites GitHub en suivi selon mode économie.
