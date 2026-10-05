/**
 * Génère le catalogue CreatorDeck depuis Twitch : `src/data/creators.json` et
 * les portraits de `public/creators/`.
 *
 * Périmètre : par défaut **le monde entier** (classement mondial Twitch), avec
 * la possibilité de restreindre à une ou plusieurs langues de diffusion.
 *
 * Cible retenue pour le projet : **Top 1000 mondial, portraits 600 px** — c'est
 * le défaut ci-dessous. Le choix est argumenté (temps de complétion, poids des
 * images, reconnaissance des cartes) dans docs/catalogue-twitch.md.
 *
 * Usage :
 *   node scripts/build-twitch-catalog.mjs                       # Top 1000 mondial
 *   node scripts/build-twitch-catalog.mjs --count 500           # autre taille
 *   node scripts/build-twitch-catalog.mjs --languages FR        # Top FR (historique)
 *   node scripts/build-twitch-catalog.mjs --languages FR,EN     # plusieurs langues
 *   node scripts/build-twitch-catalog.mjs --dry-run             # mesurer sans écrire
 *   AVATAR_PX=300 node scripts/build-twitch-catalog.mjs         # portraits plus légers
 *
 * Windows / PowerShell : `npm run catalog:source -- --dry-run` ne transmet PAS
 * les options (PowerShell avale le `--`, npm ignore alors le drapeau — une
 * « simulation » lancerait une vraie génération). Deux façons sûres :
 *
 *   node scripts/build-twitch-catalog.mjs --dry-run     # commande native : arguments intacts
 *   $env:DRY_RUN = "1"; npm run catalog:source          # variable d'environnement
 *
 * Les mêmes variables existent pour les autres réglages : TOP_N, PAGES,
 * TOP_LANGUAGES, AVATAR_PX, FORCE, PROBE.
 *
 * Diagnostic : `node scripts/build-twitch-catalog.mjs --probe` interroge l'API
 * et affiche, requête par requête, combien de chaînes elle renvoie et les
 * éventuelles erreurs GraphQL. Utile quand une source revient vide alors que
 * d'autres fonctionnent (l'API GQL n'est pas documentée et peut changer).
 *
 * Options :
 *   --count N        taille du catalogue à produire (défaut 1000, env TOP_N)
 *   --languages L    langues de diffusion à retenir, séparées par des virgules
 *                    (FR, EN, ES, PT, DE…). Vide = toutes (défaut).
 *   --pages N        profondeur de pagination Twitch par jeu (défaut 2)
 *   --concurrency N  téléchargements simultanés (défaut 24)
 *   --dry-run        s'arrête après la découverte (écrit reports/candidates-<N>.json)
 *                    (env DRY_RUN=1)
 *   --seed FILE      réutilise une découverte existante au lieu d'interroger Twitch
 *   --force          re-télécharge les portraits déjà présents
 *
 * Étiquettes : pour une chaîne **hors direct**, Twitch n'expose que le dernier
 * jeu programmé (`broadcastSettings`), souvent périmé — d'où des têtes
 * d'affiche légendaires étiquetées « Among Us » ou « Magic: The Gathering »
 * alors qu'elles font du talk. Le générateur ne garde ce jeu que s'il
 * correspond à une catégorie modélisée par `src/data/seasons.config.json` ;
 * sinon l'entrée prend « Variété & Live », que la première catégorie réellement
 * observée remplacera. Règle isolée et testée :
 * `scripts/lib/curated-category.mjs`, `src/lib/curated-category.test.ts`.
 *
 * Le périmètre retenu est écrit dans `src/data/catalog.config.json` (scope,
 * label, accroches) : l'application n'a aucun libellé « FR » en dur, elle lit
 * ces valeurs.
 *
 * La rareté n'est pas un nombre de rangs en dur : elle est calculée en part du
 * classement par `scripts/lib/rarity-ladder.mjs`, donc la même échelle vaut pour
 * un Top 500 comme pour un Top 2000.
 *
 * Reprenable : un portrait déjà écrit à la bonne résolution est réutilisé, donc
 * on peut relancer après une coupure sans retélécharger les images.
 *
 * Panneau de bord : `npm run catalog:check` vérifie ensuite que le catalogue
 * produit est complet (rangs contigus, catégories, poids de tirage).
 *
 * Mode d'emploi complet : docs/catalogue-twitch.md.
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AVATAR_SIZE, downloadLargestAvatar, encodeAvatar, readAvatarSize } from "./lib/avatars.mjs";
import {
  WORLD_LIVE_LANGUAGES,
  scopeConfig,
  scopeLogLabel,
} from "./lib/catalog-scope.mjs";
import { FALLBACK_CATEGORY, curatedCategory } from "./lib/curated-category.mjs";
import { rarityCounts, rarityForRank } from "./lib/rarity-ladder.mjs";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public/creators");
// Rapport interne (artefact de génération) : hors de public/ pour ne pas
// l'exposer sur le site.
const REPORTS_DIR = path.join(ROOT, "reports");
const DATA_FILE = path.join(ROOT, "src/data/creators.json");
const CONFIG_FILE = path.join(ROOT, "src/data/catalog.config.json");
const SEASONS_FILE = path.join(ROOT, "src/data/seasons.config.json");
const GQL_URL = "https://gql.twitch.tv/gql";
const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

const argv = process.argv.slice(2);
function option(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

/** Variable d'environnement interprétée comme un vrai booléen de shell. */
function truthy(value) {
  return ["1", "true", "yes", "oui", "on"].includes(String(value ?? "").trim().toLowerCase());
}

