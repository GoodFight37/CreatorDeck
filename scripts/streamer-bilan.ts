/**
 * Le **bilan des courbes** de « Ta chaîne » : les chiffres qu'on veut sous les
 * yeux avant de décider si les gains sont équilibrés.
 *
 * La feuille de route dit « bilan et équilibrage des gains après tests de jeu
 * réels ». Ce script ne remplace pas les parties réelles : il **lit les règles
 * du jeu** (`src/data/streamer.json`, par les fonctions de `src/lib/streamer.ts`)
 * et les met en tableau — paliers, croissance par jour, ce qu'un format
 * rapporte en moyenne, ce que chaque choix d'imprévu promet, ce que le setup
 * coûte et rapporte, puis trente journées jouées. Aucun chiffre n'est recopié
 * ici : si le joueur change un multiplicateur dans le fichier, le bilan change
 * avec lui, sans qu'une ligne de ce script bouge.
 *
 * Lancement : `npm run streamer:bilan`.
 *
 * Le hasard est **figé** (un générateur à graine) pour que deux exécutions
 * donnent le même tableau : c'est un outil de mesure, pas une partie.
 */
import {
  CAP_DAYS,
  EVENTS,
  SETUP_LEVELS,
  STREAMER,
  STREAMER_TOKENS,
  STREAMER_TOKEN_CAP,
  TIERS,
  availableFormats,
  growthWithSetup,
  newStreamerState,
  nextSetupLevel,
  playEventLocally,
  tierFor,
  eventForDay,
  playVideoLocally,
  sacrificePrice,
  setupBonusPermille,
  type StreamerEvent,
  type StreamerEventChoice,
  type StreamerFormat,
} from "@/lib/streamer";
import { CATALOG_SIZE } from "@/lib/catalog";

/**
 * Le hasard de ce bilan : une graine, donc deux exécutions identiques.
 *
 * C'est le générateur `mulberry32` — le même que le banc d'essai des écrans —
 * et pas un congruenciel linéaire : les bits de poids faible d'un LCG se
 * répètent, et un tirage de réussite à 1/1000 dans le mauvais sens du terme
 * donnerait des échecs aux mêmes journées dans toutes les parties simulées.
 */
function tirage(graine: number) {
  let etat = graine;
  return (maxExclusive: number) => {
    etat = (etat + 0x6d2b79f5) | 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4_294_967_296) * maxExclusive | 0;
  };
}

const pourcent = (permille: number) => `${(permille / 10).toFixed(1)} %`;
const milliers = (n: number) => n.toLocaleString("fr-FR");

function titre(texte: string) {
  console.log(`\n${texte}\n${"─".repeat(texte.length)}`);
}

/** Les journées de jeu, comme le jeu les compte (6 h UTC). */
const JOUR = 86_400_000;
const jour = (index: number) => new Date(Date.UTC(2026, 9, 8, 6, 0, 0) + index * JOUR).toISOString().slice(0, 10);

// ------------------------------------------------------------------ les paliers
titre("Les paliers : où l'on va, à quelle vitesse, et ce que la chaîne rapporte");

console.log(
  `Croissance : ${growthWithSetup(0, [])} abonnés par jour au premier palier, ` +
    `plafond d'absence ${CAP_DAYS} jours.`,
);
console.log(
  "L'absence se cumule par journées de jeu (6 h UTC) : le joueur qui revient " +
    "après une semaine touche ce qu'il a manqué, pas plus.",
);
console.log(
  "\nPalier".padEnd(24) +
    "Seuil".padStart(10) +
    "/jour".padStart(9) +
    "Ce palier".padStart(12) +
    "Cumulé".padStart(10),
);
let cumul = 0;
for (let index = 0; index < TIERS.length; index += 1) {
  const palier = TIERS[index]!;
  const suivant = TIERS[index + 1];
  // La traversée du palier, jour par jour, avec la croissance du **jeu** (elle
  // change à chaque palier franchi, donc on avance à petits pas).
  let etape = 0;
  if (suivant) {
    let courant = palier.at;
    while (courant < suivant.at && etape < 1_000) {
      courant += growthWithSetup(courant, []);
      etape += 1;
    }
    cumul += etape;
  }
  console.log(
    palier.label.padEnd(24) +
      milliers(palier.at).padStart(10) +
      milliers(palier.perDay).padStart(9) +
      (suivant ? `${etape} jours` : "—").padStart(12) +
      (suivant ? `${cumul} jours` : "—").padStart(10),
  );
}
console.log(`\nJetons : ${STREAMER_TOKENS.perSuccess} par vidéo réussie, +${STREAMER_TOKENS.perBuzz} si elle buzz, ` +
  `plafond ${STREAMER_TOKEN_CAP} par journée de jeu.`);

