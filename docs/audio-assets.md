# Couche musicale — 13–14 octobre 2026

`public/music/hub-late-night.mp3` est une boucle prototype originale de 24 s,
synthétisée pour CreatorDeck puis encodée en MP3 mono 64 kbit/s. Elle ne contient
ni voix, ni sample tiers, ni percussion. Le premier prototype avait une pulsation
percussive qui ressemblait à des petits coups réguliers sur haut-parleur mobile ;
le fichier actuel est une nappe grave et douce, sans accents rapprochés.
Ce n'est pas encore un master final.

Le mix applicatif donne un gain relatif de `0,9` au hub, `0,018` pendant un
pack et `0` au Tribunal. Analyse `ffmpeg ebur128` : la boucle source est à
`-22,7 LUFS` intégrés (crête vraie `-11,5 dBFS`, LRA `1,5 LU`). L'ancien asset
mesurait `-26,4 LUFS` et contenait la pulsation rapportée. La piste actuelle,
directement branchée sur la sortie média, se situe théoriquement autour de
`-23,6 LUFS` au hub après le gain `0,9`. Le téléphone règle le volume perçu ;
ces mesures ne remplacent pas l'écoute physique.

Le premier geste joueur crée/déverrouille l'AudioContext, conformément à la
politique autoplay des navigateurs mobiles, même si la réserve est vide.
L'ouverture du booster fait ensuite passer le mix à la scène pack. Au hub la
musique reste en fond ; elle baisse pendant le booster ; le Tribunal la coupe
pour laisser respirer les sons de tampon et de marteau. Deux réglages séparés
dans Toi pilotent désormais les sons de jeu (bruitages et synthèse) et la
musique. Ils sont activés par défaut et mémorisés séparément. Les crans de
volume dans l'application ont été retirés : le volume média du téléphone règle
les deux. Pour les joueurs déjà installés, un ancien choix Son OFF devient OFF
sur les deux interrupteurs ; un ancien choix ON garde les deux actifs. Reflets
reste activé par défaut si aucun choix n'est enregistré ;
`prefers-reduced-motion` reste prioritaire sur les animations.

## Direction et exemples d'écoute — choix final en attente

Le 14 octobre, Malik a partagé `snow_day.mp3` et `springly_sprigs.mp3` comme
exemples de direction, en précisant que ce n'est pas encore son avis final.
Ils proviennent de [Fantasy Song Pack Volume 1 sur OpenGameArt](https://opengameart.org/content/fantasy-song-pack-volume-1),
attribué à troubadour et publié sous CC0. La page indique que les morceaux du
pack sont libres d'utilisation sans crédit. Ces deux fichiers sont des repères
de goût uniquement : ils ne sont pas intégrés au dépôt ni choisis pour la BGM.

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
ffmpeg -hide_banner -loglevel error -y -i /tmp/creatordeck-hub-ambient.wav -codec:a libmp3lame -b:a 64k -ar 24000 -ac 1 public/music/hub-late-night.mp3
```

Les fréquences sont alignées sur la durée pour que leurs phases se rejoignent
à la fin de la boucle. Le script ne dépend pas de paquets Python tiers ; FFmpeg
et son encodeur MP3 servent seulement à compresser le WAV temporaire.

Les sons de reveal déjà présents servent de stingers courts : `playBang` pour
les raretés qui suivent leur silence, `playReward` pour les jalons, et les sons
`playGrace` / `playGavel` pour le Tribunal. Aucun sample vocal de créateur n'est
ajouté dans cette première couche.