const COUNT = Math.max(1, Math.floor(Number(option("count", process.env.TOP_N ?? 1000))));
/** Profondeur de pagination : 1 = top 30 par jeu, 2 = jusqu'à 60, etc. */
const PAGES = Math.max(1, Math.floor(Number(option("pages", process.env.PAGES ?? 2))));
const CONCURRENCY = Math.max(1, Math.floor(Number(option("concurrency", 24))));
const DRY_RUN = argv.includes("--dry-run") || truthy(process.env.DRY_RUN);
/** Diagnostic réseau : interroge l'API et affiche ce qu'elle répond, sans rien écrire. */
const PROBE = argv.includes("--probe") || truthy(process.env.PROBE);
const FORCE = argv.includes("--force") || truthy(process.env.FORCE);
const SEED_FILE = option("seed", null);
/**
 * Langues de diffusion retenues. Vide = monde entier (aucun filtre), ce qui est
 * le comportement par défaut depuis l'ouverture au périmètre mondial.
 */
const LANGUAGES = (option("languages", process.env.TOP_LANGUAGES ?? "") || "")
  .split(",")
  .map((code) => code.trim().toUpperCase())
  .filter(Boolean);
/** Un catalogue limité à la France garde sa liste curée dédiée. */
const SCOPE_IS_FR = LANGUAGES.length === 1 && LANGUAGES[0] === "FR";
/** Résolution des portraits écrits (600 px par défaut, voir scripts/lib/avatars.mjs). */
const AVATAR_PX = Math.max(150, Math.floor(Number(process.env.AVATAR_PX ?? AVATAR_SIZE)));
/** Marge de sécurité : on découvre bien plus de chaînes qu'il n'en faut. */
const CANDIDATE_TARGET = Math.max(COUNT * 2, 620);


/**
 * Chaînes mondiales incontournables, résolues par login.
 *
 * Rôle : garantir que les têtes d'affiche **entrent dans le catalogue même
 * quand elles ne sont pas en direct** au moment de la génération. Le classement
 * final reste dominé par les followers réels (le boost ci-dessous ne fait que
 * les faire émerger, il ne les propulse pas artificiellement en tête).
 *
 * Un login inexistant n'est pas une erreur : l'API renvoie `null` et l'entrée
 * est simplement ignorée.
 */
const CURATED_WORLD_LOGINS = [
  // Amérique du Nord
  "xqc", "kaicenat", "ninja", "shroud", "jynxzi", "tarik", "summit1g", "ishowspeed",
  "adinross", "hasanabi", "trainwreckstv", "sodapoppin", "asmongold", "tyler1",
  "doublelift", "pokimane", "lilypichu", "sykkuno", "valkyrae", "mizkif", "nmplol",
  "esfandtv", "greekgodx", "forsen", "lirik", "drdisrespect", "timthetatman",
  "cloakzy", "nickmercs", "couragejd", "scump", "nadeshot", "amouranth", "alinity",
  "pokelawls", "qtcinderella", "emiru", "extraemily", "cyr", "willneff", "ludwig",
  "penguinz0", "caseoh_", "ohnepixel", "s1mple", "loserfruit", "lazarbeam",
  "muselk", "typicalgamer", "tommyinnit", "philza", "dream", "georgenotfound",
  "sapnap", "karljacobs", "quackity",
  // Amérique latine et Espagne
  "ibai", "auronplay", "rubius", "thegrefg", "xokas", "illojuan", "rivers_gg",
  "spreen", "elmariana", "juansguarnizo", "missasinfonia", "coscu", "carola",
  // Brésil et Portugal
  "gaules", "casimito", "alanzoka", "loud_coringa", "baiano", "cellbit", "felps",
  // Allemagne
  "trymacs", "montanablack88", "knossi", "papaplatte", "rewinside",
  // Corée, Japon, Océanie
  "faker", "kato_junichi0817",
  // Pologne, Italie, Turquie, Russie
  "ewroon", "baddo", "jahrein", "bratishkinoff", "buster",
  // France (intégrée au classement mondial)
  "squeezie", "aminematue", "gotaga", "kamet0", "zerator", "domingo", "mastu",
  "inoxtag", "michou", "antoinedaniel", "mistermv", "etoiles", "ponce", "bagherajones",
  "horty", "ultia", "angledroit", "maghla", "locklear", "sardoche", "terracid",
  "laink", "wankilstudio", "joyca", "amixem", "mcflyetcarlito", "jltomy",
  "rebeudeter", "zacknani", "rivenzi", "littlebigwhale", "jeel", "gom4rt", "poko",
  "alphacast", "fildrong", "bob_lennon", "aypierre", "doigby", "shaunz", "traytonlol",
  "anyme023", "nico_la", "sylvainlyve", "byilhann", "clemquicourt", "maximebiaggi",
  "lucasmorotv", "hugodelire", "wissksr", "nikof", "anaee", "mynthos", "dfg",
  "jolavanille", "deujna", "xari", "kaatsup", "alderiate", "lebouseuh", "chap",
  "misterjday", "sheshounet", "pollynette", "zevent", "samueletienne", "jeanmassiet",
  "hugodecrypte", "notabene", "at0mium", "kenbogard", "kayane", "shisheyu_mayamoto",
  "damdamdeo", "lutti", "kotei", "wakz", "lrb", "narkuss", "skyyart", "gobgg",
  "nisqy", "hanssama", "cabochardlol", "saken_lol", "targamas", "rhobalas_lol",
  "solary", "karminecorp", "gentlemates", "vitality", "mandatory", "chowh1",
  "wisethug", "brokybrawks", "skyroz", "moman", "jirayalol", "krl_stream", "1pvcs",
  "shaiiko", "sixquatre", "vatira_", "zenrl", "kaydop", "fairy_peak", "alpha54",
  "ferra", "kinstaar", "airwaks", "valouzz", "pidi", "theodort", "avamin", "snakou",
  "gaspow", "loupiote", "modiiie",
];

