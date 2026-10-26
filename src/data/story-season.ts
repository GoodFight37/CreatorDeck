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
  }
];
