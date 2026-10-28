# Direction musicale D1 — 28 octobre 2026

Malik refuse la direction des six premières candidates : A trop répétitif,
B hors thème ; aucune candidate retenue. Référence prioritaire fournie :
[Library Menu BGM](https://www.youtube.com/watch?v=Dk6zeLwsO68).
Suivi `CreatorDeck-Codex-brl`. Le volume du lecteur de recherche est coupé ;
le son des haut-parleurs de Malik n'est pas une entrée d'analyse de l'agent.

## Analyse effectivement réalisée

Les outils connectés ne proposent pas d'analyse musicale directe. La recherche
de plugins n'a pas trouvé de solution plus pertinente que des outils audio
publics. La démo officielle [Music Flamingo de NVIDIA](https://research.nvidia.com/labs/adlr/MF/)
est accessible ; l'import du lien YouTube y échoue avec une connexion SOCKS
refusée. Une tentative de capture silencieuse du lecteur n'a pas abouti.

Une copie MP3 de **My Cards**, piste 18 de la même OST, est disponible sur
[la page de la piste](https://downloads.khinsider.com/game-soundtracks/album/pok-mon-trading-card-game-pocket-gamerip-2024/18.%2520My%2520Cards.mp3).
Elle dure 84,190 s ; le lecteur YouTube Library affiche 84,241 s. Nom du menu et
durées sont cohérents, mais aucune comparaison d'empreintes n'a établi qu'il
s'agit strictement du même enregistrement. C'est le fichier My Cards qui a été
analysé, pas le flux YouTube exact. Il reste dans `reports/audio/`, hors client,
hors commit et hors archive de livraison ; aucun audio Pokémon n'est intégré.

Deux analyses directes ont été exécutées : **Music Flamingo** sur le fichier et
un extrait de 25 s, puis **LP-MusicCaps** sur ce même extrait. Elles convergent
sur un instrumental électronique : timbres de synthé/clavier, nappes, basse,
percussion électronique et tempo modéré. Les mentions précises de chiptune,
de piano ou de sous-genre restent des estimations du modèle. Les sections
au-delà de 90 s inventées dans le premier rapport Flamingo sont rejetées.
Les qualificatifs automatiques de qualité d'enregistrement ne sont pas retenus.

Une mesure indépendante de flux spectral/autocorrélation (FFmpeg + NumPy)
donne deux candidats proches en score : 109,96 et 73,83 BPM. Aucun tempo exact,
tonalité ou accord n'est présenté comme certain. **110 BPM** est un choix de
production pour l'essai D1. Ces analyses sont des outils imparfaits, pas une
écoute humaine ni une garantie que Malik aimera le résultat.

## Candidate originale D1

Brief exécutable : [audio-pocket-brief.json](../src/data/audio-pocket-brief.json).
Une seule candidate, 90 s demandées, mélodie sur des phrases plus longues,
développement et passage contrasté, claviers et synthés doux, basse arrondie,
groove électronique discret. Aucune reprise de mélodie ou de motif Pokémon,
aucun enregistrement de référence transmis à ElevenLabs. La piste actuelle du
jeu et les six anciennes candidates sont conservées.

Acquisition `music_v2_5`, instrumental, MP3 44,1 kHz/128k. Même journal et garde
de budget que la première passe. Provision **1 800 crédits**, coût observé
**1 125**, cumul chantier **3 845/14 000**, solde **34 919** ; réserve minimale
24 764 conservée. Un seul POST de génération, aucune répétition.

Traitement local par le script existant avec un brief et un rapport distincts :
master conservé, downmix mono, niveau mesuré **−20 LUFS**, crête **−3,9 dBTP**,
boucle préparée par recouvrement de 0,6 s, durée livrée **89,444 s**.
Mesures : [audio-pocket-measurements.json](audio-pocket-measurements.json).
LP-MusicCaps appliqué à D1 décrit aussi une base électronique à nappes et
percussion régulière, avec un caractère doux ; ce contrôle ne valide pas le goût.

Fichier : `public/music/candidates/collection-electronique-v1.mp3`.
Préécoute distincte, aucune substitution automatique de la BGM. La page A/B/C
initiale reste une archive des essais ; D1 se transmet directement à l'écoute.

Vérification : **6/6 tests** des scripts de génération et préparation, lint
ciblé réussi. Pas de modification d'écran ni de règle du jeu ; aucune APK.
