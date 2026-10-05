/**
 * Génère le catalogue CreatorDeck depuis Twitch : `src/data/creators.json` et
 * les portraits de `public/creators/`.
 *
 * Usage :
 *   node scripts/build-twitch-fr.mjs                          # Top 500 (historique)
 *   node scripts/build-twitch-fr.mjs --count 2000             # Top 2000
 *   node scripts/build-twitch-fr.mjs --count 2000 --dry-run   # découvre sans rien écrire
 *   AVATAR_PX=300 node scripts/build-twitch-fr.mjs --count 2000
 *
 * Options :
 *   --count N        taille du catalogue à produire (défaut 500, env TOP_N)
 *   --pages N        profondeur de pagination Twitch par jeu (défaut 2)
 *   --concurrency N  téléchargements simultanés (défaut 24)
 *   --dry-run        s'arrête après la découverte (écrit reports/candidates-<N>.json)
 *   --seed FILE      réutilise une découverte existante au lieu d'interroger Twitch
 *   --force          re-télécharge les portraits déjà présents
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
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AVATAR_SIZE, downloadLargestAvatar, encodeAvatar, readAvatarSize } from "./lib/avatars.mjs";
import { rarityCounts, rarityForRank } from "./lib/rarity-ladder.mjs";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public/creators");
// Rapport interne (artefact de génération) : hors de public/ pour ne pas
// l'exposer sur le site.
const REPORTS_DIR = path.join(ROOT, "reports");
const DATA_FILE = path.join(ROOT, "src/data/creators.json");
const CONFIG_FILE = path.join(ROOT, "src/data/catalog.config.json");
const GQL_URL = "https://gql.twitch.tv/gql";
const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

const argv = process.argv.slice(2);
function option(name, fallback) {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const COUNT = Math.max(1, Math.floor(Number(option("count", process.env.TOP_N ?? 500))));
/** Profondeur de pagination : 1 = top 30 par jeu, 2 = jusqu'à 60, etc. */
const PAGES = Math.max(1, Math.floor(Number(option("pages", 2))));
const CONCURRENCY = Math.max(1, Math.floor(Number(option("concurrency", 24))));
const DRY_RUN = argv.includes("--dry-run");
const FORCE = argv.includes("--force");
const SEED_FILE = option("seed", null);
/** Résolution des portraits écrits (600 px par défaut, voir scripts/lib/avatars.mjs). */
const AVATAR_PX = Math.max(150, Math.floor(Number(process.env.AVATAR_PX ?? AVATAR_SIZE)));
/** Marge de sécurité : on découvre bien plus de chaînes qu'il n'en faut. */
const CANDIDATE_TARGET = Math.max(COUNT * 2, 620);

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

async function gqlRequest(query, variables = {}) {
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
      if (res.ok) return res.json();
    } catch {
      // Réseau instable : on retente avec un backoff croissant.
    }
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
  }
  throw new Error("Twitch GQL request failed");
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
async function fetchStreamConnection({ gameName = null, after = null, first = 30 }) {
  const args = [`first: ${first}`, `options: { broadcasterLanguages: [FR] }`];
  if (after) args.push(`after: ${JSON.stringify(after)}`);
  const query = gameName
    ? `query { game(name: ${JSON.stringify(gameName)}) {
         displayName
         streams(${args.join(", ")}) { pageInfo { hasNextPage endCursor } edges { node { ${STREAM_NODE_FIELDS} } } }
       } }`
    : `query { streams(${args.join(", ")}) { pageInfo { hasNextPage endCursor } edges { node { ${STREAM_NODE_FIELDS} } } } }`;
  const body = await gqlRequest(query);
  return gameName ? body?.data?.game : body?.data?.streams;
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
      avatarUrl: broadcaster.profileImageURL,
      curatedBoost: 0,
    });
  }
}