/** Liste curée utilisée quand on génère explicitement un catalogue FR. */
const CURATED_FR_LOGINS = [
  "squeezie", "aminematue", "kamet0", "gotaga", "zerator", "domingo", "mastu", "inoxtag",
  "michou", "antoinedaniel", "mistermv", "joueur_du_grenier", "etoiles", "ponce", "bagherajones",
  "horty", "ultia", "angledroit", "maghla", "locklear", "sardoche", "terracid", "laink",
  "wankilstudio", "joyca", "amixem", "mcflyetcarlito", "jltomy", "rebeudeter", "zacknani",
  "rivenzi", "littlebigwhale", "jeel", "gom4rt", "poko", "alphacast", "fildrong", "bob_lennon",
  "aypierre", "doigby", "shaunz", "traytonlol", "anyme023", "nico_la", "sylvainlyve", "byilhann",
  "itachi", "clemquicourt", "rayan_psnn", "youladecadd", "rmcsport", "clemovitch", "feldupstreams",
  "caliste_lol", "enjoyphoenix", "rocky_", "etostark__", "pauleta_twitch", "maximebiaggi",
  "lucasmorotv", "hugodelire", "croissantstrike", "wissksrr", "nikof", "anaee", "mynthos",
  "tonton", "dfg", "jolavanille", "deujna", "xari", "kaatsup", "alderiate", "lebouseuh",
  "chap", "misterjday", "sheshounet", "pollynette", "cameliaaa92", "zevent",
  "samueletienne", "jeanmassiet", "hugodecrypte", "notabene", "at0mium", "kenbogard", "kayane",
  "shisheyu_mayamoto", "damdamdeo", "lutti", "kotei", "wakz", "lrb", "narkuss", "skyyart",
  "gobgg", "nisqy", "hanssama", "cabochardlol", "saken_lol", "targamas", "rhobalas_lol",
  "marex_lol", "crocodyle_lol", "otp_lol", "solary", "solaryfortnite", "solaryhs", "karminecorp",
  "gentlemates", "vitality", "mandatory", "chowh1", "wisethug", "brokybrawks", "skyroz",
  "moman", "jirayalol", "krl_stream", "1pvcs", "shaiiko", "sixquatre", "vatira_", "zenrl",
  "kaydop", "fairy_peak", "alpha54", "ferra", "kinstaar", "airwaks", "valouzz", "pidi",
  "lebouseuh", "theodort", "avamin", "snakou", "gaspow", "loupiote", "modiiie"
];
const BLOCKED_CATEGORIES = new Set([
  "Slots",
  "Virtual Casino",
  "Poker",
  "Blackjack",
]);

