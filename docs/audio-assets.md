# Couche musicale — 13–14 octobre 2026

`public/music/hub-late-night.mp3` est une boucle prototype originale de 24 s,
synthétisée pour CreatorDeck puis encodée en MP3 mono 64 kbit/s. Elle ne contient
ni voix, ni sample tiers. Son intention : basse feutrée, ambiance tardive de
stream, sans nappe fantasy ni effet de victoire permanent. Ce n'est pas encore
un master final.

Le mix applicatif donne un gain relatif de `0,9` au hub, `0,018` pendant un
pack et `0` au Tribunal. Analyse `ffmpeg ebur128` : la boucle source est à
`-26,4 LUFS` intégrés. Avant correction, le gain de scène `0,24` était appliqué
au canal musical, puis le volume Normal (`0,75`) était appliqué deux fois : sur
le canal musical et sur le bus partagé. Le résultat était donc environ
`-43,8 LUFS`, trop bas pour rester audible sur téléphone. Le gain de scène
`0,9` est maintenant appliqué au canal ; le volume global ne s'applique qu'une
fois sur le bus. La boucle se situe autour de `-29,8 LUFS` au cran Normal, avec
une crête maximale estimée à `-14,1 dBFS` :
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
   téléphone avant de remplacer le prototype.
4. Si le nom ou le format change, mettre à jour ce document et le test.

Les sons de reveal déjà présents servent de stingers courts : `playBang` pour
les raretés qui suivent leur silence, `playReward` pour les jalons, et les sons
`playGrace` / `playGavel` pour le Tribunal. Aucun sample vocal de créateur n'est
ajouté dans cette première couche.
