# Retour aux portraits d’origine après Upscayl — 13 octobre 2026

Malik constate des détails artificiels sur une partie des images agrandies par
IA. Comparaison visuelle effectuée sur sept paires : notamment 2lew et
asmongold247 montrent un visage plus lisse et des traits reconstruits dans la
version Upscayl.

La sélection réutilise maintenant `/creators/<slug>.webp` à la place d’une
entrée Upscayl. Les priorités supérieures restent dans l’ordre existant : choix
manuel, portrait Commons crédité, image fournie pour Diverron. Les fichiers
Upscayl (`public/creators/upscaled/`), les 699 entrées du registre et les
informations de crédits ne sont pas supprimés. Dans les réglages, la rubrique
est renommée **Versions Upscayl archivées** et précise qu’elles ne sont plus
affichées sur les cartes.

Vérifications locales sur cette révision : **51/51** tests unitaires portraits
(décodage des 699 versions conservées et sélection de l’avatar attendu pour
chaque entrée), **2/2** DOM crédits, **2/2** E2E bureau/téléphone simulé (dont
chargement réel de l’avatar Twitch 600 px pour 2lew), TypeScript, ESLint ciblé,
catalogue, jargon et build de production réussis (export statique sans cloud). Ces contrôles
confirment le chemin d’affichage, pas la qualité visuelle de 699 portraits.
Les avatars originaux sont ceux embarqués au moment de ce correctif ; aucune
nouvelle collecte ni révision manuelle du catalogue n’est incluse.
