# Import manuel des portraits — 12 octobre 2026

L’archive `EXPORT.zip` reçue le 12 octobre contient 300 images WebP carrées de
450 × 450 px. Les 300 noms correspondent à des slugs du catalogue, et aucune
image n’est identique à l’avatar de base correspondant. L’archive ne contient
pas le fichier de crédits attendu (`portrait-overrides.patch.json`) ; son seul
manifeste décrit une entrée de test sans rapport avec les images.

Les images sont conservées sans modification dans `public/creators/manual/`.
`src/data/manual-portrait-overrides.json` les relie aux créateurs et les fait
servir par l’application. Les anciennes images créditées sous
`public/creators/curated/` restent intactes. La page « Crédits des images »
signale que la source et la licence de ce lot ne figuraient pas dans l’archive,
et affiche la liste des créateurs concernés. Aucun auteur, URL ou licence n’a
été inventé.

Le slug interne `skyroz` est conservé pour ne pas casser les références ; son
nom affiché est Skyrozz et son login Twitch est `skyrroztv`. L’image du lot est
servie telle quelle à sa résolution native de 450 × 450 px.

Vérifications locales : test portrait ciblé 32/32, écrans 109/109,
TypeScript réussi, build statique réussi. Le build a signalé que les variables
Supabase publiques n’étaient pas définies ; il s’agit donc d’un build sans
cloud. Windows et appareil physique non testés.