const EXTRA_GAMES = [
  "Just Chatting", "League of Legends", "VALORANT", "Grand Theft Auto V", "Minecraft",
  "Fortnite", "Counter-Strike", "Rocket League", "Call of Duty: Warzone", "World of Warcraft",
  "Teamfight Tactics", "Overwatch 2", "Apex Legends", "Hearthstone", "Dead by Daylight",
  "Rust", "Dofus", "Street Fighter 6", "Tekken 8", "Super Smash Bros. Ultimate",
  "GeoGuessr", "Chess", "Music", "Art", "IRL", "Sports", "Special Events",
  "Sea of Thieves", "Elden Ring", "Trackmania", "Summoners War", "Genshin Impact",
  "Brawl Stars", "Clash Royale", "PUBG: BATTLEGROUNDS", "Tom Clancy's Rainbow Six Siege",
  "DayZ", "Escape from Tarkov", "Path of Exile 2", "Diablo IV", "Final Fantasy XIV Online",
  "Yu-Gi-Oh! Master Duel", "Roblox", "Phasmophobia", "Baldur's Gate 3", "Satisfactory",
  "Euro Truck Simulator 2", "iRacing", "Star Citizen", "Age of Empires II", "OSRS",
  "Pokémon Scarlet/Violet", "Pokémon Trading Card Game Pocket", "Mario Kart 8 Deluxe",
  "Talk Shows & Podcasts", "Science & Technology", "Food & Drink", "Makers & Crafting",
  "Retro", "Software and Game Development", "ASMR", "Travel & Outdoors"
];

function slugify(login) {
  return login
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isValidAvatar(url) {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    !url.includes("user-default-pictures")
  );
}

/**
 * Transport brut : renvoie le corps JSON **et** les erreurs GraphQL.
 *
 * Séparé de `gqlRequest` à dessein. L'API GQL de Twitch n'est pas documentée :
 * une requête peut répondre avec `errors` et aucun `data`. Comme le code appelant
 * lit `body?.data?.streams?.edges`, une erreur serait sinon indiscernable d'un
 * résultat vide — c'est précisément ce qui rendait un « 0 chaîne » opaque.
 */
async function gqlFetch(query, variables = {}) {
  let status = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(GQL_URL, {
        method: "POST",
        headers: {
          "Client-ID": CLIENT_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(20_000),
      });
      status = res.status;
      if (res.ok) return { body: await res.json(), status };
    } catch {
      // Réseau instable : on retente avec un backoff croissant.
    }
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
  }
  return { body: null, status };
}

async function gqlRequest(query, variables = {}) {
  const { body, status } = await gqlFetch(query, variables);
  if (!body) throw new Error(`Twitch GQL request failed (HTTP ${status || "réseau"})`);
  return body;
}

/**
 * Fragment `options: { broadcasterLanguages: […] }` des requêtes de direct.
 * Vide quand aucune langue n'est demandée : on obtient alors le direct mondial.
 */
function languageOptions() {
  return LANGUAGES.length ? `, options: { broadcasterLanguages: [${LANGUAGES.join(", ")}] }` : "";
}

/** Champs communs à toutes les récupérations de chaînes. */
const STREAM_NODE_FIELDS = `
  viewersCount
  game { displayName }
  broadcaster {
    login
    displayName
    followers { totalCount }
    profileImageURL(width: 300)
  }
`;

/**
 * Connexion paginée de chaînes FR, globale ou pour un jeu donné.
 * `after` est le curseur renvoyé par la page précédente (null pour la première).
 */
/** Construit la requête de direct, indépendamment de son exécution (sonde). */
function buildStreamQuery({ gameName = null, after = null, first = 30, languages = null }) {
  // `languages` permet de viser un jeu de langues précis (repli du direct
  // global) sans toucher au périmètre retenu pour le catalogue.
  const options = languages
    ? languages.length
      ? `, options: { broadcasterLanguages: [${languages.join(", ")}] }`
      : ""
    : languageOptions();
  const args = [`first: ${first}${options}`];
  if (after) args.push(`after: ${JSON.stringify(after)}`);
  return gameName
    ? `query { game(name: ${JSON.stringify(gameName)}) {
         displayName
         streams(${args.join(", ")}) { pageInfo { hasNextPage endCursor } edges { node { ${STREAM_NODE_FIELDS} } } }
       } }`
    : `query { streams(${args.join(", ")}) { pageInfo { hasNextPage endCursor } edges { node { ${STREAM_NODE_FIELDS} } } } }`;
}

async function fetchStreamConnection(options) {
  const body = await gqlRequest(buildStreamQuery(options));
  return options.gameName ? body?.data?.game : body?.data?.streams;
}

/** État partagé de la découverte : dédoublonnage par login. */
const discovery = { seen: new Set(), collected: [] };

function ingestEdges(edges, fallbackCategory = "Just Chatting") {
  for (const edge of edges || []) {
    const node = edge?.node;
    const broadcaster = node?.broadcaster;
    if (!broadcaster || !broadcaster.login || !isValidAvatar(broadcaster.profileImageURL)) continue;
    const login = broadcaster.login.toLowerCase();
    if (discovery.seen.has(login)) continue;
    const category = node.game?.displayName || fallbackCategory;
    if (BLOCKED_CATEGORIES.has(category)) continue;
    discovery.seen.add(login);
    discovery.collected.push({
      login,
      displayName: broadcaster.displayName || broadcaster.login,
      followers: broadcaster.followers?.totalCount || 0,
      viewers: node.viewersCount || 0,
      category,
      // Catégorie relevée en direct : un fait, pas une déduction.
      live: true,
      avatarUrl: broadcaster.profileImageURL,
      curatedBoost: 0,
    });
  }
}