// ------------------------------------------------------------------ les formats
titre("Les formats : ce qu'une publication rapporte, en moyenne");

const FORMATS: readonly StreamerFormat[] = STREAMER.formats;
const NIVEAUX = [0, 2_500, 25_000];
console.log(
  `Sur ${"400"} tirages par format et par palier, sans invité ni setup (le plancher).\n`,
);
console.log(`${"Format".padEnd(12)}${"Accès".padEnd(22)}${"Réussite".padStart(9)}${"Buzz".padStart(8)}` +
  NIVEAUX.map((n) => `À ${milliers(n)} abonnés`.padStart(20)).join(""));
for (const format of FORMATS) {
  const acces = format.requiresCreator ? `1 créateur sur 1000` : "ouvert à tous";
  const colonnes = NIVEAUX.map((niveau) => {
    const roll = tirage(97 + niveau);
    let somme = 0;
    for (let i = 0; i < 400; i += 1) {
      // Le vrai tirage du jeu, pas une formule recopiée.
      const etat = { ...newStreamerState(0), subscribers: niveau, setup: [] as string[] };
      const resultat = playVideoLocally(etat, format.id, jour(i), roll);
      somme += resultat?.video.gained ?? 0;
    }
    return `+${milliers(Math.round(somme / 400))} abonnés`.padStart(20);
  });
  console.log(
    `${format.label.padEnd(12)}${acces.padEnd(22)}${pourcent(format.successChancePermille).padStart(9)}` +
      `${pourcent(format.buzzPermille).padStart(8)}${colonnes.join("")}`,
  );
}
console.log(
  `\nAccès des formats : ${availableFormats(CATALOG_SIZE)
    .map((f) => f.label)
    .join(", ")} avec tout le catalogue possédé. ` +
    `Le plateau paie en plus : jusqu'à ${pourcent(STREAMER.guests.collab.videoPermille.legendary!)} ` +
    `sur une vidéo avec un invité Légendaire, et ${pourcent(STREAMER.guests.collab.livePermille)} ` +
    `quand cet invité est en direct (${pourcent(STREAMER.guests.collab.liveBuzzPermille)} de buzz en plus).`,
);

// ------------------------------------------------------------------ les imprévus
titre("Les imprévus : ce que chaque réponse promet");
for (const evenement of EVENTS) {
  console.log(`\n${evenement.label} — ${evenement.detail}`);
  for (const choix of evenement.choices) {
    console.log(
      `  ${choix.label.padEnd(34)} réussite ${pourcent(choix.successChancePermille).padStart(6)} · ` +
        `gain ${pourcent(choix.gainPermille).padStart(6)} d'une journée · buzz ${pourcent(choix.buzzPermille)}`,
    );
  }
}

// ------------------------------------------------------------------ le setup
titre("Le setup : ce qu'il coûte, ce qu'il rapporte");
console.log(`${"Palier".padEnd(26)}${"Prix".padStart(10)}  ${"Bonus croissance".padStart(16)}  Cumul`);
let bonus = 0;
for (const niveau of SETUP_LEVELS) {
  const gain = niveau.growthPermille ?? 0;
  bonus += gain;
  const prix =
    niveau.currency === "points"
      ? `${milliers(niveau.price)} pts`
      : `${milliers(sacrificePrice(niveau))} pts de doublons`;
  console.log(
    `${niveau.label.padEnd(26)}${prix.padStart(10)}  ${`+${pourcent(gain)}`.padStart(16)}  ` +
      `${`+${pourcent(setupBonusPermille(SETUP_LEVELS.slice(0, SETUP_LEVELS.indexOf(niveau) + 1).map((l) => l.id)))}`}`,
  );
}

// ------------------------------------------------------------------ trente jours
titre("Trente journées jouées : la courbe, avec la meilleure réponse à chaque imprévu");

/**
 * Une partie jouée par la règle du jeu, avec une politique **déclarée** :
 *
 *   * on publie le format ouvert qui a le meilleur gain moyen mesuré ;
 *   * on répond à l'imprévu par le choix qui promet le plus (`chance × gain`) ;
 *   * on **n'achète rien** : le setup se paie avec les points des doublons de
 *     cartes, que ce bilan ne simule pas. La colonne « setup complet » donne la
 *     même courbe avec tous les paliers déjà payés : la vérité est entre les
 *     deux, jamais en dehors.
 */
type BilanJoue = {
  lignes: string[];
  abonnes: number;
  jetons: number;
  reussites: number;
  buzz: number;
  imprévus: number;
};

