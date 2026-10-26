import type { StoryScript } from "../lib/story-mode";

/** Scénario écrit et contrôlé en amont. Aucune requête IA pendant la partie. */
export const STORY_PROLOGUE: StoryScript = {
  id: "zero-spectateur",
  version: 2,
  title: "Zéro spectateur",
  subtitle: "Douze décisions pour lancer une chaîne. Chaque raccourci a une facture.",
  totalSteps: 12,
  initialStats: { public: 35, energie: 65, argent: 55, confiance: 55 },
  scenes: [
    {
      id: "studio", step: 0, title: "Le grand départ", speaker: "TOI", emoji: "🎙️",
      text: "Il est 22 h 04. Ton premier live commence dans six minutes. Ton téléphone filme en 720p. Dans ton panier, un micro que tu ne peux pas vraiment te payer.",
      choices: {
        left: { label: "Rester avec le téléphone", effects: { energie: 6, argent: 9, public: -3 }, addFlags: ["debut_modeste"] },
        right: { label: "Acheter le micro", effects: { argent: -17, public: 7, energie: -3 }, addFlags: ["micro_cher"] },
      },
    },
    {
      id: "premier_chat", step: 1, title: "Une personne dans le chat", speaker: "FLO · future modo", emoji: "💬",
      text: "« Salut, je suis ta seule viewer. Si tu veux, je peux modérer. Mais là, tu viens de dire bonjour à ta propre caméra trois fois. »",
      choices: {
        left: { label: "Donner les clés à Flo", effects: { confiance: 10, energie: 5, argent: -3 }, addFlags: ["flo_modo"] },
        right: { label: "Tout gérer seul", effects: { energie: -8, public: 5, confiance: -3 }, addFlags: ["solo"] },
      },
    },
    {
      id: "clip_risque", step: 2, title: "Le clip de trop", speaker: "NOX · streamer rival", emoji: "🔥",
      text: "Nox rate une action spectaculaire en direct. Ton chat réclame un montage humiliant. Une minute de travail peut faire décoller ta chaîne.",
      choices: {
        left: { label: "Faire un clip drôle, sans l'afficher", effects: { public: 8, confiance: 5, energie: -5 }, addFlags: ["respect_nox"] },
        right: { label: "Le ridiculiser en public", effects: { public: 18, confiance: -14, energie: -4 }, addFlags: ["humiliation_nox", "clip_viral"] },
      },
    },
    {
      id: "premier_sponsor", step: 3, title: "Un mail à 3 h du matin", speaker: "MONA · régie publicitaire", emoji: "📨",
      text: "Mona te propose une campagne pour une boisson inconnue. L'argent réglerait le loyer. La marque demande d'oublier le mot « publicité ».",
      choices: {
        left: { label: "Refuser le placement caché", effects: { argent: -7, confiance: 12, energie: 4 }, addFlags: ["refus_sponsor"] },
        right: { label: "Accepter sans rien dire", effects: { argent: 25, confiance: -15, public: 5 }, addFlags: ["sponsor_cache"] },
      },
    },
    {
      id: "flo_present", step: 4, requiresFlags: ["flo_modo"], title: "Le message de Flo", speaker: "FLO · modératrice", emoji: "🛡️",
      text: "Flo a supprimé soixante messages agressifs et rate son examen demain. « Je t'aime bien, mais je ne peux pas être la police de ton chat chaque nuit. »",
      choices: {
        left: { label: "Lui donner deux jours de repos", effects: { energie: -5, confiance: 12, public: -5 }, addFlags: ["flo_protegee"] },
        right: { label: "Lui demander de tenir encore", effects: { public: 10, energie: 4, confiance: -10 }, addFlags: ["flo_epuisee"] },
      },
    },
    {
      id: "sans_modo", step: 4, title: "Le chat déborde", speaker: "FLO · spectatrice", emoji: "🧯",
      text: "Ton chat grossit. Flo te propose encore son aide, mais elle a vu les insultes que tu as laissées passer pendant le dernier live.",
      choices: {
        left: { label: "T'excuser et accepter", effects: { confiance: 10, public: -4, energie: 5 }, addFlags: ["flo_protegee"] },
        right: { label: "Prétendre que c'est le jeu", effects: { public: 8, confiance: -12, energie: -9 }, addFlags: ["chat_toxique"] },
      },
    },
    {
      id: "invitation", step: 5, requiresFlags: ["respect_nox"], title: "Un DM inattendu", speaker: "NOX · streamer rival", emoji: "🤝",
      text: "Nox a vu ton clip. « Tu aurais pu me détruire. Merci d'avoir gardé ça drôle. Tu veux faire un duo ? »",
      choices: {
        left: { label: "Accepter le duo", effects: { public: 15, energie: -8, confiance: 8 }, addFlags: ["duo_nox"] },
        right: { label: "Garder ton rythme", effects: { energie: 8, public: -3, confiance: 3 }, addFlags: ["independance"] },
      },
    },
    {
      id: "nox_revanche", step: 5, title: "Nox a vu ton clip", speaker: "NOX · streamer rival", emoji: "⚡",
      text: "Nox poste ta vidéo humiliante à ses abonnés avec une seule légende : « Voilà comment il démarre sa carrière. » Le nombre de vues explose.",
      choices: {
        left: { label: "Présenter des excuses", effects: { confiance: 11, public: -9, energie: -5 }, addFlags: ["excuses_nox"] },
        right: { label: "En faire un feuilleton", effects: { public: 17, confiance: -15, energie: -8 }, addFlags: ["guerre_nox"] },
      },
    },
    {
      id: "sponsor_retour", step: 6, requiresFlags: ["sponsor_cache"], title: "Le reçu retrouvé", speaker: "MONA · régie publicitaire", emoji: "🧾",
      text: "Une capture du contrat circule. Mona te dit de supprimer les questions du chat. Flo te demande : « On leur ment vraiment ? »",
      choices: {
        left: { label: "Publier le contrat et s'excuser", effects: { argent: -12, confiance: 15, public: -8 }, addFlags: ["transparence_tardive"] },
        right: { label: "Effacer les preuves", effects: { argent: 8, public: 6, confiance: -22 }, addFlags: ["preuve_effacee"] },
      },
    },
    {
      id: "sponsor_refuse", step: 6, title: "La proposition propre", speaker: "MONA · régie publicitaire", emoji: "💼",
      text: "La campagne cachée est partie chez un concurrent. Mona revient avec une offre plus petite, clairement étiquetée. Ton loyer approche.",
      choices: {
        left: { label: "Accepter en étant transparent", effects: { argent: 13, confiance: 6, energie: -6 }, addFlags: ["sponsor_clair"] },
        right: { label: "Continuer sans sponsor", effects: { argent: -10, energie: 5, confiance: 8 }, addFlags: ["sans_marque"] },
      },
    },
    {
      id: "flo_au_bord", step: 7, requiresFlags: ["flo_epuisee"], title: "Flo ne répond plus", speaker: "FLO · modératrice", emoji: "🌙",
      text: "Ton chat attend Flo. Son dernier message date d'hier : « Je dois dormir. Je te l'avais dit. » Tu retrouves trente signalements sans réponse.",
      choices: {
        left: { label: "Fermer le chat et la rappeler", effects: { public: -9, energie: 6, confiance: 12 }, addFlags: ["reconciliation_flo"] },
        right: { label: "Remplacer Flo sans la prévenir", effects: { public: 6, confiance: -14, energie: -8 }, addFlags: ["rupture_flo"] },
      },
    },
    {
      id: "flo_soutien", step: 7, requiresFlags: ["flo_protegee"], title: "Le retour de Flo", speaker: "FLO · modératrice", emoji: "💜",
      text: "Flo revient après deux jours. « J'ai réussi mon examen. Et j'ai préparé des règles de chat. Tu les affiches, cette fois ? »",
      choices: {
        left: { label: "Mettre les règles en avant", effects: { confiance: 13, energie: 5, public: -5 }, addFlags: ["communaute_saine"] },
        right: { label: "Les garder en coulisse", effects: { public: 6, confiance: -5, energie: -3 }, addFlags: ["regles_discretes"] },
      },
    },
    {
      id: "chat_nuit", step: 7, title: "Le grand silence", speaker: "TOI", emoji: "🌑",
      text: "Tu reçois des messages en rafale, puis plus rien. Ta communauté attend de savoir si tu vas enfin fixer des limites.",
      choices: {
        left: { label: "Poser des règles claires", effects: { confiance: 12, public: -4, energie: 3 }, addFlags: ["communaute_saine"] },
        right: { label: "Laisser faire la foule", effects: { public: 8, confiance: -12, energie: -7 }, addFlags: ["chat_toxique"] },
      },
    },
    {
      id: "agence", step: 8, title: "L'offre qui change tout", speaker: "MONA · agent artistique", emoji: "📑",
      text: "Une agence t'offre un contrat d'exclusivité : argent assuré, calendrier imposé, vidéos validées par un comité que tu ne connais pas.",
      choices: {
        left: { label: "Rester propriétaire de la chaîne", effects: { confiance: 8, argent: -7, energie: 3 }, addFlags: ["libre"] },
        right: { label: "Signer les yeux ouverts", effects: { argent: 23, energie: -11, confiance: -8, public: 9 }, addFlags: ["agence"] },
      },
    },
    {
      id: "double_crise", step: 9, requiresFlags: ["guerre_nox", "preuve_effacee"], title: "Deux affaires, une caméra", speaker: "NOX · live / MONA · téléphone", emoji: "⚠️",
      text: "Nox ouvre un direct sur votre conflit. Au même instant, le contrat publicitaire que tu avais fait disparaître réapparaît. Flo t'envoie : « Les gens méritent mieux que deux mensonges. »",
      choices: {
        left: { label: "Tout reconnaître et couper le direct", effects: { confiance: 20, public: -15, argent: -10, energie: 2 }, addFlags: ["aveu_double"] },
        right: { label: "Accuser Nox d'avoir truqué le contrat", effects: { public: 14, confiance: -22, energie: -10 }, addFlags: ["double_mensonge"] },
      },
    },
    {
      id: "nox_derniere", step: 9, requiresFlags: ["guerre_nox"], title: "La guerre des clips", speaker: "NOX · streamer rival", emoji: "🥊",
      text: "Nox annonce un live « vérités » sur toi. Tes abonnés réclament une riposte plus violente encore. Ton pouce flotte sur « publier ».",
      choices: {
        left: { label: "Arrêter le conflit", effects: { public: -12, confiance: 17, energie: 6 }, addFlags: ["paix_nox"] },
        right: { label: "Lancer un dernier clash", effects: { public: 18, confiance: -18, energie: -12 }, addFlags: ["escalade_finale"] },
      },
    },
    {
      id: "sponsor_scandale", step: 9, requiresFlags: ["preuve_effacee"], title: "Les preuves reviennent", speaker: "FLO · dans le chat", emoji: "📸",
      text: "Les captures que tu croyais supprimées réapparaissent. Flo t'envoie : « Une vérité effacée est toujours une vérité. »",
      choices: {
        left: { label: "Reconnaître la faute en direct", effects: { public: -10, confiance: 16, energie: -8 }, addFlags: ["aveu"] },
        right: { label: "Accuser un montage", effects: { public: 8, confiance: -19, argent: -5 }, addFlags: ["mensonge_final"] },
      },
    },
    {
      id: "retour_souvenir", step: 9, title: "Le premier abonné", speaker: "FLO · spectatrice", emoji: "📼",
      text: "Flo retrouve une capture de ton tout premier live : une chaise bancale, un spectateur et un message « Bienvenue ». Elle demande si tu reconnais encore la personne à l'écran.",
      choices: {
        left: { label: "Revoir la vidéo avec le chat", effects: { confiance: 12, energie: 6, public: -4 }, addFlags: ["souvenir"] },
        right: { label: "Préparer plutôt un gros événement", effects: { public: 12, argent: -8, energie: -10 }, addFlags: ["spectacle"] },
      },
    },
    {
      id: "course", step: 10, title: "La dernière semaine", speaker: "TOI", emoji: "⏰",
      text: "Ton téléphone vibre même quand personne n'écrit. Tu peux tenir une semaine de plus, ou laisser une soirée sans caméra.",
      choices: {
        left: { label: "Couper un soir et retrouver tes proches", effects: { energie: 17, public: -7, confiance: 6 }, addFlags: ["pause"] },
        right: { label: "Streamer chaque soir", effects: { public: 17, energie: -19, argent: 10 }, addFlags: ["marathon"] },
      },
    },
    {
      id: "finale_collective", step: 11, requiresFlags: ["communaute_saine"], title: "Le dernier bouton", speaker: "FLO · équipe de modération", emoji: "🫶",
      text: "Le jour du bilan, Flo lance le chat : « On ne vient plus seulement pour les chiffres. On vient pour ce qu'on construit ici. » La caméra est prête.",
      choices: {
        left: { label: "Faire un live tranquille avec eux", effects: { confiance: 12, energie: 8, public: 4 }, addFlags: ["final_humain"] },
        right: { label: "Transformer la soirée en show", effects: { public: 17, energie: -11, argent: -6 }, addFlags: ["final_spectacle"] },
      },
    },
    {
      id: "finale", step: 11, title: "Tout est en direct", speaker: "TOI", emoji: "🔴",
      text: "Tu es seul devant le bouton « Démarrer ». Tu as de l'audience, des factures et quelques regrets. Quel sera le ton de ton dernier live de cette saison ?",
      choices: {
        left: { label: "Dire la vérité sur cette année", effects: { confiance: 15, energie: 5, public: -5 }, addFlags: ["final_humain"] },
        right: { label: "Faire le plus gros show possible", effects: { public: 19, energie: -13, argent: -8 }, addFlags: ["final_spectacle"] },
      },
    },
  ],
};