/** Créateurs FR incontournables, résolus par login (indépendamment du direct). */
async function fetchCuratedUsers(logins) {
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
      const category =
        u.stream?.game?.displayName ||
        u.broadcastSettings?.game?.displayName ||
        "Variété & Live";
      if (BLOCKED_CATEGORIES.has(category)) continue;
      results.push({
        login: u.login.toLowerCase(),
        displayName: u.displayName || u.login,
        followers: u.followers?.totalCount || 0,
        viewers: u.stream?.viewersCount || 0,
        category,
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
 * Découvre les chaînes francophones : direct FR global (paginé) puis les
 * chaînes des jeux les plus joués (paginées aussi). La profondeur `PAGES`
 * détermine combien de pages on descend par jeu — c'est ce qui permet de
 * viser un Top 2000 là où une seule page plafonnait à ~600 chaînes.
 */
async function fetchLiveFrenchStreams(target) {
  // 1. Direct FR global, page par page.
  let cursor = null;
  for (let page = 0; page < PAGES; page += 1) {
    const connection = await fetchStreamConnection({ after: cursor, first: 100 });
    if (!connection?.edges?.length) break;
    ingestEdges(connection.edges);
    if (!connection.pageInfo?.hasNextPage) break;
    cursor = connection.pageInfo.endCursor;
    if (discovery.collected.length >= target) break;
  }
  console.log(`   -> direct FR global : ${discovery.collected.length} chaînes`);

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
            streams(first: 30, options: { broadcasterLanguages: [FR] }) {
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
              streams(first: 50, after: ${JSON.stringify(after)}, options: { broadcasterLanguages: [FR] }) {
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

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(REPORTS_DIR, { recursive: true });
  console.log(
    `Catalogue CreatorDeck — objectif ${COUNT} créateurs, portraits ${AVATAR_PX}px, ` +
      `pagination ${PAGES} page(s)/jeu${DRY_RUN ? ", découverte seule" : ""}.\n`,
  );

  let allCandidates;
  if (SEED_FILE) {
    console.log(`0/4 Découverte réutilisée depuis ${SEED_FILE}…`);
    allCandidates = JSON.parse(await readFile(SEED_FILE, "utf8")).candidates;
    if (!Array.isArray(allCandidates)) throw new Error(`${SEED_FILE} : clé « candidates » attendue.`);
    console.log(`   -> ${allCandidates.length} candidats rechargés.`);
  } else {
    console.log("1/4 Résolution des créateurs FR incontournables sur Twitch GQL…");
    const curated = await fetchCuratedUsers(CURATED_FR_LOGINS);
    console.log(`   -> ${curated.length} créateurs historiques résolus.`);

    console.log("2/4 Pagination des chaînes Twitch francophones actives…");
    const liveStreams = await fetchLiveFrenchStreams(CANDIDATE_TARGET);
    console.log(`   -> ${liveStreams.length} chaînes FR actives récupérées.`);

    const byLogin = new Map();
    for (const item of [...curated, ...liveStreams]) {
      const existing = byLogin.get(item.login);
      if (!existing) {
        byLogin.set(item.login, item);
      } else {
        existing.followers = Math.max(existing.followers, item.followers);
        existing.viewers = Math.max(existing.viewers, item.viewers);
        existing.curatedBoost = Math.max(existing.curatedBoost, item.curatedBoost);
        if (!existing.category || existing.category === "Variété & Live") {
          existing.category = item.category;
        }
      }
    }
    allCandidates = [...byLogin.values()].sort((a, b) => score(b) - score(a));
    console.log(`   -> ${allCandidates.length} candidats uniques après dédoublonnage.`);

    await writeReport(`candidates-${COUNT}.json`, {
      generatedAt: new Date().toISOString(),
      target: COUNT,
      pages: PAGES,
      candidates: allCandidates,
    });

    if (allCandidates.length < COUNT) {
      throw new Error(
        `Seulement ${allCandidates.length} chaînes trouvées pour un objectif de ${COUNT}. ` +
          `Élargis la découverte avec --pages ${PAGES + 1}, ou complète CURATED_FR_LOGINS.`,
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
    console.log(`   Aperçu : ${allCandidates.slice(0, 10).map((c) => c.login).join(", ")}…\n`);
    return;
  }

  console.log(`3/4 Téléchargement et normalisation des ${COUNT} portraits (sur ${allCandidates.length} candidats)…`);
  const { catalog, stats } = await buildCatalog(allCandidates);

  await writeFile(DATA_FILE, `${JSON.stringify(catalog, null, 2)}\n`);
  // La taille attendue est écrite ici pour que `npm run catalog:check` puisse
  // détecter une troncature accidentelle du catalogue.
  await writeFile(
    CONFIG_FILE,
    `${JSON.stringify(
      {
        expectedSize: catalog.length,
        label: `Top ${catalog.length} Twitch FR`,
        note: "Écrit par scripts/build-twitch-fr.mjs. expectedSize est vérifié par npm run catalog:check.",
      },
      null,
      2,
    )}\n`,
  );

  const counts = rarityCounts(catalog.length);
  await writeReport(`top${COUNT}.json`, {
    generatedAt: new Date().toISOString(),
    total: catalog.length,
    candidates: allCandidates.length,
    pages: PAGES,
    avatarPx: AVATAR_PX,
    source: "twitch-gql-official-cdn",
    rarities: counts,
    portraits: stats,
  });

  console.log(
    `4/4 Top ${catalog.length} Twitch FR généré : ${stats.downloaded} portraits téléchargés, ` +
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
