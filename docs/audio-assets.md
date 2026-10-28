# Couche musicale — mise à jour 28 octobre 2026

Malik approuve D1 et demande la clôture du chantier le 28 octobre :
`public/music/candidates/collection-electronique-v1.mp3` devient la BGM du jeu.
Boucle électronique originale de 89,444 s, −20 LUFS, −3,9 dBTP. Le moteur garde
l'identifiant `hub-late-night` pour préserver les préférences ; la source et le
libellé deviennent D1 / Collection lumineuse. Les 36 prises acoustiques sont
déjà intégrées. Aucun nouvel appel de génération. Cumul final : 3 845 crédits.

## Historique — piste provisoire remplacée le 28 octobre

Actualisation du 27 octobre : [livraison audio et comparaison musicale](audio-livraison-2026-10-27.md).
Six extraits originaux sont proposés ; la piste actuelle attend le choix de Malik.
Retour du 28 octobre : aucune de ces directions n'est retenue (A répétitif,
B hors thème). [Analyse de l'OST de référence et essai électronique D1](audio-direction-pocket-2026-10-28.md).

`public/music/hub-late-night.mp3` conserve son chemin technique pour éviter de
changer le moteur : son contenu est maintenant `springly_sprigs.mp3` du pack
[Fantasy Song Pack Volume 1](https://opengameart.org/content/fantasy-song-pack-volume-1)
(troubadour, CC0). Malik a autorisé le choix de l'une de ses deux références ;
cette piste est donc provisoire. Le master est conservé en entier (142 s),
réencodé en MP3 mono 24 kHz/48 kbit/s (~834 KiB). La source est mesurée à
`-15,5 LUFS` et `-0,6 dBTP` ; ce fichier remplace la nappe bourdonnante de 24 s.

Les gains relatifs sont maintenant `0,08` au hub, `0,04` pendant le pack et `0`
au Tribunal. La musique commence à l'entrée dans le jeu, après le bouton de fin
du tutoriel pour un nouveau joueur, ou au premier geste de jeu d'un joueur de
retour. Elle ne dépend plus de l'ouverture du booster pour démarrer. Son volume
est fortement réduit ; le niveau acoustique réel dépend toujours du téléphone
et de son volume média.

Le MP3 est préchargé et décodé au montage sans lancer de source. Pour les
nouveaux joueurs, le bouton de fin du tutoriel démarre la boucle avant l'écriture
cloud asynchrone ; pour les joueurs de retour, le premier geste de jeu après
chargement la démarre. Le navigateur impose ce geste avant d'autoriser l'audio
sur mobile : le préchargement retire le délai réseau/décodage après ce geste,
mais ne permet pas de jouer automatiquement au chargement de la page.
`creator-deck-app.tsx` est l'unique propriétaire des scènes ; `setMusicScene()`
ne crée jamais de lecteur ni de source. La boucle démarre avec un fondu de 1,4 s
et le raccord est pré-mélangé sur 1,2 s en fondu croisé. Couper la musique baisse
le gain sur 0,35 s sans arrêter la source ; la réactiver remonte le gain sur
1,4 s et garde le curseur de lecture. Aucune seconde boucle n'est créée. Au hub
la musique reste en fond à `0,08` ; elle baisse à `0,04` pendant le booster et
tout le reveal ; le Tribunal la coupe à `0` pour laisser respirer les sons de
tampon et de marteau. Deux réglages séparés dans Toi pilotent les sons de jeu
(bruitages et synthèse) et la
musique. Ils sont activés par défaut et mémorisés séparément. Les crans de
volume dans l'application ont été retirés : le volume média du téléphone règle
les deux. Pour les joueurs déjà installés, un ancien choix Son OFF devient OFF
sur les deux interrupteurs ; un ancien choix ON garde les deux actifs. Reflets
reste activé par défaut si aucun choix n'est enregistré ;
`prefers-reduced-motion` reste prioritaire sur les animations.

Les gains cibles `card-draw` et `card-turn` ont été augmentés respectivement à
`-25 dBFS` et `-28,6 dBFS`. La borne de crête globale reste `-6 dBFS`, ce qui
limite le retournement à environ `+1,4 dB` et la pioche à `+4 dB`.

Les tests unitaires instrumentent la source Web Audio pour vérifier préchargement
silencieux, boucle, fondus et mute/unmute sans redémarrer la lecture. Les E2E
simulent le graphe audio :
ils vérifient qu'une boucle démarre à l'entrée dans le jeu, qu'un booster ne crée
pas de seconde boucle, que le gain est `0,04` pendant déchirure/reveal et revient
à `0,08` après fermeture. Cela ne prouve pas le niveau acoustique sur le
haut-parleur d'un téléphone ; le ressenti doit encore être contrôlé sur Vercel.

## Direction et exemples d'écoute — choix final en attente

Le 14 octobre, Malik a partagé `snow_day.mp3` et `springly_sprigs.mp3` comme
exemples de direction, en précisant que ce n'est pas encore son avis final. Il
a ensuite demandé de remplacer immédiatement la nappe par l'une des deux ;
`springly_sprigs` est intégrée à titre provisoire, sans prétendre que son choix
musical final est confirmé.
Ils proviennent de [Fantasy Song Pack Volume 1 sur OpenGameArt](https://opengameart.org/content/fantasy-song-pack-volume-1),
attribué à troubadour et publié sous CC0. La page indique que les morceaux du
pack sont libres d'utilisation sans crédit. `snow_day` reste une référence
seulement ; `springly_sprigs` est l'asset actuellement intégré, en attente d'un
retour après écoute sur Vercel.

La première shortlist (Neon Noir, Resonance, Assembly Not Required et
Nightchaser) ne correspond pas à la direction souhaitée par Malik ; ne pas la
reproposer comme sélection active. Chercher plutôt une mélodie d'aventure
marquée, chaleureuse et mémorable, avec une couleur de jeu console/JRPG, sans
reprendre de thème, de mélodie ou d'enregistrement Nintendo/Pokémon. Ne pas
déduire de ces deux exemples un choix de genre final plus précis que cela.

Avant d'intégrer tout morceau, vérifier sa licence directement auprès de la
source et conserver la page/licence ainsi que le crédit demandé. « Unreleased »
ne veut pas dire libre de droits : une chanson et son enregistrement sont deux
droits distincts. Pour intégrer un morceau commercial unreleased dans le jeu,
il faut une autorisation écrite couvrant la composition/synchronisation et le
master/enregistrement, obtenue auprès des ayants droit concernés. Une fuite,
un crédit ou la disponibilité d'un fichier ne donnent pas cette autorisation.

La comparaison recommandée reste un aperçu temporaire dans l'application :
chaque candidate s'écoute depuis le même écran et au même volume, sans modifier
le rythme d'ouverture ni les autres sons. La piste du hub ne sera remplacée
qu'après le choix de Malik.

## Remplacer par un asset final

1. Remplacer `hub-late-night.mp3` en gardant ce chemin, ou modifier l'URL de
   `startGameAudio` dans `src/lib/sfx.ts`.
2. Livrer un MP3 ou AAC/MP4 court, compressé, sans silence ajouté au début,
   conçu pour une boucle sans clic. Viser environ 20–40 secondes et un niveau
   perçu discret. Ne pas inclure de voix/sample sans droits documentés.
3. Garder `src/lib/sfx.test.ts` vert : il vérifie la présence d'un flux MP3 et
   une taille raisonnable. Vérifier l'écoute au casque et sur haut-parleur de
   téléphone avant de figer l'asset final.
4. Si le nom ou le format change, mettre à jour ce document et le test.

## Régénérer la boucle prototype

Le fichier actuel est généré avec le script Python standard-library :

```sh
python scripts/generate-hub-music.py
ffmpeg -hide_banner -loglevel error -y -i /tmp/creatordeck-hub-ambient.wav -codec:a libmp3lame -b:a 64k -ar 24000 -ac 1 /tmp/hub-late-night-prototype.mp3
```

Les fréquences sont alignées sur la durée pour que leurs phases se rejoignent
à la fin de la boucle. Le script ne dépend pas de paquets Python tiers ; FFmpeg
et son encodeur MP3 servent seulement à compresser le WAV temporaire. Garder sa
sortie dans `/tmp` : elle représente l'ancienne nappe, pas la piste sélectionnée.

Les sons de reveal déjà présents servent de stingers courts : `playBang` pour
les raretés qui suivent leur silence, `playReward` pour les jalons, et les sons
`playGrace` / `playGavel` pour le Tribunal. Aucun sample vocal de créateur n'est
ajouté dans cette première couche.
