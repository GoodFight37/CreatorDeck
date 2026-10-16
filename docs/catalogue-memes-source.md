# Étude de source — cartes mèmes MyMemeCards

Relevé du 16 octobre 2026. Cette étude précédait l’intégration D-125 ; elle reste la trace de la source et de ses limites.

## Ce que contient la source

- [Accueil français](https://mymemecards.com/fr/) : MyMemeCards est un jeu de cartes mèmes avec boosters et échanges. Sa page annonce 2 130 cartes de mèmes français pour le pack « Memes FR ».
- [Conditions générales, § 4](https://mymemecards.com/fr/conditions/) : le pack français est distinct du pack mondial et a ses propres cartes. Les taux, monnaies et règles décrits sont ceux de MyMemeCards, pas des règles à reproduire dans CreatorDeck.
- Le ZIP de référence remis par Malik le 16 octobre contient un **inventaire de métadonnées** de 23 766 fiches observées sur plusieurs catalogues/éditions/langues, 27 captures de familles de layout et des observations d'animations. Son état indique `rights_confirmations: 0`, `authorized_files_copied: 0`, `new_media_downloads: 0`. Les captures ne sont pas une bibliothèque d'illustrations exploitable pour un nouveau booster.
- [Mentions légales](https://mymemecards.com/fr/mentions-legales/) : OGROUP SRL revendique le site, le code, le design et les textes ; les mèmes restent la propriété de leurs auteurs. Le site donne une adresse de contact mais n'y accorde pas de licence de réutilisation pour un autre jeu. `robots.txt` autorise l'exploration, ce qui ne constitue pas une licence de republication.

## Intention initiale, avant D-125

Malik souhaite une **collection mèmes et un booster mèmes séparés** des cartes Twitch, avec éventuellement un langage visuel commun. Le démonstrateur `/catalogue-demo` de D-076 reste isolé. Le catalogue Twitch, les portraits, les tirages, la garantie, les ressources et les échanges actuels ne changent pas sur la base de cette étude.

À ce stade, la consigne était de confirmer le périmètre des droits avant l'import : textes/design/catalogue auprès de l'éditeur et illustrations auprès de leurs ayants droit, ou d'obtenir des images exploitables auprès de leurs sources indépendantes. Une autorisation d'explorer le site ou la possession d'un ZIP de métadonnées ne confirmait pas ces droits. Malik a ensuite affirmé disposer d'un accord écrit privé ; voir D-125 ci-dessous.

Le plan initial proposait de définir séparément les identifiants, visuels, règles de tirage et stockage côté serveur, sans copier les taux ou l'économie de MyMemeCards. L'intégration D-125 a ensuite retenu l'ensemble des fiches du pack français avec un tirage propre à CreatorDeck.

## Intégration D-125 — 16 octobre 2026

Malik affirme disposer d’un accord écrit de réutilisation, qu’il ne peut pas partager. Sa portée et les obligations éventuelles de crédit ne sont donc **pas vérifiables ici**. Cette affirmation est la base de l’intégration demandée ; les mentions légales de la source restent celles décrites ci-dessus.

Le fichier public `cards-memes-fr.json` a fourni 2 151 fiches, dont 21 Full Art. Le script `scripts/import-memes-fr.mjs --sync` télécharge les images WebP depuis `cards/img/{art|id}.webp`, valide le format et fige les données dans `src/data/memes-fr.json`. 2 147 fichiers distincts ont été récupérés ; une image minuscule de remplacement (carte « Carte supprimée ») est signalée indisponible et cette fiche n’est pas distribuée. Les fichiers sont hébergés localement dans `public/memes-fr/` : le jeu ne dépend pas du serveur MyMemeCards au moment de jouer.

La migration `0052_meme_univers.sql` crée un catalogue, une réserve, une collection et un journal de tirages distincts. Elle ne reprend ni les taux ni la monnaie de MyMemeCards. Les 2 150 fiches pourvues de visuel sont distribuées, y compris celles marquées sorties de la source : cette mention est conservée dans les données, mais n’a pas de règle de retrait CreatorDeck. La page `/memes` lie booster, collection, recherche et fiche. Les crédits fournis par la source sont affichés en fiche. Les tirages Twitch et leur économie restent inchangés.

## Retrait de la fiche sans illustration — D-131, 16 octobre 2026

À la demande de Malik, `juventus-rose` (« Carte supprimée ») est retirée du classeur. La source générale compte toujours 2 151 entrées, mais l’import CreatorDeck exclut explicitement cette fiche ; le catalogue distribué compte 2 150 cartes, toutes munies d’un visuel. La migration additive `0053` retire la ligne serveur et refuse la suppression si une collection ou un journal de tirage la référence. Après correction du vérificateur SQL et des attentes E2E (`83d212c8`), la CI `38960335566` a réussi 6/6 ; le workflow Supabase `38960850198` a appliqué `0053` et confirmé l’état attendu après application. La migration initiale `0052` reste inchangée pour préserver l’historique. Voir [D-131](decisions.md).

## Exploitation visuelle D-127

Le paquet de référence a été réexaminé pour ses observations de layouts, de couches et d'animations, sans nouvel import de catalogue ou de médias. Son extrait de 27 familles est intégralement partiel ; voir [l'audit différentiel des cartes](audit-cartes-memes-reference.md) pour les éléments retenus, écartés et les incertitudes. Le nouveau rendu CreatorDeck est original et limité aux cartes Mèmes.
