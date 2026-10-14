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
mesurait `-26,4 LUFS` et contenait la pulsation rapportée. Avec son ancien gain
de scène `0,24` et le volume Normal (`0,75`) appliqué deux fois, il tombait vers
`-43,8 LUFS`. Le gain de scène `0,9` est maintenant appliqué au canal, et le
volume global une seule fois sur le bus. Le nouvel asset se situe autour de
`-26,1 LUFS` au cran Normal, avec une crête vraie estimée à `-14,9 dBFS` :
elle reste en fond et conserve de la marge pour les bruitages. Le cran Discret
reste plus bas. Ces niveaux doivent encore être jugés à l'écoute sur téléphone ;
la mesure ne remplace pas l'essai physique.

Le premier appui ou geste clavier explicite sur un contrôle crée/déverrouille
l'AudioContext et démarre la boucle, ce qui respecte la politique autoplay des
navigateurs mobiles, même si la réserve est vide. L'ouverture du booster fait
ensuite passer le mix à la scène pack. Au hub,
le gain reste en arrière-plan ; il descend fortement pendant un booster ; le Tribunal coupe
la musique pour laisser les sons de tampon et de marteau respirer. La commande
Son coupe musique, bruitages et synthèse ensemble ; les trois crans de volume
existants pilotent aussi la musique. Reflets et Son sont activés par défaut si
aucun choix n'est enregistré. `prefers-reduced-motion` reste prioritaire sur
les animations elles-mêmes.

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
