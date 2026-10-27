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

`/audio-lab` demeure exclu de l'export. La page statique **/audio-ecoute.html**
fournit la comparaison publiée : six lecteurs natifs, une seule musique à la
fois, volume commun, arrêt et arrêt au passage en arrière-plan. Le laboratoire
local réutilise les mêmes prises préparées que le moteur.

## Validation et limites

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
Le connecteur Vercel refuse la liste des déploiements avec HTTP 403 sur l'équipe
`hafsi37-2386` ; la CLI Vercel est absente. Les statuts GitHub et le site public
restent des moyens indépendants de vérification, sans modifier la configuration.
Aucune écoute humaine finale ni validation sur haut-parleur de téléphone
n'est revendiquée ; aucune APK locale n'est construite.
