# Chantier audio — 27 octobre 2026

Demande explicite de Malik : reprendre le chantier audio complet, remplaçant le
report du 26 octobre. Suivi `CreatorDeck-Codex-4m4`, base `b3922daf` sur `main`.
Plafond cumulé : **14 000 crédits**, réserve minimale **24 764**, aucun achat,
aucune APK locale. Le choix musical final reste réservé à Malik.

## Génération et budget

**Bilan final : 42 appels réussis, 2 720 crédits constatés** (320 effets +
2 400 musique), **36 044 crédits restants**. Les 11 280 crédits non dépensés
du plafond restent disponibles, en plus de la réserve protégée de 24 764.
Tous les fichiers obtenus sont conservés ; aucune seconde passe n'est lancée.

Compte Starter actif, vérifié par GET abonnement avant la première génération :
38 764 crédits disponibles, 0 utilisés, dépassement facturé désactivé.
La clé est lue en privé depuis le `.env.local` de CreatorDeck-Codex ; aucun secret
dans les fichiers, le client ou les exports.

Le plan historique de 42 fichiers / 12 600 crédits n'était pas exécutable tel
quel : WAV 44,1 kHz réservé à Pro, effets inférieurs au minimum de 0,5 s,
`seed` incompatible avec le prompt musical. Les sons de navigation n'ont pas
besoin de nouvelles générations. Le nouveau plan conserve 42 fichiers utiles :
36 prises d'effets pour 19 gestes et 6 extraits de 32 s pour trois directions.
Modèles : `eleven_text_to_sound_v2`, `music_v2_5`. Acquisition MP3 44,1 kHz /128k.

Provision prudente **11 040 crédits** : 200 par effet (au moins 40/s),
1 200/min pour la musique. Ces provisions dépassent volontairement les coûts
constatés. Le tarif effectivement observé est **10 crédits/s pour les effets**
et **400 crédits pour un extrait musical de 32 s**. Le journal fait foi pour
chaque appel et pour le total final : [audio-generation-ledger.json](audio-generation-ledger.json).
L'en-tête `character-cost` et le compteur d'abonnement sont conservés séparément.
Le compteur musique est différé ; plusieurs rapprochements par GET ont été
nécessaires. Aucun POST n'a été répété. Un HTTP 429 de lecture du solde a
interrompu une passe, reprise uniquement sur les fichiers absents.

Le générateur persiste un état incertain **avant** chaque POST et refuse toute
reprise tant que cet état n'est pas rapproché. Il calcule le budget cumulé depuis
le départ, protège la réserve même si le compteur tarde, et refuse un dépassement
facturé activé. Les permissions SFX et musique ont été exercées avec succès.