/**
 * Catégories réellement modélisées par les familles de saisons
 * (`src/data/seasons.config.json`). Sert à décider si le dernier jeu programmé
 * d'une chaîne hors direct peut lui servir d'étiquette (voir plus bas).
 */
async function loadKnownCategories() {
  let raw;
  try {
    raw = await readFile(SEASONS_FILE, "utf8");
  } catch {
    throw new Error(
      `seasons.config.json introuvable (${SEASONS_FILE}) : impossible d'étiqueter les têtes d'affiche hors direct.`,
    );
  }
  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new Error(`seasons.config.json illisible : ${err.message}`);
  }
  const known = new Set();
  for (const season of config.seasons ?? []) {
    for (const category of season.categories ?? []) known.add(category);
  }
  return known;
}

/**
 * Créateurs FR incontournables, résolus par login (indépendamment du direct).
 *
 * Hors direct, Twitch ne dit pas ce que la chaîne streame : `broadcastSettings`
 * expose seulement le dernier jeu **programmé**, qui peut être périmé (« ibai →
 * Among Us », « coscu → Magic: The Gathering »). On ne garde donc ce jeu que
 * s'il correspond à une catégorie modélisée par les familles ; sinon l'entrée
 * part dans « Variété & Live », et la première catégorie réelle observée la
 * remplacera. Règle testée : `src/lib/curated-category.test.ts`.
 */
async function fetchCuratedUsers(logins, knownCategories) {
  const uniqueLogins = [...new Set(logins.map((l) => l.toLowerCase()))];
  const results = [];
  const chunkSize = 25;

  for (let i = 0; i < uniqueLogins.length; i += chunkSize) {
    const chunk = uniqueLogins.slice(i, i + chunkSize);
    const fields = chunk
      .map(
        (login, idx) =>
          `u${idx}: user(login: "${login.replace(/[^a-z0-9_]/g, "")}") { id login displayName followers { totalCount } profileImageURL(width: 300) stream { viewersCount game { displayName } } broadcastSettings { game { displayName } } }`,
      )
      .join("\n");
    const body = await gqlRequest(`query { ${fields} }`);
    const data = body?.data || {};
    for (let idx = 0; idx < chunk.length; idx += 1) {
      const u = data[`u${idx}`];
      if (!u || !u.login || !isValidAvatar(u.profileImageURL)) continue;
      const category = curatedCategory({
        liveGame: u.stream?.game?.displayName,
        lastGame: u.broadcastSettings?.game?.displayName,
        knownCategories,
        fallback: FALLBACK_CATEGORY,
      });
      if (BLOCKED_CATEGORIES.has(category)) continue;
      results.push({
        login: u.login.toLowerCase(),
        displayName: u.displayName || u.login,
        followers: u.followers?.totalCount || 0,
        viewers: u.stream?.viewersCount || 0,
        category,
        // Vrai seulement si la chaîne était en direct : une étiquette déduite
        // du dernier jeu programmé ne doit jamais battre un fait observé.
        live: Boolean(u.stream?.game?.displayName),
        avatarUrl: u.profileImageURL,
        // Garde-fou historique : les noms de la liste gardent la main sur les
        // chaînes découvertes uniquement par le direct.
        curatedBoost: Math.max(0, 200 - (i + idx)) * 5000,
      });
    }
  }
  return results;
}

/**
 * Découvre les chaînes actives du périmètre demandé : direct global (paginé)
 * puis chaînes des jeux les plus joués (paginées aussi). La profondeur `PAGES`
 * détermine combien de pages on descend par jeu — c'est ce qui permet de viser
 * un Top 2000 là où une seule page plafonnait à ~600 chaînes.
 *
 * Particularité mesurée : la requête de direct **mondiale** sans filtre de
 * langue revient vide (0 chaîne) côté API anonyme, alors que la même requête
 * filtrée sur des langues renvoie des résultats. On bascule donc, uniquement
 * dans ce cas, sur les langues principales de diffusion (WORLD_LIVE_LANGUAGES).
 * La pagination par jeux, elle, n'est jamais filtrée : le classement final ne
 * dépend pas de ce repli.
 */
