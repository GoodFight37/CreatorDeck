export type DemoUniverseId = "twitch" | "fiction";

export type DemoCard = {
  id: string;
  name: string;
  subtitle: string;
  kindLabel: string;
  universeId: DemoUniverseId;
  universeLabel: string;
  rarity: string;
  owned: boolean;
  monogram: string;
  artwork: "aurora" | "orbit" | "prism" | "tide" | "signal" | "ember" | "petal" | "eclipse" | "mosaic" | "comet";
};

export type DemoRanking = {
  universeId: DemoUniverseId;
  title: string;
  eyebrow: string;
  description: string;
  yourRank: number;
  rankedCollectors: number;
  collectedCards: number;
  totalCards: number;
  leaders: Array<{
    rank: number;
    name: string;
    collectedCards: number;
    totalCards: number;
  }>;
};

/**
 * Données jetables réservées à /catalogue-demo. Aucun nom, compte,
 * illustration ou résultat ne provient du jeu, de Twitch ou d'une licence.
 */
export const DEMO_CARDS: DemoCard[] = [
  {
    id: "twitch-liora",
    name: "Liora Flux",
    subtitle: "@demo_liora_flux",
    kindLabel: "Créatrice fictive · Twitch",
    universeId: "twitch",
    universeLabel: "Créateurs Twitch",
    rarity: "Légendaire",
    owned: true,
    monogram: "LF",
    artwork: "aurora",
  },
  {
    id: "twitch-malo",
    name: "Malo Météore",
    subtitle: "@demo_malo_meteore",
    kindLabel: "Créateur fictif · Twitch",
    universeId: "twitch",
    universeLabel: "Créateurs Twitch",
    rarity: "Épique",
    owned: true,
    monogram: "MM",
    artwork: "comet",
  },
  {
    id: "twitch-naya",
    name: "Naya Pixel",
    subtitle: "@demo_naya_pixel",
    kindLabel: "Créatrice fictive · Twitch",
    universeId: "twitch",
    universeLabel: "Créateurs Twitch",
    rarity: "Rare",
    owned: true,
    monogram: "NP",
    artwork: "prism",
  },
  {
    id: "twitch-basile",
    name: "Basile Byte",
    subtitle: "@demo_basile_byte",
    kindLabel: "Créateur fictif · Twitch",
    universeId: "twitch",
    universeLabel: "Créateurs Twitch",
    rarity: "Commun",
    owned: false,
    monogram: "BB",
    artwork: "signal",
  },
  {
    id: "twitch-sora",
    name: "Sora Nuage",
    subtitle: "@demo_sora_nuage",
    kindLabel: "Créatrice fictive · Twitch",
    universeId: "twitch",
    universeLabel: "Créateurs Twitch",
    rarity: "Rare",
    owned: true,
    monogram: "SN",
    artwork: "tide",
  },
  {
    id: "velune-elya",
    name: "Elya Solen",
    subtitle: "Gardienne des lucioles",
    kindLabel: "Personnage fictif",
    universeId: "fiction",
    universeLabel: "Chroniques de Velune",
    rarity: "Légendaire",
    owned: true,
    monogram: "ES",
    artwork: "eclipse",
  },
  {
    id: "velune-kael",
    name: "Kael d’Opale",
    subtitle: "Cartographe des marées",
    kindLabel: "Personnage fictif",
    universeId: "fiction",
    universeLabel: "Chroniques de Velune",
    rarity: "Épique",
    owned: true,
    monogram: "KO",
    artwork: "prism",
  },
  {
    id: "velune-mira",
    name: "Mira Courant",
    subtitle: "Messagère des îles hautes",
    kindLabel: "Personnage fictif",
    universeId: "fiction",
    universeLabel: "Chroniques de Velune",
    rarity: "Rare",
    owned: false,
    monogram: "MC",
    artwork: "tide",
  },
  {
    id: "velune-orin",
    name: "Orin-9",
    subtitle: "Archiviste des vents",
    kindLabel: "Personnage fictif",
    universeId: "fiction",
    universeLabel: "Chroniques de Velune",
    rarity: "Commun",
    owned: true,
    monogram: "O9",
    artwork: "mosaic",
  },
  {
    id: "velune-veya",
    name: "Veya Brume",
    subtitle: "Veilleuse du phare bleu",
    kindLabel: "Personnage fictif",
    universeId: "fiction",
    universeLabel: "Chroniques de Velune",
    rarity: "Rare",
    owned: true,
    monogram: "VB",
    artwork: "petal",
  },
];

export const DEMO_RANKINGS: DemoRanking[] = [
  {
    universeId: "twitch",
    title: "Créateurs Twitch",
    eyebrow: "UNIVERS 01 · LIVE DÉMO",
    description: "Créateurs et collectionneurs entièrement inventés.",
    yourRank: 8,
    rankedCollectors: 46,
    collectedCards: 4,
    totalCards: 5,
    leaders: [
      { rank: 1, name: "Orbite Miel", collectedCards: 5, totalCards: 5 },
      { rank: 2, name: "Météore Satin", collectedCards: 5, totalCards: 5 },
      { rank: 3, name: "Pollen Pixel", collectedCards: 5, totalCards: 5 },
    ],
  },
  {
    universeId: "fiction",
    title: "Chroniques de Velune",
    eyebrow: "UNIVERS 02 · FICTION DÉMO",
    description: "Personnages et collectionneurs entièrement inventés.",
    yourRank: 4,
    rankedCollectors: 28,
    collectedCards: 4,
    totalCards: 5,
    leaders: [
      { rank: 1, name: "Nacre Nocturne", collectedCards: 5, totalCards: 5 },
      { rank: 2, name: "Aube Oblique", collectedCards: 5, totalCards: 5 },
      { rank: 3, name: "Mousse Astrale", collectedCards: 5, totalCards: 5 },
    ],
  },
];
