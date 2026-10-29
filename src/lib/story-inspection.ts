import type { StoryScene } from "./story-mode";

export interface StoryEvidence {
  id: string;
  kind: string;
  label: string;
  value: string;
}

export interface StoryInspection {
  sceneId: string;
  caseName: string;
  instruction: string;
  evidence: readonly [StoryEvidence, StoryEvidence, StoryEvidence];
  /** Paire réellement révélatrice, vérifiée contre le texte de la scène. */
  cluePair: readonly [string, string];
  clue: string;
}

/**
 * Des mini-enquêtes écrites à partir de scènes existantes de CreatorDeck.
 * Elles ne contiennent ni indice sur une scène future, ni nouvelle règle, ni
 * ressource tierce. Le joueur peut toujours décider sans ouvrir le dossier.
 */
const CASES: readonly StoryInspection[] = [
  {
    sceneId: "premier_sponsor", caseName: "Une campagne discrète",
    instruction: "Repère les deux pièces qui ne vont pas ensemble.",
    evidence: [
      { id: "offre", kind: "PROPOSITION", label: "La campagne", value: "Une boisson inconnue veut financer ta chaîne." },
      { id: "loyer", kind: "COMPTE", label: "La dépense", value: "L'argent promis couvrirait ton loyer." },
      { id: "brief", kind: "CONSIGNE", label: "La mention", value: "La marque demande de ne pas dire « publicité »." },
    ],
    cluePair: ["offre", "brief"],
    clue: "La marque paie pour une promotion, mais veut cacher au public qu'il s'agit de publicité. Le loyer n'efface pas cette contradiction.",
  },
  {
    sceneId: "sponsor_retour", caseName: "Le contrat qui circule",
    instruction: "Recoupe la réaction publique avec la consigne reçue.",
    evidence: [
      { id: "capture", kind: "CAPTURE", label: "Le contrat", value: "Une copie du partenariat caché circule." },
      { id: "consigne", kind: "MESSAGE", label: "La demande de Mona", value: "Supprimer les questions du chat." },
      { id: "flo", kind: "CHAT", label: "La question de Flo", value: "« On leur ment vraiment ? »" },
    ],
    cluePair: ["consigne", "flo"],
    clue: "Le chat cherche une explication, mais Mona veut supprimer les questions. Masquer les réactions n'effacera pas la capture.",
  },
  {
    sceneId: "agence", caseName: "Le prix de l'exclusivité",
    instruction: "Cherche ce qui accompagne réellement le revenu garanti.",
    evidence: [
      { id: "revenus", kind: "OFFRE", label: "La promesse", value: "Un revenu stable pour la chaîne." },
      { id: "calendrier", kind: "ANNEXE", label: "Le planning", value: "L'agence impose un calendrier de vidéos." },
      { id: "validation", kind: "CLAUSE", label: "Le comité", value: "Un comité inconnu valide les publications." },
    ],
    cluePair: ["revenus", "validation"],
    clue: "L'argent est garanti, mais pas ta liberté éditoriale : le comité pourra décider des vidéos diffusées.",
  },
  {
    sceneId: "mona_exclusif", caseName: "La clause huit",
    instruction: "Cherche le droit caché derrière la signature.",
    evidence: [
      { id: "signature", kind: "CONTRAT", label: "L'accord", value: "L'agence te demande de signer." },
      { id: "image", kind: "JUSTIFICATION", label: "Image de marque", value: "Les vidéos doivent être « conformes »." },
      { id: "effacement", kind: "CLAUSE 08", label: "Retrait de live", value: "L'agence peut faire effacer un direct." },
    ],
    cluePair: ["signature", "effacement"],
    clue: "En signant, tu autoriserais l'agence à retirer des directs jugés non conformes. Ce pouvoir ne concerne pas que les sponsors.",
  },
  {
    sceneId: "contrat_fantome", caseName: "La deuxième enveloppe",
    instruction: "Compare le paiement proposé à la condition écrite.",
    evidence: [
      { id: "paiement", kind: "PROPOSITION", label: "L'indemnité", value: "Mona propose une somme en compensation." },
      { id: "message", kind: "MESSAGE", label: "Sa promesse", value: "« Personne ne verra la différence. »" },
      { id: "silence", kind: "CLAUSE", label: "Confidentialité", value: "Interdiction de parler du premier contrat." },
    ],
    cluePair: ["paiement", "silence"],
    clue: "L'indemnité n'est pas gratuite : elle est conditionnée au silence sur l'ancien contrat.",
  },
  {
    sceneId: "archive_mensonge", caseName: "Deux captures, deux dates",
    instruction: "Identifie les deux traces qui se contredisent.",
    evidence: [
      { id: "reponse", kind: "CAPTURE A", label: "Ton ancienne réponse", value: "Une réponse datée a été conservée." },
      { id: "contrat", kind: "CAPTURE B", label: "Le contrat", value: "Sa date ne correspond pas à celle de ta réponse." },
      { id: "effacement", kind: "ACTION", label: "Supprimer le message", value: "L'ancienne réponse pourrait disparaître de ton profil." },
    ],
    cluePair: ["reponse", "contrat"],
    clue: "Lina possède deux preuves dont les dates se contredisent. Effacer ton message ne changera pas les captures déjà publiées.",
  },
  {
    sceneId: "dons_en_attente", caseName: "Le compte de la collecte",
    instruction: "Recoupe ce qui a été annoncé avec les justificatifs.",
    evidence: [
      { id: "annonce", kind: "DIRECT", label: "Le total affiché", value: "Un montant annoncé au public." },
      { id: "recu", kind: "JUSTIFICATIF", label: "Les reçus", value: "Le montant reçu ne correspond pas au total affiché." },
      { id: "compte", kind: "TRANSIT", label: "Le compte utilisé", value: "Les dons sont passés par ton compte personnel." },
    ],
    cluePair: ["annonce", "recu"],
    clue: "Le total montré pendant le live ne correspond pas aux reçus. Avant d'accuser qui que ce soit, il faut rapprocher les montants.",
  },
  {
    sceneId: "demande_archive", caseName: "Des images sans autorisation",
    instruction: "Vérifie ce que la vidéo montre et ce que Flo accepte.",
    evidence: [
      { id: "reportage", kind: "PROJET", label: "Le sujet de Lina", value: "Un reportage illustré par ton tout premier live." },
      { id: "capture", kind: "ARCHIVE", label: "Les images", value: "Flo apparaît avec son ancien pseudo." },
      { id: "accord", kind: "MESSAGE", label: "La réserve de Flo", value: "Flo ne souhaite plus voir ce pseudo utilisé." },
    ],
    cluePair: ["capture", "accord"],
    clue: "La vidéo rend visible un ancien pseudo que Flo ne veut plus utiliser. L'existence d'une archive ne vaut pas consentement à sa republication.",
  },
  {
    sceneId: "dons_bonne_foi", caseName: "Une ligne sur le bilan",
    instruction: "Relie le relevé comptable à la réaction du public.",
    evidence: [
      { id: "bilan", kind: "RELEVÉ", label: "Le bilan", value: "L'association transmet un document détaillé." },
      { id: "frais", kind: "LIGNE 04", label: "Les frais", value: "Une ligne précise les frais prélevés par la plateforme." },
      { id: "chat", kind: "RÉACTION", label: "Le chat", value: "Les spectateurs s'étonnent de cette ligne." },
    ],
    cluePair: ["frais", "chat"],
    clue: "La ligne surprend le public, mais elle apparaît dans le bilan détaillé. Expliquer les frais est différent de dissimuler une somme.",
  },
  {
    sceneId: "flo_charte", caseName: "Le vote du collectif",
    instruction: "Compare la règle commune et la proposition rentable.",
    evidence: [
      { id: "charte", kind: "CHARTE", label: "Quatre voix", value: "Chaque membre du collectif dispose de la même voix." },
      { id: "sponsor", kind: "OFFRE", label: "Le partenariat", value: "Un sponsor propose une rémunération importante." },
      { id: "vote", kind: "PROCÈS-VERBAL", label: "Le désaccord", value: "Flo vote contre l'offre et tu as promis de respecter la décision commune." },
    ],
    cluePair: ["charte", "vote"],
    clue: "Tu t'es engagé à respecter le vote collectif. Le montant du sponsor ne te donne pas une voix supplémentaire.",
  },
  {
    sceneId: "nox_dette", caseName: "La ligne manquante",
    instruction: "Vérifie si la déclaration correspond au relevé transmis.",
    evidence: [
      { id: "releve", kind: "RELEVÉ", label: "Les revenus du clip", value: "Nox envoie un relevé des revenus." },
      { id: "declaration", kind: "DÉCLARATION", label: "Ta copie", value: "Une ligne du relevé ne figure pas sur la déclaration." },
      { id: "delai", kind: "MESSAGE", label: "La relance", value: "Nox demande une réponse avant minuit." },
    ],
    cluePair: ["releve", "declaration"],
    clue: "Les montants ne peuvent pas être validés tant qu'une ligne du relevé manque sur ta déclaration. La question est celle du partage réel, pas des vues.",
  },
  {
    sceneId: "mona_silence", caseName: "Une parole sous contrat",
    instruction: "Mets en parallèle ce que tu as signé et ce que demande Lina.",
    evidence: [
      { id: "clause", kind: "CONTRAT", label: "La confidentialité", value: "Tu as accepté une clause de silence." },
      { id: "temoin", kind: "DEMANDE", label: "L'entretien de Lina", value: "Lina souhaite recueillir ton témoignage." },
      { id: "conseil", kind: "AVIS", label: "Le risque", value: "Ton conseiller prévient que parler pourrait coûter cher." },
    ],
    cluePair: ["clause", "temoin"],
    clue: "Lina te demande de parler d'une affaire couverte par la clause signée. Le témoignage a un coût potentiel qu'il faut comprendre avant de choisir.",
  },
  {
    sceneId: "offre_derniere", caseName: "Le direct sous conditions",
    instruction: "Repère la condition qui change la nature du direct.",
    evidence: [
      { id: "budget", kind: "FINANCEMENT", label: "Le sponsor", value: "Un annonceur paie le direct final." },
      { id: "questions", kind: "ÉMISSION", label: "Le format prévu", value: "Le public doit pouvoir poser des questions spontanées." },
      { id: "script", kind: "CLAUSE", label: "La validation", value: "Le sponsor impose un texte approuvé à l'avance." },
    ],
    cluePair: ["questions", "script"],
    clue: "Un script validé remplace les échanges spontanés. Le direct serait financé, mais les questions du public ne seraient plus libres.",
  },
];

const BY_SCENE = new Map(CASES.map(entry => [entry.sceneId, entry]));

export function storyInspectionFor(scene: Pick<StoryScene, "id">): StoryInspection | null {
  return BY_SCENE.get(scene.id) ?? null;
}

export function compareStoryEvidence(spec: StoryInspection, selected: readonly string[]): { spotted: boolean; heading: string; detail: string } | null {
  if (selected.length !== 2 || selected[0] === selected[1]) return null;
  const allowed = new Set(spec.evidence.map(item => item.id));
  if (!allowed.has(selected[0]) || !allowed.has(selected[1])) return null;
  const spotted = spec.cluePair.every(id => selected.includes(id));
  return spotted
    ? { spotted: true, heading: "Indice recoupé", detail: spec.clue }
    : { spotted: false, heading: "Pas de contradiction prouvée", detail: "Ces deux pièces ne suffisent pas à expliquer le problème. Essaie une autre comparaison, ou prends ta décision." };
}

export function allStoryInspections(): readonly StoryInspection[] {
  return CASES;
}