async function fetchLiveStreams(target) {
  // 1. Direct global, page par page. Sans filtre de langue, l'API anonyme
  //    renvoie une connexion vide : on retente alors sur les langues
  //    principales, sans jamais filtrer la pagination par jeux.
  async function pageGlobalLive(languages) {
    let found = 0;
    let cursor = null;
    for (let page = 0; page < PAGES; page += 1) {
      const connection = await fetchStreamConnection({ after: cursor, first: 100, languages });
      if (!connection?.edges?.length) break;
      found += connection.edges.length;
      ingestEdges(connection.edges);
      if (!connection.pageInfo?.hasNextPage) break;
      cursor = connection.pageInfo.endCursor;
      if (discovery.collected.length >= target) break;
    }
    return found;
  }

  let liveFound = await pageGlobalLive(LANGUAGES);
  let liveScope = scopeLogLabel(LANGUAGES);
  if (liveFound === 0 && !LANGUAGES.length && !PROBE) {
    // Rien n'a été ingéré (found === 0), donc aucun état à remettre en place.
    liveFound = await pageGlobalLive(WORLD_LIVE_LANGUAGES);
    if (liveFound > 0) liveScope = `repli sur ${WORLD_LIVE_LANGUAGES.length} langues`;
  }
  if (liveFound === 0) {
    console.log(
      `   -> direct ${liveScope} : aucune chaîne (API anonyme) — la pagination par jeux prend le relais.`,
    );
  } else {
    console.log(`   -> direct ${liveScope} : ${liveFound} chaînes lues`);
  }

  // 2. Liste des jeux : top Twitch + jeux complémentaires.
  const gamesBody = await gqlRequest(`query { games(first: 100) { edges { node { name } } } }`);
  const discoveredGames = (gamesBody?.data?.games?.edges || [])
    .map((edge) => edge?.node?.name)
    .filter(Boolean);
  const allGames = [...new Set([...EXTRA_GAMES, ...discoveredGames])].filter(
    (name) => !BLOCKED_CATEGORIES.has(name),
  );

  // 3. Première page par lots de jeux, puis pages suivantes pour les jeux qui
  //    en ont encore (curseur mémorisé par jeu).
  const batchSize = 6;
  const pending = new Map(); // jeu -> curseur de la page suivante

  for (let i = 0; i < allGames.length; i += batchSize) {
    const chunk = allGames.slice(i, i + batchSize);
    const fields = chunk
      .map(
        (gameName, idx) => `
          g${idx}: game(name: ${JSON.stringify(gameName)}) {
            displayName
            streams(first: 30${languageOptions()}) {
              pageInfo { hasNextPage endCursor }
              edges { node { ${STREAM_NODE_FIELDS} } }
            }
          }
        `,
      )
      .join("\n");

    const body = await gqlRequest(`query { ${fields} }`);
    const data = body?.data || {};
    for (let idx = 0; idx < chunk.length; idx += 1) {
      const game = data[`g${idx}`];
      if (!game?.streams?.edges) continue;
      ingestEdges(game.streams.edges, game.displayName || chunk[idx]);
      if (game.streams.pageInfo?.hasNextPage && game.streams.pageInfo?.endCursor) {
        pending.set(chunk[idx], game.streams.pageInfo.endCursor);
      }
    }
    if (discovery.collected.length >= target) break;
  }

  for (let page = 2; page <= PAGES; page += 1) {
    const entries = [...pending.entries()];
    if (!entries.length) break;
    for (let i = 0; i < entries.length; i += batchSize) {
      const chunk = entries.slice(i, i + batchSize);
      const fields = chunk
        .map(
          ([gameName, after], idx) => `
            g${idx}: game(name: ${JSON.stringify(gameName)}) {
              displayName
              streams(first: 50, after: ${JSON.stringify(after)}${languageOptions()}) {
                pageInfo { hasNextPage endCursor }
                edges { node { ${STREAM_NODE_FIELDS} } }
              }
            }
          `,
        )
        .join("\n");
      const body = await gqlRequest(`query { ${fields} }`);
      const data = body?.data || {};
      chunk.forEach(([gameName], idx) => {
        const game = data[`g${idx}`];
        if (!game?.streams?.edges) {
          pending.delete(gameName);
          return;
        }
        ingestEdges(game.streams.edges, game.displayName || gameName);
        if (game.streams.pageInfo?.hasNextPage && game.streams.pageInfo?.endCursor) {
          pending.set(gameName, game.streams.pageInfo.endCursor);
        } else {
          pending.delete(gameName);
        }
      });
      if (discovery.collected.length >= target) break;
    }
    console.log(`   -> page ${page} : ${discovery.collected.length} chaînes cumulées`);
    if (discovery.collected.length >= target) break;
  }

  return discovery.collected;
}

function score(item) {
  return item.followers + item.viewers * 35 + item.curatedBoost;
}

/**
 * Écrit (ou réutilise) le portrait d'un créateur. Un fichier déjà à la bonne
 * résolution est conservé : relancer le script après une coupure ne
 * retélécharge pas les 2000 images.
 */
