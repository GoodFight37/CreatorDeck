import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public/creators");
// Rapport interne (artefact de génération) : hors de public/ pour ne pas
// l'exposer sur le site.
const REPORTS_DIR = path.join(ROOT, "reports");
const DATA_FILE = path.join(ROOT, "src/data/creators.json");
const GQL_URL = "https://gql.twitch.tv/gql";
const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

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

function slugify(login) {
  return login
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function gqlRequest(query, variables = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(GQL_URL, {
      method: "POST",
      headers: {
        "Client-ID": CLIENT_ID,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) {
      return res.json();
    }
    await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
  }
  throw new Error("Twitch GQL request failed");
}

function isValidAvatar(url) {
  return (
    typeof url === "string" &&
    url.startsWith("https://") &&
    !url.includes("user-default-pictures")
  );
}

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
        curatedBoost: Math.max(0, 200 - (i + idx)) * 5000,
      });
    }
  }
  return results;
}

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

async function fetchLiveFrenchStreams(targetUniqueCount = 620) {
  const seenLogins = new Set();
  const collected = [];

  function ingestEdges(edges, fallbackCategory = "Just Chatting") {
    for (const edge of edges || []) {
      const node = edge?.node;
      const b = node?.broadcaster;
      if (!b || !b.login || !isValidAvatar(b.profileImageURL)) continue;
      const login = b.login.toLowerCase();
      if (seenLogins.has(login)) continue;
      const category = node.game?.displayName || fallbackCategory;
      if (BLOCKED_CATEGORIES.has(category)) continue;
      seenLogins.add(login);
      collected.push({
        login,
        displayName: b.displayName || b.login,
        followers: b.followers?.totalCount || 0,
        viewers: node.viewersCount || 0,
        category,
        avatarUrl: b.profileImageURL,
        curatedBoost: 0,
      });
    }
  }

  // 1. Top global FR streams + Top 100 games on Twitch
  const initBody = await gqlRequest(`
    query {
      streams(first: 30, options: { broadcasterLanguages: [FR] }) {
        edges {
          node {
            viewersCount
            game { displayName }
            broadcaster {
              login
              displayName
              followers { totalCount }
              profileImageURL(width: 300)
            }
          }
        }
      }
      games(first: 100) {
        edges {
          node {
            name
            displayName
          }
        }
      }
    }
  `);

  ingestEdges(initBody?.data?.streams?.edges);
  const discoveredGames = (initBody?.data?.games?.edges || [])
    .map((e) => e?.node?.name)
    .filter(Boolean);

  const allGames = [...new Set([...EXTRA_GAMES, ...discoveredGames])].filter(
    (name) => !BLOCKED_CATEGORIES.has(name),
  );

  const batchSize = 6;
  for (let i = 0; i < allGames.length && collected.length < targetUniqueCount; i += batchSize) {
    const chunk = allGames.slice(i, i + batchSize);
    const fields = chunk
      .map(
        (gName, idx) => `
          g${idx}: game(name: ${JSON.stringify(gName)}) {
            displayName
            streams(first: 30, options: { broadcasterLanguages: [FR] }) {
              edges {
                node {
                  viewersCount
                  broadcaster {
                    login
                    displayName
                    followers { totalCount }
                    profileImageURL(width: 300)
                  }
                }
              }
            }
          }
        `,
      )
      .join("\n");

    const body = await gqlRequest(`query { ${fields} }`);
    const data = body?.data || {};
    for (let idx = 0; idx < chunk.length; idx += 1) {
      const g = data[`g${idx}`];
      if (!g?.streams?.edges) continue;
      ingestEdges(g.streams.edges, g.displayName || chunk[idx]);
    }
  }

  return collected;
}

function assignRarity(rank) {
  if (rank <= 25) return "legendary";
  if (rank <= 85) return "epic";
  if (rank <= 200) return "rare";
  if (rank <= 350) return "uncommon";
  return "common";
}

