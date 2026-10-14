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

## Pistes à écouter avant de choisir

La nappe actuelle est un prototype original, volontairement sans rythme : elle
explique le son entendu, mais ne donne pas encore au hub une vraie identité
musicale. Ces quatre morceaux sont des candidats à écouter ; aucun n'est encore
intégré. Les licences consultées permettent l'utilisation dans un projet
commercial avec attribution ; le crédit devra apparaître dans les crédits du
jeu si l'un d'eux est retenu.

1. [Neon Noir — Shane Ivers](https://www.silvermansound.com/free-music/neon-noir) :
   synthwave chaleureux, basse, cordes et batterie, 80 BPM, 5:12. Candidat
   principal pour une ambiance tard le soir avec un vrai groove.
2. [Resonance — Scott Buckley](https://www.scottbuckley.com.au/library/resonance/) :
   electronica sombre ; démarre par une pulsation et guitare d'ambiance puis
   s'ouvre sur une partie plus synthé et entraînante. CC BY 4.0, crédit requis.
3. [Assembly Not Required — AndyGun11](https://opengameart.org/content/assembly-not-required-dark-synthwave-electronic-body-music) :
   boucle courte, dark synthwave / EBM, explicitement prévue pour boucler ;
   CC BY 4.0, crédit du morceau et du pseudo requis.
4. [Nightchaser — Shane Ivers](https://www.silvermansound.com/free-music/nightchaser) :
   techno/trance sombre, basse profonde, 115 BPM, 3:39. Le choix le plus énergique,
   possiblement trop présent comme fond permanent.

Mixkit n'est pas retenu : sa licence gratuite exclut explicitement les jeux
vidéo. Les détails peuvent évoluer ; avant intégration, revalider la licence de
la piste choisie et garder une copie de sa page/licence et du texte de crédit.
L'étape de comparaison recommandée est un aperçu temporaire dans l'application :
chaque candidate s'écoute depuis le même écran et le même volume, sans modifier
le rythme d'ouverture ni le reste des sons. La piste sera remplacée dans le hub
seulement après le choix de Malik.

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