function jouerTrenteJours(setup: string[]): BilanJoue {
  let etat = { ...newStreamerState(0), setup };
  const roll = tirage(2_026);
  const lignes: string[] = [];
  let jetons = 0;
  let reussites = 0;
  let buzz = 0;
  let imprévus = 0;

  for (let index = 0; index < 30; index += 1) {
    const journee = jour(index);
    // Le meilleur format ouvert : le gain moyen mesuré sur cette partie-là, pas
    // une préférence écrite ici.
    const formats = availableFormats(CATALOG_SIZE);
    let meilleur = formats[0]!;
    let meilleureMoyenne = -1;
    for (const format of formats) {
      const essai = tirage(11 + format.successChancePermille);
      let somme = 0;
      for (let i = 0; i < 200; i += 1) {
        const vue = playVideoLocally({ ...etat, video: null }, format.id, journee, essai);
        somme += vue?.video.gained ?? 0;
      }
      const moyenne = somme / 200;
      if (moyenne > meilleureMoyenne) {
        meilleureMoyenne = moyenne;
        meilleur = format;
      }
    }

    const publiee = playVideoLocally(etat, meilleur.id, journee, roll);
    if (publiee) {
      etat = publiee.state;
      jetons += publiee.video.tokens;
      if (publiee.video.success) reussites += 1;
      if (publiee.video.buzz) buzz += 1;
    }

    // L'imprévu du jour : **la fonction du jeu**, jamais une copie du tirage.
    const carte = eventForDay(journee);
    if (carte) {
      const choix = meilleurChoix(carte);
      const joue = playEventLocally(etat, choix.id, journee, roll);
      if (joue) {
        etat = joue.state;
        imprévus += 1;
      }
    }

    // La croissance passive de la journée, plafonnée comme le jeu.
    etat = { ...etat, subscribers: etat.subscribers + growthWithSetup(etat.subscribers, setup) };

    lignes.push(
      `${String(index + 1).padStart(3)}  ${milliers(etat.subscribers).padStart(10)}  ` +
        `${tierFor(etat.subscribers).label.padEnd(18)} ${String(jetons).padStart(5)} jetons cumulés`,
    );
  }

  return { lignes, abonnes: etat.subscribers, jetons, reussites, buzz, imprévus };
}

/** Le choix qui promet le plus : la chance de réussite fois ce qu'elle rapporte. */
function meilleurChoix(carte: StreamerEvent): StreamerEventChoice {
  return [...carte.choices].sort(
    (a, b) => b.successChancePermille * b.gainPermille - a.successChancePermille * a.gainPermille,
  )[0]!;
}

function resume(nom: string, bilan: BilanJoue) {
  console.log(
    `${nom} : ${milliers(bilan.abonnes)} abonnés au trentième jour (${tierFor(bilan.abonnes).label}), ` +
      `${bilan.reussites}/30 vidéos réussies, ${bilan.buzz} buzz, ${bilan.jetons} jetons de chaîne.`,
  );
}

const sansSetup = jouerTrenteJours([]);
const avecSetup = jouerTrenteJours(SETUP_LEVELS.map((niveau) => niveau.id));
const jalon = (lignes: string[]) => [0, 6, 13, 29].map((index) => lignes[index]!).join("\n");
console.log("\nSans un point dépensé (le plancher) :");
console.log(jalon(sansSetup.lignes));
console.log("\nSetup complet payé (le plafond) :");
console.log(jalon(avecSetup.lignes));

console.log("");
resume("Le plancher", sansSetup);
resume("Le plafond", avecSetup);
console.log(
  `\nL'écart entre les deux courbes vient des multiplicateurs de croissance : ` +
    `${pourcent(setupBonusPermille(SETUP_LEVELS.map((niveau) => niveau.id)))} de plus quand tout ` +
    `le setup est payé. Ces multiplicateurs vivent dans src/data/streamer.json — c'est là que ` +
    `l'équilibrage se décide, et nulle part ailleurs.`,
);
console.log(
  `\nUne chose que ces chiffres montrent : une seule vidéo par journée de jeu, ${STREAMER_TOKENS.perSuccess} ` +
    `jetons (+${STREAMER_TOKENS.perBuzz} de buzz), soit ${STREAMER_TOKENS.perSuccess + STREAMER_TOKENS.perBuzz} au mieux, ` +
    `quand le plafond du jour est à ${STREAMER_TOKEN_CAP}. Il ne se touche jamais aujourd'hui : il garde la porte, ` +
    `côté serveur, pour une journée où les jetons viendraient d'ailleurs.`,
);
console.log(
  `\nCe que ce bilan ne dit pas : ce que le joueur ressent. Les journées réelles restent la ` +
    `seule mesure qui compte — le prochain palier à payer est ${nextSetupLevel([])?.label ?? "aucun"}.`,
);