async function ensurePortrait(creator) {
  const targetPath = path.join(OUT_DIR, `${creator.slug}.jpg`);
  if (!FORCE && existsSync(targetPath)) {
    const size = await readAvatarSize(targetPath);
    if (size && size >= AVATAR_PX) return "reused";
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const { bytes } = await downloadLargestAvatar(creator.avatarUrl, { timeoutMs: 20_000 });
      await encodeAvatar(bytes, targetPath, { size: AVATAR_PX });
      return "downloaded";
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return "failed";
}

async function writeReport(name, payload) {
  await mkdir(REPORTS_DIR, { recursive: true });
  await writeFile(path.join(REPORTS_DIR, name), `${JSON.stringify(payload, null, 2)}\n`);
}

/** Construit la liste finale : tri par score, portraits validés, rangs contigus. */
async function buildCatalog(candidates) {
  const usedSlugs = new Set();
  const finalCatalog = [];
  const queue = [...candidates];
  const stats = { downloaded: 0, reused: 0, failures: 0 };

  async function worker() {
    while (queue.length > 0 && finalCatalog.length < COUNT) {
      const candidate = queue.shift();
      if (!candidate) break;
      let slug = slugify(candidate.login);
      if (!slug) continue;
      if (usedSlugs.has(slug)) slug = `${slug}-${candidate.login.slice(0, 4)}`;
      if (usedSlugs.has(slug)) continue;
      usedSlugs.add(slug);

      try {
        const result = await ensurePortrait({ ...candidate, slug });
        stats[result === "downloaded" ? "downloaded" : "reused"] += 1;
        if (finalCatalog.length < COUNT) {
          finalCatalog.push({ ...candidate, slug });
          const done = finalCatalog.length;
          if (done % 100 === 0) console.log(`   ✓ ${done}/${COUNT} portraits validés`);
        }
      } catch {
        stats.failures += 1;
        // Passe automatiquement au candidat suivant si une URL d'image échoue.
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  if (finalCatalog.length < COUNT) {
    throw new Error(
      `Seulement ${finalCatalog.length} portraits validés sur ${COUNT}. ` +
        `Relance avec --pages ${PAGES + 1} pour élargir la découverte.`,
    );
  }

  finalCatalog.sort((a, b) => score(b) - score(a));

  return {
    catalog: finalCatalog.slice(0, COUNT).map((item, idx) => {
      const rank = idx + 1;
      return {
        slug: item.slug,
        displayName: item.displayName,
        login: item.login,
        category: item.category || "Just Chatting",
        rarity: rarityForRank(rank, COUNT),
        rank,
        followers: item.followers,
        viewers: item.viewers,
      };
    }),
    stats,
  };
}

/**
 * Sonde réseau : ne touche à rien, affiche ce que chaque requête renvoie.
 *
 * Trois formes de la requête de direct sont testées, ce qui permet de savoir
 * laquelle fonctionne encore (l'API GQL de Twitch n'est pas documentée et pas
 * stable) :
 *   1. mondiale, sans filtre de langue   — la plus large
 *   2. filtrée sur les langues principales — le repli utilisé par le script
 *   3. filtrée sur FR                     — l'ancien périmètre, comme témoin
 */
async function probe() {
  console.log("Sonde de l'API Twitch (aucune écriture, aucun appel au catalogue).\n");
  const cases = [
    { label: "direct mondial (sans filtre)", languages: [] },
    { label: `direct ${WORLD_LIVE_LANGUAGES.length} langues principales`, languages: WORLD_LIVE_LANGUAGES },
    { label: "direct FR (témoin)", languages: ["FR"] },
  ];
  for (const { label, languages } of cases) {
    const { body, status } = await gqlFetch(buildStreamQuery({ first: 5, languages }));
    if (!body) {
      console.log(`   ${label} : ÉCHEC RÉSEAU (HTTP ${status || "aucune réponse"})`);
      continue;
    }
    const edges = body?.data?.streams?.edges || [];
    console.log(`   ${label} : ${edges.length} chaîne(s)`);
    for (const edge of edges.slice(0, 3)) {
      console.log(`      · ${edge?.node?.broadcaster?.login ?? "?"} (${edge?.node?.viewersCount ?? 0} spectateurs)`);
    }
    if (body.errors?.length) {
      console.log(`      ⚠ erreurs GraphQL : ${body.errors.map((e) => e.message).join(" | ")}`);
    } else if (!edges.length) {
      console.log("      connexion vide sans erreur : la requête est acceptée mais ne renvoie rien");
    }
  }
  console.log(
    "\nInterprétation : si « mondial » est vide mais que les langues renvoient des chaînes, " +
      "le repli du script est bien celui qu'il faut. Colle cette sortie si tu veux qu'on aille plus loin.",
  );
}

async function main() {
  if (PROBE) {
    await probe();
    return;
  }
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(REPORTS_DIR, { recursive: true });
  console.log(
    `Catalogue CreatorDeck — objectif ${COUNT} créateurs, périmètre ` +
      `${LANGUAGES.length ? LANGUAGES.join("/") : "mondial"}, portraits ${AVATAR_PX}px, ` +
      `pagination ${PAGES} page(s)/jeu${DRY_RUN ? ", découverte seule" : ""}.\n`,
  );

  let allCandidates;
  if (SEED_FILE) {
    console.log(`0/4 Découverte réutilisée depuis ${SEED_FILE}…`);
    allCandidates = JSON.parse(await readFile(SEED_FILE, "utf8")).candidates;
    if (!Array.isArray(allCandidates)) throw new Error(`${SEED_FILE} : clé « candidates » attendue.`);
    console.log(`   -> ${allCandidates.length} candidats rechargés.`);
  } else {
    const curatedLogins = SCOPE_IS_FR ? CURATED_FR_LOGINS : CURATED_WORLD_LOGINS;
    console.log(
      `1/4 Résolution des têtes d'affiche ${SCOPE_IS_FR ? "FR" : "mondiales"} (${curatedLogins.length} logins curés)…`,
    );
    const curated = await fetchCuratedUsers(curatedLogins, await loadKnownCategories());
    const offline = curated.filter((creator) => !creator.viewers).length;
    console.log(
      `   -> ${curated.length} créateurs incontournables résolus` +
        `${offline ? ` (${offline} hors direct, étiquetés par leur catégorie modélisée)` : ""}.`,
    );

    console.log(
      `2/4 Pagination des chaînes actives ${LANGUAGES.length ? `(${LANGUAGES.join(", ")})` : "dans le monde"}…`,
    );
    const liveStreams = await fetchLiveStreams(CANDIDATE_TARGET);
    console.log(
      `   -> ${liveStreams.length} chaînes actives récupérées (${scopeLogLabel(LANGUAGES)}).`,
    );

    const byLogin = new Map();
    for (const item of [...curated, ...liveStreams]) {
      const existing = byLogin.get(item.login);
      if (!existing) {
        byLogin.set(item.login, item);
      } else {
        existing.followers = Math.max(existing.followers, item.followers);
        existing.viewers = Math.max(existing.viewers, item.viewers);
        existing.curatedBoost = Math.max(existing.curatedBoost, item.curatedBoost);
        if (item.live && !existing.live) {
          // Le direct a été observé : il corrige une étiquette déduite.
          existing.category = item.category;
          existing.live = true;
        } else if (!existing.category || existing.category === FALLBACK_CATEGORY) {
          existing.category = item.category;
        }
      }
    }
    allCandidates = [...byLogin.values()].sort((a, b) => score(b) - score(a));
    console.log(`   -> ${allCandidates.length} candidats uniques après dédoublonnage.`);

    await writeReport(`candidates-${COUNT}.json`, {
      generatedAt: new Date().toISOString(),
      target: COUNT,
      languages: LANGUAGES,
      pages: PAGES,
      candidates: allCandidates,
    });

    if (allCandidates.length < COUNT) {
      throw new Error(
        `Seulement ${allCandidates.length} chaînes trouvées pour un objectif de ${COUNT}. ` +
          `Élargis la découverte avec --pages ${PAGES + 1}, ou complète la liste curée.`,
      );
    }
  }

  if (DRY_RUN) {
    const byCategory = {};
    for (const candidate of allCandidates) {
      byCategory[candidate.category] = (byCategory[candidate.category] || 0) + 1;
    }
    console.log(
      `\n🧪 Découverte seule : ${allCandidates.length} candidats, ` +
        `${Object.keys(byCategory).length} catégories. Rien n'a été écrit dans src/ ni public/.`,
    );
    console.log(`   Rapport détaillé : reports/candidates-${COUNT}.json`);
    console.log(`   Périmètre : ${LANGUAGES.length ? LANGUAGES.join("/") : "mondial (toutes langues)"}`);
    console.log(`   Aperçu : ${allCandidates.slice(0, 10).map((c) => c.login).join(", ")}…\n`);
    return;
  }

  console.log(`3/4 Téléchargement et normalisation des ${COUNT} portraits (sur ${allCandidates.length} candidats)…`);
  const { catalog, stats } = await buildCatalog(allCandidates);

  await writeFile(DATA_FILE, `${JSON.stringify(catalog, null, 2)}\n`);
  // La taille et le périmètre sont écrits ici : `npm run catalog:check` détecte
  // une troncature, et l'application en déduit tous ses libellés (aucun « FR »
  // ni « 500 » n'est écrit dans le code).
  const scope = scopeConfig({ size: catalog.length, languages: LANGUAGES });
  await writeFile(CONFIG_FILE, `${JSON.stringify(scope, null, 2)}\n`);

  const counts = rarityCounts(catalog.length);
  await writeReport(`top${COUNT}.json`, {
    generatedAt: new Date().toISOString(),
    total: catalog.length,
    languages: LANGUAGES,
    scope: SCOPE_IS_FR ? "FR" : "world",
    candidates: allCandidates.length,
    pages: PAGES,
    avatarPx: AVATAR_PX,
    source: "twitch-gql-official-cdn",
    rarities: counts,
    portraits: stats,
  });

  console.log(
    `4/4 Top ${catalog.length} Twitch${SCOPE_IS_FR ? " FR" : ""} généré : ${stats.downloaded} portraits téléchargés, ` +
      `${stats.reused} réutilisés, ${stats.failures} échecs.`,
  );
  console.log(
    `   Raretés : ${Object.entries(counts).map(([r, n]) => `${r}=${n}`).join(", ")}`,
  );
  console.log("   Étapes suivantes : npm run catalog:build && npm test && npm run build\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