Références API vérifiées le 27 octobre :
[effets](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert),
[musique](https://elevenlabs.io/docs/api-reference/music/compose),
[prix](https://elevenlabs.io/pricing).
Les pages de prix distinguent site et API et affichent des unités différentes :
les provisions ne sont pas présentées comme un tarif contractuel.

## Intégration et traitement

Le moteur Web Audio existant reste propriétaire du mixage et des préférences.
Les événements actifs jouent des prises acoustiques ; les anciens plans de
synthèse restent en réserve pour compatibilité, sans appel depuis ces gestes.
Deux prises alternent lorsqu'elles existent. Le motif légendaire n'est plus
doublé par son stinger ; le Perfect joue une seule signature. Déchirure au
déclenchement, extraction une seule fois à la fin du mouvement partagé.
Fabrication, recyclage et refus suivent le résultat réel de l'Atelier.

Le traitement local conserve les MP3 sources d'effets. Les masters musicaux
originaux sont sous `reports/audio/raw/`. Les WAV de lecture sont mono PCM16
44,1 kHz avec en-tête canonique : filtrage 65 Hz–10 kHz, compression des
transitoires, retrait des silences de bord et fondus de 1/8 ms. Le gain reste
mesuré par la table existante, avec une crête de lecture plafonnée à -6 dBFS.
Le traitement musical normalise les extraits après downmix et encodage, puis
croise fin et début sur 0,6 s. MP3 mono 96k. Mesures réelles :
[audio-measurements.json](audio-measurements.json).

L'arrière-plan coupe les bus et arrête les effets en cours ; le retour conserve
la boucle musicale et les choix mémorisés. Le premier geste reste nécessaire
pour déverrouiller l'audio. Son et Musique restent indépendants ; navigation,
réglages et filtres ne déclenchent aucun son.

## Écoute musicale

La piste du hub n'est pas remplacée. A : Clairière d'aventure ; B : Comptoir des
voyageurs ; C : Cartes sous les étoiles. Deux arrangements par direction,
instrumentaux et originaux, sans nom d'artiste ni imitation de thème.
Les références `snow_day` et `springly_sprigs` restent la direction générale ;
les anciennes propositions refusées ne sont pas remises en sélection.

L'export `out/` retire `/audio-lab`. En revanche, le déploiement Next.js de
Vercel sert aussi cette route depuis ses sorties de framework : constat réel
du 28 octobre, sans modification de sa configuration. L'écoute conseillée est
**[https://creator-deckk.vercel.app/audio-ecoute](https://creator-deckk.vercel.app/audio-ecoute)**,
sans extension ; `/audio-ecoute.html` répond 404 sur Vercel. Le fichier `.html`
reste utilisable hors ligne dans le ZIP. La comparaison publiée propose
six lecteurs natifs, une seule musique à la
fois, volume commun, arrêt et arrêt au passage en arrière-plan. Le laboratoire
local réutilise les mêmes prises préparées que le moteur.

## Validation et limites

### Reprise et contrôles du 28 octobre

Vercel Production `READY`, SHA `e82d97df8f4ec52e628a42cb14d4d3101388e81d`,
déploiement `dpl_3cT1vCPnNRwhdWSTVq1iCWe8ZWQN`, alias du site confirmé.
L'accès natif par hostname fonctionne à la reprise ; le refus 403 observé
la veille concernait la requête de liste avec l'équipe explicitée.

Sur le site publié, Playwright Chromium en viewport 375×812 a lu les six MP3
réels (31,426 s chacun), vérifié l'absence de superposition, joué le passage
de fin de boucle, arrêté tous les lecteurs et décodé les 36 WAV mono.
Aucun débordement horizontal ; capture examinée dans
`reports/audio-ecoute-vercel-2026-10-28.png`. Cette preuve concerne le navigateur,
pas l'écoute acoustique d'un téléphone physique.

La CI initiale `40520674349` du code `87716db9` a réussi les 1 221 unitaires,
les trois shards E2E, le chemin cloud simulé et les migrations jetables.
Elle a échoué sur deux assertions d'écrans restées sur l'ancienne version :
anciens noms des directions musicales et compteur d'oscillateurs du Tribunal.
Les assertions vérifient maintenant les noms livrés, la disponibilité des six
candidates, une seule prise par verdict et le silence quand les effets sont
coupés, après préchargement comme dans l'application. **Suite écrans complète :
267/267**, 40 fichiers, le 28 octobre. Aucun code joueur ni asset n'est modifié
par cette correction de tests. Les bilans ci-dessous restent ceux du 27 octobre.

Compte relu le 28 octobre : Starter actif, **2 720 crédits utilisés, 36 044
restants, dépassement facturé 0**. Aucun nouvel appel de génération.

La correction des tests est publiée dans `629a293aa7974a1220276e8e5824722d993fd7b7`.
Vercel Production `READY` confirmé sur ce même SHA, déploiement
`dpl_8CpeLci5inBwmZ3xgtFMS6Hm5DzM` et alias principal.
[CI 40617029314](https://github.com/GoodFight37/CreatorDeck/actions/runs/40617029314) :
qualité complète (unitaires, écrans, statique, build) réussie et SQL jetable réussi ;
E2E/cloud simulé encore en cours au relevé. Leurs résultats restent distincts
des trois shards verts du premier commit et de la suite locale 231/49 ignorés.

ZIP final `CreatorDeck-audio-final-2026-10-28.zip` : **120 fichiers**, 13 409 129
octets, source et tests `629a293`, patch depuis `b3922daf`, six masters musicaux,
assets et écoute HTML hors ligne. Intégrité ZIP, absence de doublons et de secret
vérifiées. SHA-256 :
`7cc6505502dd0ad37ced63d102ab64b353bb58411a010a50290722f1e986821b`.
Le choix musical reste suivi dans `CreatorDeck-Codex-brl` ; aucune candidate
n'est adoptée automatiquement.

Validation locale sur base `b3922daf` avec le diff audio :

- `node --test scripts/elevenlabs-generate.test.mjs scripts/prepare-audio.test.mjs` :
  **5/5** ; plafond cumulé, réserve, arrêt des reprises incertaines, payloads et
  traitement PCM (silence, crête et extrémités).
- `npm test -- src/lib/sfx.test.ts src/lib/audio-briefs.test.ts src/lib/release-notes.test.ts` :
  **37/37**, fichiers réels, gains, formats, préférences, boucle et arrière-plan.
- `npm run ecrans -- src/ecrans-effets.test.tsx src/ecrans-meme-booster.test.tsx` :
  **41/41** ; `npm run ecrans -- src/ecrans-atelier-transaction.test.tsx` : **9/9**.
- `npm run typecheck` : réussi. Next 16.4.2 et Vitest 3.2.7 installés correspondent
  aux versions verrouillées. Aucune dépendance ajoutée.
- `npm run lint -- --ignore-pattern android/**/build/** --ignore-pattern reports/** --ignore-pattern android/app/src/main/assets/public/**` :
  réussi ; seuls les rapports et fichiers Android générés sont exclus.
- `npm test` général : échec du test jargon sur un prototype Kyara **non suivi**
  et préexistant (`src/app/kyara-preview/kyara-preview.tsx:105`, mot « serveur »).
  Le prototype est préservé. Le même analyseur `offenses` appliqué aux **167
  fichiers suivis** des quatre dossiers du scanner trouve **zéro infraction**.
  Une tentative générale supplémentaire a dépassé la limite de 60 s de
  context-mode ; elle n'est pas présentée comme réussie.
- `npm run e2e -- e2e/audio-premium.spec.ts --workers=2` : **4/4**, bureau et
  viewport téléphone, décodage réel des six MP3, un lecteur à la fois,
  déchirure/extraction/révélation, aucune source oscillateur ni seconde boucle.
- `npm run build` : réussi ; présence de `out/audio-ecoute.html` et des six
  candidates vérifiée séparément, `/audio-lab` retiré après export.

Suite complète `npm run e2e -- --workers=2` avec configuration locale sans cloud :
**231 réussis, 49 ignorés, aucun échec**, 13,2 minutes (280 scénarios prévus).
Les scénarios cloud ignorés ne sont pas présentés comme réussis. Les quatre
scénarios audio ont aussi passé avec la configuration initiale du navigateur.
Les mesures ne constituent pas une validation auditive.

Point d'arrêt demandé par Malik pour éteindre le PC : code et assets prêts,
publication et contrôles distants à reprendre selon l'état du checkpoint.
Code poussé et distant vérifié : `87716db96572447f7020e43a6e9a47263f042576`.
ZIP local vérifié : 117 fichiers, 13 395 624 octets, sans clé ni `.env`.
La CI et le déploiement ne sont pas encore annoncés réussis.
Le connecteur Vercel refuse la liste des déploiements avec HTTP 403 sur l'équipe
`hafsi37-2386` ; la CLI Vercel est absente. Les statuts GitHub et le site public
restent des moyens indépendants de vérification, sans modifier la configuration.
Aucune écoute humaine finale ni validation sur haut-parleur de téléphone
n'est revendiquée ; aucune APK locale n'est construite.