async function downloadAndProcessOne(creator) {
  const targetPath = path.join(OUT_DIR, `${creator.slug}.jpg`);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(creator.avatarUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length < 500) throw new Error("Image trop petite");

      // Le GQL Twitch plafonne à 300x300 (profileImageURL(width: 300)) : on garde
      // donc la taille native. L'ancien resize vers 240x240 supprimait 36 % des
      // pixels avant même l'affichage, puis le navigateur ré-agrandissait
      // l'image pour remplir la carte -> flou visible, surtout en Retina.
      await sharp(buffer)
        .resize(300, 300, {
          fit: "cover",
          position: "centre",
          withoutEnlargement: true,
          kernel: "lanczos3",
        })
        .sharpen({ sigma: 0.6 })
        .jpeg({ quality: 88, mozjpeg: true })
        .toFile(targetPath);
      return true;
    } catch (err) {
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  return false;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(REPORTS_DIR, { recursive: true });
  console.log("1/4 Résolution des créateurs FR incontournables sur Twitch GQL...");
  const curated = await fetchCuratedUsers(CURATED_FR_LOGINS);
  console.log(`   -> ${curated.length} créateurs historiques résolus.`);

  console.log("2/4 Pagination des chaînes Twitch francophones actives...");
  const liveStreams = await fetchLiveFrenchStreams(700);
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

  const allCandidates = [...byLogin.values()].sort((a, b) => {
    const scoreA = a.followers + a.viewers * 35 + a.curatedBoost;
    const scoreB = b.followers + b.viewers * 35 + b.curatedBoost;
    return scoreB - scoreA;
  });

  if (allCandidates.length < 500) {
    throw new Error(`Seulement ${allCandidates.length} chaînes trouvées, objectif 500.`);
  }

  console.log(
    `3/4 Téléchargement et normalisation des 500 portraits officiels (sur ${allCandidates.length} candidats)...`,
  );

  const usedSlugs = new Set();
  const finalCatalog = [];
  const queue = [...allCandidates];
  const concurrency = 24;

  async function worker() {
    while (queue.length > 0 && finalCatalog.length < 500) {
      const candidate = queue.shift();
      if (!candidate) break;
      let slug = slugify(candidate.login);
      if (!slug) continue;
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${candidate.login.slice(0, 4)}`;
      }
      if (usedSlugs.has(slug)) continue;
      usedSlugs.add(slug);

      try {
        await downloadAndProcessOne({ ...candidate, slug });
        if (finalCatalog.length < 500) {
          finalCatalog.push({
            ...candidate,
            slug,
          });
          if (finalCatalog.length % 50 === 0) {
            console.log(`   ✓ ${finalCatalog.length}/500 portraits validés`);
          }
        }
      } catch {
        // Passe automatiquement au candidat suivant si une URL d'image échoue
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  if (finalCatalog.length < 500) {
    throw new Error(`Seulement ${finalCatalog.length} portraits validés sur 500.`);
  }

  finalCatalog.sort((a, b) => {
    const scoreA = a.followers + a.viewers * 35 + a.curatedBoost;
    const scoreB = b.followers + b.viewers * 35 + b.curatedBoost;
    return scoreB - scoreA;
  });

  const normalizedCatalog = finalCatalog.slice(0, 500).map((item, idx) => {
    const rank = idx + 1;
    return {
      slug: item.slug,
      displayName: item.displayName,
      login: item.login,
      category: item.category || "Just Chatting",
      rarity: assignRarity(rank),
      rank,
      followers: item.followers,
      viewers: item.viewers,
    };
  });

  await writeFile(DATA_FILE, `${JSON.stringify(normalizedCatalog, null, 2)}\n`);
  await writeFile(
    path.join(REPORTS_DIR, "top500.json"),
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: normalizedCatalog.length,
        source: "twitch-gql-official-cdn",
      },
      null,
      2,
    )}\n`,
  );

  console.log("4/4 Top 500 Twitch FR généré avec 500/500 portraits officiels !");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
