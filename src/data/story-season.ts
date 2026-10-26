import type { StoryScene } from "../lib/story-mode";

/** Actes suivants : scènes locales, choix déterministes, aucun appel réseau. */
export const STORY_SEASON_SCENES: StoryScene[] = [
  {
    "id": "atelier_flo",
    "step": 12,
    "title": "Une clé sur la table",
    "speaker": "FLO · collectif",
    "emoji": "🔑",
    "channel": "DM",
    "text": "Après le premier bilan, Flo pose quatre badges sur la table. « Je ne veux pas d'un nouveau chef. Je veux qu'on sache qui décide quoi. »",
    "requiresFlags": [
      "collectif_autonome"
    ],
    "choices": {
      "left": {
        "label": "Écrire des règles de décision",
        "effects": {
          "confiance": 6,
          "argent": -4,
          "energie": 5
        },
        "addFlags": [
          "charte_collectif"
        ]
      },
      "right": {
        "label": "Décider vite, seul",
        "effects": {
          "public": 5,
          "energie": -4,
          "confiance": -6
        },
        "addFlags": [
          "chef_collectif"
        ]
      }
    }
  },
  {
    "id": "retour_nox_froid",
    "step": 12,
    "title": "Un écran noir",
    "speaker": "NOX · ancien partenaire",
    "emoji": "📵",
    "channel": "DM",
    "text": "Ton dernier direct a laissé Nox hors champ. Il t'envoie une facture sans un mot. Le logo du duo est encore sur ton écran d'accueil.",
    "requiresFlags": [
      "pacte_brise"
    ],
    "choices": {
      "left": {
        "label": "Le rembourser et retirer le logo",
        "effects": {
          "argent": -9,
          "confiance": 6
        },
        "addFlags": [
          "nox_dedommage"
        ]
      },
      "right": {
        "label": "Conserver les vidéos du duo",
        "effects": {
          "argent": 5,
          "public": 5,
          "confiance": -6
        },
        "addFlags": [
          "archives_duo_gardees"
        ]
      }
    }
  },
  {
    "id": "lundi_apres",
    "step": 12,
    "title": "Le lundi sans confettis",
    "speaker": "TOI",
    "emoji": "☕",
    "channel": "ARCHIVE",
    "text": "Le bilan est terminé. À la place des notifications, un mail du propriétaire : le loyer augmente. Sur le bureau, le bouton « relancer un live » attend.",
    "choices": {
      "left": {
        "label": "Prévoir un vrai budget",
        "effects": {
          "argent": 6,
          "energie": 4,
          "public": -3
        },
        "addFlags": [
          "budget_pose"
        ]
      },
      "right": {
        "label": "Annoncer une nouvelle série",
        "effects": {
          "public": 7,
          "energie": -4,
          "argent": -4
        },
        "addFlags": [
          "nouvelle_serie"
        ]
      }
    }
  },
  {
    "id": "fil_invisible",
    "step": 13,
    "title": "L'algorithme a faim",
    "speaker": "PLATEFORME · notification",
    "emoji": "📈",
    "channel": "MAIL",
    "text": "Ton meilleur clip a changé de catégorie sans prévenir. La plateforme promet de te pousser si tu publies quotidiennement pendant quinze jours.",
    "choices": {
      "left": {
        "label": "Publier moins, mais mieux",
        "effects": {
          "energie": 7,
          "confiance": 4,
          "public": -5
        },
        "addFlags": [
          "rythme_choisi"
        ]
      },
      "right": {
        "label": "Tester le défi des quinze jours",
        "effects": {
          "public": 10,
          "energie": -7,
          "confiance": -2
        },
        "addFlags": [
          "defi_algo"
        ]
      }
    }
  },
  {
    "id": "flo_revient_rupture",
    "step": 14,
    "title": "Un prénom effacé",
    "speaker": "FLO · message non lu",
    "emoji": "📨",
    "channel": "DM",
    "text": "Le nouveau chat réclame Flo. Tu retrouves sa vieille liste de règles. Elle l'avait envoyée avant votre rupture, sans demander quoi que ce soit en retour.",
    "requiresFlags": [
      "rupture_flo"
    ],
    "choices": {
      "left": {
        "label": "Créditer son travail publiquement",
        "effects": {
          "confiance": 8,
          "public": -3,
          "energie": -3
        },
        "addFlags": [
          "credit_flo"
        ]
      },
      "right": {
        "label": "Reprendre les règles sans la citer",
        "effects": {
          "energie": 4,
          "public": 4,
          "confiance": -7
        },
        "addFlags": [
          "effacement_flo"
        ]
      }
    }
  },
  {
    "id": "flo_dit_non",
    "step": 14,
    "title": "Le dimanche de Flo",
    "speaker": "FLO · modératrice",
    "emoji": "🍃",
    "channel": "CHAT",
    "text": "Une convention veut Flo sur scène avec toi. Elle a déjà dit qu'elle travaille dimanche. « Je peux être ton amie sans être ton personnel », te rappelle-t-elle.",
    "requiresFlags": [
      "flo_protegee"
    ],
    "choices": {
      "left": {
        "label": "Refuser la convention pour elle",
        "effects": {
          "confiance": 7,
          "energie": 5,
          "argent": -5
        },
        "addFlags": [
          "limites_flo"
        ]
      },
      "right": {
        "label": "Y aller seul et la remercier",
        "effects": {
          "public": 6,
          "argent": 4,
          "energie": -3
        },
        "addFlags": [
          "convention_solo"
        ]
      }
    }
  },
  {
    "id": "modos_nuit",
    "step": 14,
    "title": "Une nuit de signalements",
    "speaker": "CHAT · équipe",
    "emoji": "🛡️",
    "channel": "CHAT",
    "text": "Une polémique ailleurs déborde sur ta chaîne. Trois personnes proposent d'aider gratuitement ; aucune n'a encore lu les règles de modération.",
    "choices": {
      "left": {
        "label": "Former l'équipe avant le direct",
        "effects": {
          "energie": -4,
          "confiance": 7,
          "public": -2
        },
        "addFlags": [
          "formation_modo"
        ]
      },
      "right": {
        "label": "Ouvrir tout de suite",
        "effects": {
          "public": 7,
          "energie": -6,
          "confiance": -4
        },
        "addFlags": [
          "moderation_rapide"
        ]
      }
    }
  },
  {
    "id": "mona_exclusif",
    "step": 15,
    "title": "La clause huit",
    "speaker": "MONA · agence",
    "emoji": "🧷",
    "channel": "CONTRAT",
    "text": "Mona t'explique que ton contrat autorise l'agence à effacer un live jugé « non conforme à l'image de marque ». Elle tient le stylo du côté signature.",
    "requiresFlags": [
      "agence"
    ],
    "choices": {
      "left": {
        "label": "Exiger une clause de recours",
        "effects": {
          "argent": -7,
          "energie": -3,
          "confiance": 8
        },
        "addFlags": [
          "recours_contrat"
        ]
      },
      "right": {
        "label": "Laisser l'agence filtrer",
        "effects": {
          "argent": 7,
          "energie": 5,
          "confiance": -8
        },
        "addFlags": [
          "filtre_agence"
        ]
      }
    }
  },
  {
    "id": "mona_independant",
    "step": 15,
    "title": "Un oui qui coûte",
    "speaker": "MONA · régie",
    "emoji": "💌",
    "channel": "MAIL",
    "text": "Mona propose une rémunération correcte pour une vidéo clairement sponsorisée. Le produit n'est pas mauvais. Il n'a juste rien à voir avec ta chaîne.",
    "choices": {
      "left": {
        "label": "N'accepter qu'un essai honnête",
        "effects": {
          "argent": 5,
          "confiance": 6,
          "energie": -3
        },
        "addFlags": [
          "essai_honnete"
        ]
      },
      "right": {
        "label": "Décliner pour garder le cap",
        "effects": {
          "argent": -6,
          "confiance": 7,
          "energie": 3
        },
        "addFlags": [
          "ligne_editoriale"
        ]
      }
    }
  },
  {
    "id": "nox_pacte",
    "step": 16,
    "title": "La caméra de secours",
    "speaker": "NOX · partenaire",
    "emoji": "🎥",
    "channel": "DM",
    "text": "Nox a cassé son matériel. Il te demande le vieux téléphone de ton premier live. Il sait que tu le gardes comme un souvenir.",
    "requiresFlags": [
      "pacte_tenu"
    ],
    "choices": {
      "left": {
        "label": "Prêter le téléphone",
        "effects": {
          "confiance": 8,
          "energie": -3,
          "public": -2
        },
        "addFlags": [
          "nox_telephone"
        ]
      },
      "right": {
        "label": "L'aider à trouver une location",
        "effects": {
          "argent": -5,
          "energie": 3,
          "confiance": 4
        },
        "addFlags": [
          "nox_location"
        ]
      }
    }
  },
  {
    "id": "nox_guerre",
    "step": 16,
    "title": "L'invitation empoisonnée",
    "speaker": "NOX · rival",
    "emoji": "⚡",
    "channel": "DM",
    "text": "Une émission veut vous asseoir face à face. Nox accepte, à condition que personne ne voie vos échanges avant l'antenne.",
    "requiresFlags": [
      "guerre_nox"
    ],
    "choices": {
      "left": {
        "label": "Exiger des règles communes",
        "effects": {
          "confiance": 8,
          "public": -5,
          "energie": -3
        },
        "addFlags": [
          "mediation_nox"
        ]
      },
      "right": {
        "label": "Accepter le duel surprise",
        "effects": {
          "public": 9,
          "energie": -5,
          "confiance": -5
        },
        "addFlags": [
          "duel_antenne"
        ]
      }
    }
  },
  {
    "id": "nox_silence",
    "step": 16,
    "title": "Le message vocal",
    "speaker": "NOX · créateur",
    "emoji": "🎧",
    "channel": "DM",
    "text": "Nox te félicite pour ton premier bilan. Vous n'avez pas exactement la même audience, ni les mêmes envies. Sa proposition : commenter un vieux jeu ensemble.",
    "choices": {
      "left": {
        "label": "L'inviter pour une soirée calme",
        "effects": {
          "public": 4,
          "confiance": 5,
          "energie": -4
        },
        "addFlags": [
          "nox_soiree"
        ]
      },
      "right": {
        "label": "Garder de la place pour toi",
        "effects": {
          "energie": 7,
          "public": -3,
          "confiance": 2
        },
        "addFlags": [
          "distance_nox"
        ]
      }
    }
  },
  {
    "id": "fan_frontiere",
    "step": 17,
    "title": "Le spectateur du portail",
    "speaker": "SAM · abonné",
    "emoji": "🚪",
    "channel": "CHAT",
    "text": "Un fan poste une photo de l'entrée de ton immeuble : « T'habites juste là ? » Il pense faire plaisir. Les messages privés commencent à s'accumuler.",
    "choices": {
      "left": {
        "label": "Rappeler les limites et le bloquer",
        "effects": {
          "confiance": 8,
          "public": -5,
          "energie": 4
        },
        "addFlags": [
          "limites_vie_privee"
        ]
      },
      "right": {
        "label": "Rire pour désamorcer",
        "effects": {
          "public": 6,
          "confiance": -7,
          "energie": -4
        },
        "addFlags": [
          "frontieres_floues"
        ]
      }
    }
  },
  {
    "id": "document_contrat",
    "step": 18,
    "title": "Le PDF qui ne meurt pas",
    "speaker": "LINA · journaliste",
    "emoji": "🧾",
    "channel": "MAIL",
    "text": "Lina prépare un article sur les placements publicitaires non signalés. Elle a une copie du contrat que tu pensais disparu. « Je te laisse répondre avant publication. »",
    "requiresFlags": [
      "preuve_effacee"
    ],
    "choices": {
      "left": {
        "label": "Lui envoyer les preuves intégrales",
        "effects": {
          "confiance": 10,
          "argent": -5,
          "public": -4
        },
        "addFlags": [
          "lina_preuves"
        ]
      },
      "right": {
        "label": "Répondre par un communiqué vague",
        "effects": {
          "public": 5,
          "argent": 4,
          "confiance": -9
        },
        "addFlags": [
          "communique_vague"
        ]
      }
    }
  },
  {
    "id": "demande_archive",
    "step": 18,
    "title": "Le droit de montrer",
    "speaker": "LINA · journaliste",
    "emoji": "🎞️",
    "channel": "MAIL",
    "text": "Lina veut illustrer son reportage avec les images de ton premier live. On y voit Flo et son ancien pseudo, qu'elle ne souhaite plus utiliser.",
    "choices": {
      "left": {
        "label": "Demander l'accord des personnes filmées",
        "effects": {
          "confiance": 7,
          "energie": -3,
          "public": -2
        },
        "addFlags": [
          "consentement_archives"
        ]
      },
      "right": {
        "label": "Autoriser les images tout de suite",
        "effects": {
          "public": 6,
          "argent": 3,
          "confiance": -7
        },
        "addFlags": [
          "archives_exposees"
        ]
      }
    }
  },
  {
    "id": "concert_collecte",
    "step": 19,
    "title": "Le direct solidaire",
    "speaker": "ASSOCIATION · invitation",
    "emoji": "🎗️",
    "channel": "LIVE",
    "text": "Une association te propose une collecte pendant un tournoi. Elle apporte les preuves de ses comptes ; ton équipe veut savoir qui gérera les dons.",
    "choices": {
      "left": {
        "label": "Déléguer la collecte à l'association",
        "effects": {
          "confiance": 8,
          "argent": -4,
          "energie": 3
        },
        "addFlags": [
          "collecte_verifiee"
        ]
      },
      "right": {
        "label": "Tout encaisser puis reverser",
        "effects": {
          "public": 8,
          "argent": 5,
          "confiance": -6
        },
        "addFlags": [
          "collecte_personnelle"
        ]
      }
    }
  },
  {
    "id": "lina_enquete",
    "step": 20,
    "title": "Trois questions sans montage",
    "speaker": "LINA · journaliste",
    "emoji": "📝",
    "channel": "MAIL",
    "text": "Lina a parlé à Flo, à Nox et à une ancienne salariée de Mona. Elle pose trois questions simples. Tu n'aimes pas toutes les réponses possibles.",
    "choices": {
      "left": {
        "label": "Répondre avec les documents",
        "effects": {
          "confiance": 9,
          "energie": -6,
          "public": -3
        },
        "addFlags": [
          "interview_complete"
        ]
      },
      "right": {
        "label": "Exiger de relire l'article",
        "effects": {
          "energie": 3,
          "public": 5,
          "confiance": -6
        },
        "addFlags": [
          "pression_presse"
        ]
      }
    }
  },
  {
    "id": "chat_blessure",
    "step": 21,
    "title": "Des mots que tu n'as pas dits",
    "speaker": "CHAT · spectatrices",
    "emoji": "🧯",
    "channel": "CHAT",
    "text": "Une abonnée raconte avoir quitté le serveur après des insultes. Personne ne les a supprimées. Ton propre silence est cité dans sa publication.",
    "requiresFlags": [
      "chat_toxique"
    ],
    "choices": {
      "left": {
        "label": "La contacter et revoir les signalements",
        "effects": {
          "confiance": 9,
          "energie": -5,
          "public": -4
        },
        "addFlags": [
          "reparation_chat"
        ]
      },
      "right": {
        "label": "Dire que le chat n'est pas toi",
        "effects": {
          "public": 6,
          "energie": 3,
          "confiance": -10
        },
        "addFlags": [
          "deni_chat"
        ]
      }
    }
  },
  {
    "id": "chat_refuge",
    "step": 21,
    "title": "Le salon sans caméra",
    "speaker": "FLO · équipe",
    "emoji": "🫶",
    "channel": "CHAT",
    "text": "Le salon communautaire organise une soirée sans toi. Au début, tu te sens exclu. Puis tu comprends que les gens y reviennent même sans diffusion.",
    "requiresFlags": [
      "communaute_saine"
    ],
    "choices": {
      "left": {
        "label": "Laisser la communauté s'organiser",
        "effects": {
          "confiance": 7,
          "energie": 6,
          "public": -3
        },
        "addFlags": [
          "communaute_autonome"
        ]
      },
      "right": {
        "label": "Faire une apparition surprise",
        "effects": {
          "public": 7,
          "energie": -5,
          "confiance": -3
        },
        "addFlags": [
          "apparition_flo"
        ]
      }
    }
  },
  {
    "id": "chat_equilibre",
    "step": 21,
    "title": "Le règlement en brouillon",
    "speaker": "TOI",
    "emoji": "📌",
    "channel": "CHAT",
    "text": "Trois modérateurs débattent d'un nouveau règlement. Tu peux prendre une soirée pour écouter leurs désaccords, ou publier un texte rapidement.",
    "choices": {
      "left": {
        "label": "Écouter avant d'arbitrer",
        "effects": {
          "confiance": 7,
          "energie": -4,
          "public": -2
        },
        "addFlags": [
          "reglement_discute"
        ]
      },
      "right": {
        "label": "Publier tes propres règles",
        "effects": {
          "energie": 4,
          "public": 5,
          "confiance": -5
        },
        "addFlags": [
          "reglement_impose"
        ]
      }
    }
  },
  {
    "id": "contrat_fantome",
    "step": 22,
    "title": "La deuxième enveloppe",
    "speaker": "MONA · régie",
    "emoji": "✉️",
    "channel": "CONTRAT",
    "text": "Mona t'offre une indemnité pour ne plus parler du premier contrat. Elle assure que « personne ne verra la différence ». Le document comporte une clause de confidentialité.",
    "requiresFlags": [
      "sponsor_cache"
    ],
    "choices": {
      "left": {
        "label": "Refuser le silence payé",
        "effects": {
          "confiance": 8,
          "argent": -7,
          "energie": 2
        },
        "addFlags": [
          "silence_refuse"
        ]
      },
      "right": {
        "label": "Encaisser l'indemnité",
        "effects": {
          "argent": 12,
          "confiance": -9,
          "public": 2
        },
        "addFlags": [
          "silence_vendu"
        ]
      }
    }
  },
  {
    "id": "contrat_propre",
    "step": 22,
    "title": "Une proposition publique",
    "speaker": "MONA · régie",
    "emoji": "📬",
    "channel": "MAIL",
    "text": "Une nouvelle marque accepte ton principe : annoncer la publicité avant le direct. En échange, elle ne financera qu'une seule émission.",
    "choices": {
      "left": {
        "label": "Tester un épisode déclaré",
        "effects": {
          "argent": 7,
          "confiance": 5,
          "energie": -4
        },
        "addFlags": [
          "marque_declaree"
        ]
      },
      "right": {
        "label": "Produire sans partenaire",
        "effects": {
          "energie": 4,
          "confiance": 5,
          "argent": -6
        },
        "addFlags": [
          "production_solo"
        ]
      }
    }
  },
  {
    "id": "minuit_cuisine",
    "step": 23,
    "title": "Le verre d'eau",
    "speaker": "TOI",
    "emoji": "🥛",
    "channel": "ARCHIVE",
    "text": "Il est presque minuit. Tu réécoutes un vieux message où tu disais vouloir créer « quand ça me rend heureux ». Demain matin, tu as une réunion à huit heures.",
    "choices": {
      "left": {
        "label": "Éteindre et dormir",
        "effects": {
          "energie": 10,
          "public": -5,
          "confiance": 3
        },
        "addFlags": [
          "nuit_repos"
        ]
      },
      "right": {
        "label": "Terminer le montage maintenant",
        "effects": {
          "public": 7,
          "argent": 3,
          "energie": -9
        },
        "addFlags": [
          "nuit_blanche"
        ]
      }
    }
  },
  {
    "id": "duo_en_suspens",
    "step": 24,
    "title": "Les vues ne se partagent pas",
    "speaker": "NOX · partenaire",
    "emoji": "🎛️",
    "channel": "CLIP",
    "text": "Le clip du duo dépasse toutes vos vidéos. L'annonceur ne veut payer qu'un seul compte. Nox ne demande pas la moitié : il demande ce que vaut votre parole.",
    "requiresFlags": [
      "duo_nox"
    ],
    "choices": {
      "left": {
        "label": "Signer un partage écrit",
        "effects": {
          "argent": -4,
          "confiance": 9,
          "energie": -3
        },
        "addFlags": [
          "partage_nox"
        ]
      },
      "right": {
        "label": "Proposer de compenser plus tard",
        "effects": {
          "argent": 7,
          "public": 4,
          "confiance": -8
        },
        "addFlags": [
          "dette_nox"
        ]
      }
    }
  },
  {
    "id": "vieux_rival",
    "step": 24,
    "title": "Un clip de 14 secondes",
    "speaker": "NOX · créateur",
    "emoji": "🎞️",
    "channel": "CLIP",
    "text": "Une compilation ressort ton vieux conflit avec Nox. Personne ne connaît la suite. Les commentaires inventent la conversation à votre place.",
    "choices": {
      "left": {
        "label": "Publier le contexte complet",
        "effects": {
          "confiance": 8,
          "public": -4,
          "energie": -3
        },
        "addFlags": [
          "contexte_nox"
        ]
      },
      "right": {
        "label": "Laisser le clip tourner",
        "effects": {
          "public": 8,
          "confiance": -6,
          "energie": 2
        },
        "addFlags": [
          "nostalgie_clash"
        ]
      }
    }
  },
  {
    "id": "archive_mensonge",
    "step": 25,
    "title": "La capture annotée",
    "speaker": "LINA · journaliste",
    "emoji": "🔎",
    "channel": "ARCHIVE",
    "text": "Lina publie deux captures : ton ancienne réponse et le contrat. Les dates ne correspondent pas. Un choix facile consisterait à effacer ton premier message.",
    "requiresFlags": [
      "mensonge_final"
    ],
    "choices": {
      "left": {
        "label": "Corriger l'erreur en public",
        "effects": {
          "confiance": 9,
          "public": -6,
          "argent": -4
        },
        "addFlags": [
          "correction_publique"
        ]
      },
      "right": {
        "label": "Mettre l'article sur le dos de Lina",
        "effects": {
          "public": 7,
          "energie": -5,
          "confiance": -9
        },
        "addFlags": [
          "attaque_lina"
        ]
      }
    }
  },
  {
    "id": "archive_memoire",
    "step": 25,
    "title": "La première chaise",
    "speaker": "FLO · archive",
    "emoji": "🪑",
    "channel": "ARCHIVE",
    "text": "Une petite chaîne ressort ton premier direct. On voit la chaise bancale, la lumière bleue, un sourire que tu avais oublié. Le chat demande ce que tu as perdu depuis.",
    "choices": {
      "left": {
        "label": "Reconnaître ce qui a changé",
        "effects": {
          "confiance": 7,
          "energie": 4,
          "public": -3
        },
        "addFlags": [
          "aveu_changement"
        ]
      },
      "right": {
        "label": "Transformer l'archive en publicité",
        "effects": {
          "public": 8,
          "argent": 5,
          "confiance": -5
        },
        "addFlags": [
          "archive_marketing"
        ]
      }
    }
  },
{
    "id": "dons_en_attente",
    "step": 26,
    "title": "Le compte de la collecte",
    "speaker": "ASSOCIATION · trésorière",
    "emoji": "💸",
    "channel": "MAIL",
    "text": "La trésorière attend le virement. Tu as laissé les dons passer par ton compte personnel ; un abonné demande pourquoi le montant affiché ne correspond pas aux reçus.",
    "requiresFlags": [
      "collecte_personnelle"
    ],
    "choices": {
      "left": {
        "label": "Publier les comptes et rembourser l'écart",
        "effects": {
          "argent": -10,
          "confiance": 10,
          "public": -5
        },
        "addFlags": [
          "audit_dons"
        ]
      },
      "right": {
        "label": "Attendre que l'orage passe",
        "effects": {
          "argent": 5,
          "public": 4,
          "confiance": -10
        },
        "addFlags": [
          "dons_opacite"
        ]
      }
    }
  },
  {
    "id": "dons_bonne_foi",
    "step": 26,
    "title": "Le reçu pour tout le monde",
    "speaker": "ASSOCIATION · trésorière",
    "emoji": "🧮",
    "channel": "MAIL",
    "text": "L'association t'envoie un bilan détaillé. Une seule ligne surprend ton chat : les frais de plateforme. La transparence coûte cinq minutes de direct.",
    "choices": {
      "left": {
        "label": "Expliquer chaque ligne",
        "effects": {
          "confiance": 8,
          "energie": -4,
          "public": -3
        },
        "addFlags": [
          "dons_expliques"
        ]
      },
      "right": {
        "label": "Renvoyer simplement vers le site",
        "effects": {
          "energie": 5,
          "public": 4,
          "confiance": -4
        },
        "addFlags": [
          "dons_delegues"
        ]
      }
    }
  },
  {
    "id": "panne_studio",
    "step": 27,
    "title": "Le studio sans électricité",
    "speaker": "TOI",
    "emoji": "🔌",
    "channel": "LIVE",
    "text": "Le disjoncteur coupe dix minutes avant un direct important. Tu pourrais diffuser depuis ton téléphone, comme le premier soir. Le technicien peut venir demain.",
    "choices": {
      "left": {
        "label": "Revenir au téléphone",
        "effects": {
          "argent": 6,
          "energie": 4,
          "public": -5
        },
        "addFlags": [
          "retour_telephone"
        ]
      },
      "right": {
        "label": "Louer un studio pour la soirée",
        "effects": {
          "argent": -11,
          "public": 8,
          "energie": -4
        },
        "addFlags": [
          "studio_loue"
        ]
      }
    }
  },
  {
    "id": "flo_charte",
    "step": 28,
    "title": "Quatre signatures",
    "speaker": "FLO · collectif",
    "emoji": "📋",
    "channel": "CONTRAT",
    "text": "La charte que vous avez écrite donne une voix égale à quatre membres. Flo vote contre un sponsor rentable. Le résultat est serré, et tu as promis de le respecter.",
    "requiresFlags": [
      "charte_collectif"
    ],
    "choices": {
      "left": {
        "label": "Accepter la décision commune",
        "effects": {
          "confiance": 10,
          "argent": -7,
          "energie": 5
        },
        "addFlags": [
          "vote_respecte"
        ]
      },
      "right": {
        "label": "Passer outre le vote",
        "effects": {
          "argent": 9,
          "public": 5,
          "confiance": -12
        },
        "addFlags": [
          "vote_trahi"
        ]
      }
    }
  },
  {
    "id": "flo_chef",
    "step": 28,
    "title": "Un message sans destinataire",
    "speaker": "FLO · collectif",
    "emoji": "🪶",
    "channel": "DM",
    "text": "Tu as gardé le dernier mot sur le collectif. Deux bénévoles sont partis sans bruit. Flo te demande si le mot « ensemble » existe encore dans ton projet.",
    "requiresFlags": [
      "chef_collectif"
    ],
    "choices": {
      "left": {
        "label": "Rendre un vrai pouvoir à l'équipe",
        "effects": {
          "confiance": 9,
          "energie": -4,
          "argent": -5
        },
        "addFlags": [
          "pouvoir_partage"
        ]
      },
      "right": {
        "label": "Recruter deux remplaçants",
        "effects": {
          "public": 5,
          "argent": -6,
          "confiance": -8
        },
        "addFlags": [
          "remplacement_equipe"
        ]
      }
    }
  },
  {
    "id": "flo_absente",
    "step": 28,
    "title": "Les règles portent une signature",
    "speaker": "FLO · archive",
    "emoji": "📎",
    "channel": "ARCHIVE",
    "text": "Le règlement du chat porte encore la signature de Flo. Des abonnés réclament son retour ; tu n'as jamais répondu à son dernier message.",
    "requiresFlags": [
      "rupture_flo"
    ],
    "choices": {
      "left": {
        "label": "Lui présenter des excuses sans exigence",
        "effects": {
          "confiance": 8,
          "energie": -5
        },
        "addFlags": [
          "excuses_flo_tardives"
        ]
      },
      "right": {
        "label": "Retirer son nom du document",
        "effects": {
          "public": 4,
          "energie": 3,
          "confiance": -8
        },
        "addFlags": [
          "memoire_flo_effacee"
        ]
      }
    }
  },
  {
    "id": "flo_horizon",
    "step": 28,
    "title": "Un siège réservé",
    "speaker": "FLO · amie",
    "emoji": "🪑",
    "channel": "CHAT",
    "text": "Flo a une nouvelle vie en dehors de la chaîne. Elle ne peut plus répondre à toutes les notifications. Tu regardes son siège vide avant d'ouvrir le direct.",
    "choices": {
      "left": {
        "label": "Accepter ses nouveaux horaires",
        "effects": {
          "energie": 6,
          "confiance": 7,
          "public": -4
        },
        "addFlags": [
          "horaires_flo"
        ]
      },
      "right": {
        "label": "Lui proposer un poste rémunéré",
        "effects": {
          "argent": -10,
          "confiance": 5,
          "energie": 3
        },
        "addFlags": [
          "poste_flo"
        ]
      }
    }
  },
  {
    "id": "nox_dette",
    "step": 29,
    "title": "La facture du duo",
    "speaker": "NOX · partenaire",
    "emoji": "🧾",
    "channel": "MAIL",
    "text": "Nox t'envoie le relevé des revenus du clip. Une ligne manque sur ta déclaration. Il n'a rien publié, mais il te demande une réponse avant minuit.",
    "requiresFlags": [
      "dette_nox"
    ],
    "choices": {
      "left": {
        "label": "Payer et corriger le relevé",
        "effects": {
          "argent": -10,
          "confiance": 9,
          "energie": -2
        },
        "addFlags": [
          "dette_nox_reglee"
        ]
      },
      "right": {
        "label": "Lui proposer de l'exposition",
        "effects": {
          "public": 8,
          "argent": 5,
          "confiance": -11
        },
        "addFlags": [
          "dette_nox_refusee"
        ]
      }
    }
  },
  {
    "id": "nox_mediation",
    "step": 29,
    "title": "Une table pour deux",
    "speaker": "NOX · rival",
    "emoji": "🕊️",
    "channel": "DM",
    "text": "L'émission accepte une médiation. Nox arrive sans caméra et pose un vieux casque sur la table : « J'ai aussi été injuste. Tu peux le dire, toi ? »",
    "requiresFlags": [
      "mediation_nox"
    ],
    "choices": {
      "left": {
        "label": "Reconnaître les torts des deux côtés",
        "effects": {
          "confiance": 10,
          "public": -5,
          "energie": 3
        },
        "addFlags": [
          "paix_durable_nox"
        ]
      },
      "right": {
        "label": "Exiger des excuses devant le chat",
        "effects": {
          "public": 7,
          "confiance": -8,
          "energie": -4
        },
        "addFlags": [
          "mediation_ratee"
        ]
      }
    }
  },
  {
    "id": "nox_contrat",
    "step": 29,
    "title": "Un montage à deux noms",
    "speaker": "NOX · créateur",
    "emoji": "🎬",
    "channel": "CLIP",
    "text": "Nox monte un documentaire sur vos premiers directs. Il a gardé le passage où tu hésites avant de publier son clip. « Je peux le laisser ? »",
    "choices": {
      "left": {
        "label": "Le laisser raconter votre histoire",
        "effects": {
          "confiance": 7,
          "public": 4,
          "energie": -4
        },
        "addFlags": [
          "memoire_nox_partagee"
        ]
      },
      "right": {
        "label": "Garder ce moment privé",
        "effects": {
          "energie": 5,
          "confiance": 4,
          "public": -3
        },
        "addFlags": [
          "memoire_nox_privee"
        ]
      }
    }
  },
  {
    "id": "mona_silence",
    "step": 30,
    "title": "Le prix d'une phrase",
    "speaker": "MONA · agence",
    "emoji": "🔒",
    "channel": "CONTRAT",
    "text": "Mona rappelle la clause de confidentialité que tu as acceptée. Lina souhaite entendre ton témoignage. Ton conseiller dit que parler pourrait te coûter cher.",
    "requiresFlags": [
      "silence_vendu"
    ],
    "choices": {
      "left": {
        "label": "Faire relire le contrat et témoigner",
        "effects": {
          "argent": -9,
          "confiance": 10,
          "energie": -5
        },
        "addFlags": [
          "rupture_silence_mona"
        ]
      },
      "right": {
        "label": "Protéger ton compte bancaire",
        "effects": {
          "argent": 8,
          "confiance": -9,
          "energie": 3
        },
        "addFlags": [
          "loyaute_mona"
        ]
      }
    }
  },
  {
    "id": "mona_filtres",
    "step": 30,
    "title": "Une vidéo sans ta voix",
    "speaker": "MONA · agence",
    "emoji": "📺",
    "channel": "CLIP",
    "text": "L'agence publie une vidéo approuvée par son comité. Tu y souris sans jamais parler. Des abonnés demandent si tu vas bien.",
    "requiresFlags": [
      "filtre_agence"
    ],
    "choices": {
      "left": {
        "label": "Réclamer le contrôle éditorial",
        "effects": {
          "confiance": 9,
          "argent": -6,
          "energie": -4
        },
        "addFlags": [
          "reprise_voix"
        ]
      },
      "right": {
        "label": "Accepter la campagne",
        "effects": {
          "argent": 10,
          "public": 6,
          "confiance": -9
        },
        "addFlags": [
          "image_louee"
        ]
      }
    }
  },
  {
    "id": "mona_nouveau",
    "step": 30,
    "title": "La dernière proposition",
    "speaker": "MONA · régie",
    "emoji": "💼",
    "channel": "MAIL",
    "text": "Mona propose une tournée de créateurs. Le contrat est lisible, mais les dates t'empêcheraient d'aller au mariage d'un proche.",
    "choices": {
      "left": {
        "label": "Négocier un calendrier humain",
        "effects": {
          "confiance": 7,
          "energie": 4,
          "argent": -6
        },
        "addFlags": [
          "calendrier_humain"
        ]
      },
      "right": {
        "label": "Accepter la tournée complète",
        "effects": {
          "argent": 10,
          "public": 7,
          "energie": -8
        },
        "addFlags": [
          "tournee_mona"
        ]
      }
    }
  },
  {
    "id": "lina_verite",
    "step": 31,
    "title": "Le silence de la source",
    "speaker": "LINA · journaliste",
    "emoji": "🎙️",
    "channel": "DM",
    "text": "Lina t'avoue qu'une source lui a demandé de masquer son nom. Ton chat veut connaître cette personne ; Lina refuse. Même un bon article peut mettre quelqu'un en danger.",
    "choices": {
      "left": {
        "label": "Défendre le secret de la source",
        "effects": {
          "confiance": 8,
          "public": -4,
          "energie": 3
        },
        "addFlags": [
          "source_protegee"
        ]
      },
      "right": {
        "label": "Exiger le nom en direct",
        "effects": {
          "public": 8,
          "confiance": -10,
          "energie": -5
        },
        "addFlags": [
          "source_menacee"
        ]
      }
    }
  },
  {
    "id": "fan_retour",
    "step": 32,
    "title": "La porte de chez toi",
    "speaker": "SAM · abonné",
    "emoji": "📍",
    "channel": "DM",
    "text": "Sam t'écrit qu'il a compris la limite posée devant ton immeuble. Il demande si tu acceptes ses excuses. Tu sais qu'une réponse publique attirerait encore l'attention.",
    "requiresFlags": [
      "limites_vie_privee"
    ],
    "choices": {
      "left": {
        "label": "Répondre discrètement sans relancer",
        "effects": {
          "confiance": 6,
          "energie": 4,
          "public": -3
        },
        "addFlags": [
          "sam_limite_acceptee"
        ]
      },
      "right": {
        "label": "Faire une vidéo sur son cas",
        "effects": {
          "public": 8,
          "confiance": -7,
          "energie": -4
        },
        "addFlags": [
          "sam_expose"
        ]
      }
    }
  },
  {
    "id": "fan_dox",
    "step": 32,
    "title": "Le lieu sur une capture",
    "speaker": "CHAT · alerte",
    "emoji": "🚨",
    "channel": "CHAT",
    "text": "Une capture avec ton quartier circule. Tu avais ri quand un abonné était venu devant chez toi. Plusieurs personnes pensent maintenant que c'est autorisé.",
    "requiresFlags": [
      "frontieres_floues"
    ],
    "choices": {
      "left": {
        "label": "Faire retirer les informations privées",
        "effects": {
          "energie": -5,
          "public": -4,
          "confiance": 8
        },
        "addFlags": [
          "adresse_protegee"
        ]
      },
      "right": {
        "label": "Quitter le live sans explication",
        "effects": {
          "energie": 5,
          "confiance": -5,
          "public": -3
        },
        "addFlags": [
          "depart_sans_expliquer"
        ]
      }
    }
  },
  {
    "id": "fan_rencontre",
    "step": 32,
    "title": "La convention des visages",
    "speaker": "SAM · abonné",
    "emoji": "🎟️",
    "channel": "CHAT",
    "text": "Pour la première fois, tu rencontres des abonnés en personne. Une jeune fan te tend un dessin. La file avance et ton équipe annonce que la salle ferme.",
    "choices": {
      "left": {
        "label": "Prendre le temps de remercier",
        "effects": {
          "public": -3,
          "confiance": 7,
          "energie": -5
        },
        "addFlags": [
          "fan_remecie"
        ]
      },
      "right": {
        "label": "Signer vite pour voir tout le monde",
        "effects": {
          "public": 7,
          "energie": 4,
          "confiance": -4
        },
        "addFlags": [
          "signature_rapide"
        ]
      }
    }
  },
  {
    "id": "plateforme_alerte",
    "step": 33,
    "title": "La diffusion limitée",
    "speaker": "PLATEFORME · notification",
    "emoji": "⛔",
    "channel": "MAIL",
    "text": "La plateforme suspend les recommandations de ton prochain direct pendant 48 heures. Motif : plusieurs signalements. Rien ne dit encore s'ils sont justifiés.",
    "choices": {
      "left": {
        "label": "Contester avec un dossier vérifiable",
        "effects": {
          "confiance": 7,
          "energie": -6,
          "public": -4
        },
        "addFlags": [
          "recours_plateforme"
        ]
      },
      "right": {
        "label": "Déplacer le live sans expliquer",
        "effects": {
          "public": 6,
          "energie": 3,
          "confiance": -6
        },
        "addFlags": [
          "live_deplace"
        ]
      }
    }
  },
  {
    "id": "pause_obligee",
    "step": 34,
    "title": "Les vingt minutes de silence",
    "speaker": "TOI",
    "emoji": "🫗",
    "channel": "ARCHIVE",
    "text": "Ton casque reste sur la table. Personne ne t'oblige à ouvrir le logiciel ce soir. Pourtant tu tends la main vers la souris, machinalement.",
    "choices": {
      "left": {
        "label": "Sortir marcher sans téléphone",
        "effects": {
          "energie": 12,
          "public": -6,
          "confiance": 3
        },
        "addFlags": [
          "vraie_pause"
        ]
      },
      "right": {
        "label": "Faire un direct surprise de vingt minutes",
        "effects": {
          "public": 7,
          "energie": -9,
          "argent": 3
        },
        "addFlags": [
          "pause_refusee"
        ]
      }
    }
  },
  {
    "id": "retour_origine",
    "step": 35,
    "title": "La vidéo zéro",
    "speaker": "TOI",
    "emoji": "📼",
    "channel": "ARCHIVE",
    "text": "Tu revisionnes ton premier direct. Au fond, la lumière grésille. À l'écran, tu remercies une personne d'être venue, sans regarder le compteur.",
    "choices": {
      "left": {
        "label": "Enregistrer un message pour cette personne",
        "effects": {
          "confiance": 8,
          "energie": 4,
          "public": -2
        },
        "addFlags": [
          "message_origine"
        ]
      },
      "right": {
        "label": "Préparer un clip anniversaire",
        "effects": {
          "public": 8,
          "argent": 4,
          "energie": -5
        },
        "addFlags": [
          "anniversaire_viral"
        ]
      }
    }
  },
  {
    "id": "offre_derniere",
    "step": 36,
    "title": "Le contrat du direct final",
    "speaker": "MONA · régie",
    "emoji": "🖋️",
    "channel": "CONTRAT",
    "text": "Un annonceur propose de financer le grand direct de clôture. Une condition : remplacer les questions spontanées par un texte validé avant l'émission.",
    "choices": {
      "left": {
        "label": "Garder les questions libres",
        "effects": {
          "confiance": 9,
          "argent": -7,
          "energie": 3
        },
        "addFlags": [
          "questions_libres"
        ]
      },
      "right": {
        "label": "Accepter le texte préparé",
        "effects": {
          "argent": 11,
          "public": 7,
          "confiance": -9
        },
        "addFlags": [
          "direct_scripte"
        ]
      }
    }
  },
  {
    "id": "flo_reconcilie",
    "step": 37,
    "title": "Le casque de secours",
    "speaker": "FLO · amie",
    "emoji": "🎧",
    "channel": "DM",
    "text": "Flo répond enfin à tes excuses. « Je ne reviens pas modérer. Mais je peux regarder le dernier direct, comme au premier jour. » Elle n'attend pas de promesse.",
    "requiresFlags": [
      "excuses_flo_tardives"
    ],
    "choices": {
      "left": {
        "label": "L'inviter comme simple spectatrice",
        "effects": {
          "confiance": 10,
          "energie": 4,
          "public": -3
        },
        "addFlags": [
          "flo_spectatrice_libre"
        ]
      },
      "right": {
        "label": "Lui proposer un retour devant caméra",
        "effects": {
          "public": 6,
          "confiance": -7,
          "energie": -3
        },
        "addFlags": [
          "flo_retour_force"
        ]
      }
    }
  },
  {
    "id": "flo_bilan",
    "step": 37,
    "title": "Le message de vingt-deux heures",
    "speaker": "FLO · modératrice",
    "emoji": "💬",
    "channel": "DM",
    "text": "Flo t'envoie : « Pour le dernier direct, je resterai jusqu'à vingt-deux heures. Après, j'ai ma vie. Tu n'as pas besoin d'y mettre un compteur. »",
    "choices": {
      "left": {
        "label": "Préparer une relève avant vingt-deux heures",
        "effects": {
          "confiance": 8,
          "energie": 5,
          "argent": -4
        },
        "addFlags": [
          "releve_flo"
        ]
      },
      "right": {
        "label": "Promettre de finir tôt et improviser",
        "effects": {
          "public": 7,
          "energie": -5,
          "confiance": -6
        },
        "addFlags": [
          "promesse_flo_floue"
        ]
      }
    }
  },
  {
    "id": "nox_paix",
    "step": 38,
    "title": "Le siège voisin",
    "speaker": "NOX · partenaire",
    "emoji": "🪑",
    "channel": "DM",
    "text": "Nox est venu au studio avec un micro et aucune équipe. « Si tu veux, je peux m'asseoir là. Sinon je regarderai de chez moi. »",
    "requiresFlags": [
      "paix_durable_nox"
    ],
    "choices": {
      "left": {
        "label": "Lui donner le micro, sans conditions",
        "effects": {
          "confiance": 8,
          "public": 5,
          "energie": -3
        },
        "addFlags": [
          "nox_scene_partagee"
        ]
      },
      "right": {
        "label": "Faire la conclusion en solo",
        "effects": {
          "energie": 5,
          "confiance": 3,
          "public": -3
        },
        "addFlags": [
          "nox_place_spectateur"
        ]
      }
    }
  },
  {
    "id": "nox_compte",
    "step": 38,
    "title": "Le dernier classement",
    "speaker": "NOX · rival",
    "emoji": "📊",
    "channel": "CLIP",
    "text": "Une chaîne de clips affiche vos audiences côte à côte. Nox ne t'a pas adressé un mot depuis des semaines. Tu peux désamorcer la comparaison, ou jouer à ce jeu.",
    "requiresFlags": [
      "guerre_nox"
    ],
    "choices": {
      "left": {
        "label": "Refuser la comparaison en direct",
        "effects": {
          "confiance": 8,
          "public": -5,
          "energie": 4
        },
        "addFlags": [
          "classement_refuse"
        ]
      },
      "right": {
        "label": "Relancer la rivalité pour la finale",
        "effects": {
          "public": 11,
          "energie": -6,
          "confiance": -9
        },
        "addFlags": [
          "rivalite_finale"
        ]
      }
    }
  },
  {
    "id": "nox_generique",
    "step": 38,
    "title": "Les noms au générique",
    "speaker": "NOX · créateur",
    "emoji": "🎚️",
    "channel": "DM",
    "text": "Nox t'envoie une photo du vieux duo. Tu n'as pas toujours été juste avec lui. Il demande simplement : « Est-ce qu'on peut garder au moins le souvenir ? »",
    "choices": {
      "left": {
        "label": "Le créditer devant le public",
        "effects": {
          "confiance": 7,
          "energie": -3,
          "public": 3
        },
        "addFlags": [
          "nox_credit_final"
        ]
      },
      "right": {
        "label": "Lui répondre en privé",
        "effects": {
          "energie": 5,
          "confiance": 4,
          "public": -2
        },
        "addFlags": [
          "nox_prive_final"
        ]
      }
    }
  },
  {
    "id": "grand_final_collectif",
    "step": 39,
    "title": "Quatre micros allumés",
    "speaker": "FLO · collectif",
    "emoji": "🎚️",
    "channel": "LIVE",
    "text": "Le studio est plein. Flo vérifie son horaire, Lina s'assoit au fond, les bénévoles ont chacun leur micro. Le chat demande à qui appartient vraiment cette chaîne.",
    "requiresFlags": [
      "vote_respecte"
    ],
    "choices": {
      "left": {
        "label": "Partager les décisions à l'antenne",
        "effects": {
          "confiance": 10,
          "energie": 6,
          "argent": -5
        },
        "addFlags": [
          "saison_collective"
        ]
      },
      "right": {
        "label": "Présenter l'équipe puis reprendre seul",
        "effects": {
          "public": 9,
          "argent": 6,
          "confiance": -7
        },
        "addFlags": [
          "saison_vedette"
        ]
      }
    }
  },
  {
    "id": "grand_final_nox",
    "step": 39,
    "title": "Deux voix dans le casque",
    "speaker": "NOX · partenaire",
    "emoji": "🎧",
    "channel": "LIVE",
    "text": "Ton dernier direct commence avec une voix familière : Nox. Vous ne vous êtes pas toujours compris. Les deux chats s'affichent sur le même écran.",
    "requiresFlags": [
      "nox_scene_partagee"
    ],
    "choices": {
      "left": {
        "label": "Partager la scène et le générique",
        "effects": {
          "confiance": 9,
          "public": 5,
          "energie": -4
        },
        "addFlags": [
          "saison_duo"
        ]
      },
      "right": {
        "label": "Lui confier le dernier mot",
        "effects": {
          "confiance": 11,
          "public": -4,
          "energie": 6
        },
        "addFlags": [
          "saison_transmission"
        ]
      }
    }
  },
  {
    "id": "grand_final_verite",
    "step": 39,
    "title": "L'archive ouverte",
    "speaker": "LINA · journaliste",
    "emoji": "📁",
    "channel": "LIVE",
    "text": "Lina accepte de répondre à tes questions en direct. Tu poses sur le bureau les contrats, les corrections et les reçus que tu avais préféré ne pas regarder.",
    "requiresFlags": [
      "lina_preuves"
    ],
    "choices": {
      "left": {
        "label": "Montrer les documents sans couper",
        "effects": {
          "confiance": 12,
          "argent": -5,
          "public": -5
        },
        "addFlags": [
          "saison_transparente"
        ]
      },
      "right": {
        "label": "Ne raconter que ce que tu peux défendre",
        "effects": {
          "confiance": 4,
          "public": 8,
          "energie": -4
        },
        "addFlags": [
          "saison_ambigue"
        ]
      }
    }
  },
  {
    "id": "grand_final",
    "step": 39,
    "title": "Un seul bouton rouge",
    "speaker": "TOI",
    "emoji": "🔴",
    "channel": "LIVE",
    "text": "Le compteur défile. Dans le reflet noir de l'écran, tu reconnais la pièce du premier soir. Tu ne contrôles pas les réactions, seulement ce que tu vas dire maintenant.",
    "choices": {
      "left": {
        "label": "Raconter les choix et leurs coûts",
        "effects": {
          "confiance": 10,
          "energie": 5,
          "public": -4
        },
        "addFlags": [
          "saison_verite"
        ]
      },
      "right": {
        "label": "Offrir un spectacle sans explication",
        "effects": {
          "public": 10,
          "argent": 6,
          "energie": -8
        },
        "addFlags": [
          "saison_spectacle"
        ]
      }
    }
  }
];
