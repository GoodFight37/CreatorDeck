/**
 * Vérifie les migrations Supabase sur un Postgres jetable.
 *
 * Pourquoi : `0004_tirage.sql` contient du PL/pgSQL (tirage, recharge,
 * mélange). Une erreur de syntaxe ou un indice hors bornes ne se voit qu'à
 * l'exécution — et le SQL Editor de Supabase ne prévient pas. Ce script joue
 * les migrations pour de vrai, appelle `open_pack()` des centaines de fois et
 * contrôle le résultat, avant qu'un joueur ne tombe dessus.
 *
 *   npm install --no-save embedded-postgres pg
 *   node scripts/verify-supabase-migrations.mjs
 *
 * Les dépendances ne sont pas dans `package.json` : elles pèsent lourd (un
 * binaire Postgres) et ne servent qu'ici. Sur un réseau restreint, la première
 * installation peut échouer : le script le dit et sort proprement.
 *
 * Ce qui est vérifié :
 *   * les cinq migrations s'exécutent et sont rejouables ;
 *   * le catalogue (1000 créateurs) ;
 *   * l'obligation d'être connecté pour ouvrir un booster ;
 *   * 5 cartes, aucun doublon, une variante « live » sur Rare ou mieux, en
 *     dernière position (le hit se révèle à la fin) ;
 *   * le journal `pack_draws` et la réserve mise à jour ;
 *   * la recharge (30 min par booster, plafond 4, reprise de l'état local) ;
 *   * la distribution du slot garanti (82 / 15 / 3 de `pull-rates.json`) ;
 *   * les échanges : offres, acceptation atomique des deux côtés, refus,
 *     annulation, verrous, droits, et lecture par un tiers ;
 *   * le profil public : projection `user_cards`, complétion, rangs, répartition
 *     par rareté, nouveaux tris du classement, et ce qui reste invisible ;
 *   * le direct : publication d'une liste, disparition des diffusions
 *     terminées, et interdiction d'écrire depuis un client — y compris via
 *     `live_publish`, qui doit rester hors de portée d'un joueur ;
 *   * les amis : demande, acceptation, refus, annulation, retrait, doublons et
 *     demandes croisées, invisibilité pour un tiers, et l'impossibilité pour un
 *     visiteur sans compte de lire ou d'écrire quoi que ce soit ;
 *   * les saisons : chaque créateur porte sa famille, les familles se partagent
 *     exactement le catalogue, et la complétion par famille suit les cartes
 *     réellement possédées (le créateur inventé ne compte nulle part).
 */
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATIONS = path.join(ROOT, "supabase", "migrations");

let EmbeddedPostgres;
let pg;
try {
  ({ default: EmbeddedPostgres } = await import("embedded-postgres"));
  ({ default: pg } = await import("pg"));
} catch {
  console.error(
    "Dépendances de vérification absentes.\n" +
      "Installe-les (rien n'est ajouté au dépôt) :\n" +
      "  npm install --no-save embedded-postgres pg\n" +
      "Puis relance : node scripts/verify-supabase-migrations.mjs",
  );
  process.exit(2);
}

let failures = 0;
function check(label, condition, detail = "") {
  if (!condition) failures += 1;
  console.log(`${condition ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`);
}

const dataDir = await mkdtemp(path.join(tmpdir(), "creatordeck-pg-"));
const port = 55000 + Math.floor(Math.random() * 500);
const server = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port,
  persistent: false,
});

await server.initialise();
await server.start();
await server.createDatabase("verification");

const client = new pg.Client({ host: "127.0.0.1", port, user: "postgres", password: "postgres", database: "verification" });
await client.connect();

try {
  // --- Le strict nécessaire de l'environnement Supabase --------------------
  // Tout le reste (profils, sauvegardes, statistiques, classement) vient des
  // vraies migrations : on ne teste pas une maquette de la base.
  await client.query(`
    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('test.uid', true), '')::uuid
    $$;
    create role anon;
    create role authenticated;
  `);

  const catalogue = await readFile(path.join(MIGRATIONS, "0003_catalogue.sql"), "utf8");
  const tirage = await readFile(path.join(MIGRATIONS, "0004_tirage.sql"), "utf8");
  const direct = await readFile(path.join(MIGRATIONS, "0007_direct.sql"), "utf8");
  const friends = await readFile(path.join(MIGRATIONS, "0008_friends.sql"), "utf8");
  const migrations = [
    ["0001_comptes_cloud.sql", await readFile(path.join(MIGRATIONS, "0001_comptes_cloud.sql"), "utf8")],
    ["0002_vitrine.sql", await readFile(path.join(MIGRATIONS, "0002_vitrine.sql"), "utf8")],
    ["0003_catalogue.sql", catalogue],
    ["0004_tirage.sql", tirage],
    ["0005_echanges.sql", await readFile(path.join(MIGRATIONS, "0005_echanges.sql"), "utf8")],
    ["0006_profil_public.sql", await readFile(path.join(MIGRATIONS, "0006_profil_public.sql"), "utf8")],
    ["0007_direct.sql", direct],
    ["0008_friends.sql", friends],
  ];
  for (const [name, sql] of migrations) {
    await client.query(sql);
  }
  console.log(`→ migrations ${migrations.map(([name]) => name.slice(0, 4)).join(", ")} exécutées\n`);

  // Droits de table façon Supabase : les politiques RLS font le tri ensuite.
  await client.query(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant select on all tables in schema public to anon;
  `);

  const USER = "11111111-1111-4111-8111-111111111111";
  await client.query("insert into auth.users (id) values ($1)", [USER]);

  const creators = await client.query("select count(*)::int as n from public.creators");
  check("catalogue : 1000 créateurs", creators.rows[0].n === 1000, String(creators.rows[0].n));

  // --- Sans connexion, on n'ouvre rien ------------------------------------
  await client.query("select set_config('test.uid', '', false)");
  try {
    await client.query("select public.open_pack()");
    check("open_pack refuse sans utilisateur", false, "aucune exception levée");
  } catch (error) {
    check("open_pack refuse sans utilisateur", /connecte-toi/.test(error.message), error.message);
  }

  // --- Ouverture -----------------------------------------------------------
  await client.query("select set_config('test.uid', $1, false)", [USER]);
  const first = (await client.query("select public.open_pack() as r")).rows[0].r;
  check("premier tirage : 5 cartes", first.cards.length === 5, String(first.cards.length));
  check(
    "premier tirage : aucun créateur en double",
    new Set(first.cards.map((card) => card.creatorSlug)).size === 5,
  );
  check("premier tirage : réserve décrémentée", first.packs === 2 && first.openings === 1, `packs=${first.packs} openings=${first.openings}`);
  const live = first.cards.filter((card) => card.variant === "live");
  check("premier tirage : une seule variante « live », sur Rare ou mieux",
    live.length === 1 && ["rare", "epic", "legendary"].includes(live[0].rarity),
    live.map((card) => `${card.creatorSlug}/${card.rarity}`).join(", "));
  check(
    "premier tirage : la carte garantie est la dernière (aucun mélange)",
    first.cards[first.cards.length - 1].variant === "live",
    `dernière = ${first.cards[first.cards.length - 1].creatorSlug}/${first.cards[first.cards.length - 1].variant}`,
  );

  const journal = await client.query("select count(*)::int as n, bool_and(cards is not null) as ok from public.pack_draws where user_id = $1", [USER]);
  check("journal d'audit : une ligne non vide par ouverture", journal.rows[0].n === 1 && journal.rows[0].ok === true);

  // --- Série de tirages ----------------------------------------------------
  const knownRarities = new Set(["common", "uncommon", "rare", "epic", "legendary"]);
  const knownVariants = new Set(["standard", "live", "holo", "gold"]);
  const slugSet = new Set((await client.query("select slug from public.creators")).rows.map((row) => row.slug));
  let shapeOk = true;
  let noDuplicate = true;
  let guaranteedOk = true;
  let orderOk = true;
  let catalogueOk = true;

  for (let i = 0; i < 40; i += 1) {
    await client.query("update public.pack_state set packs = 4, last_regen_at = now() where user_id = $1", [USER]);
    const pack = (await client.query("select public.open_pack() as r")).rows[0].r;
    if (pack.cards.length !== 5) shapeOk = false;
    if (new Set(pack.cards.map((card) => card.creatorSlug)).size !== 5) noDuplicate = false;
    if (pack.cards.filter((card) => card.variant === "live").length !== 1) guaranteedOk = false;
    // L'ordre du tirage est l'ordre de la révélation : le slot garanti ferme
    // toujours le paquet.
    if (pack.cards[pack.cards.length - 1].variant !== "live") orderOk = false;
    for (const card of pack.cards) {
      if (!knownRarities.has(card.rarity) || !knownVariants.has(card.variant)) shapeOk = false;
      if (!slugSet.has(card.creatorSlug)) catalogueOk = false;
    }
  }
  check("40 tirages : 5 cartes, raretés et variantes connues", shapeOk);
  check("40 tirages : jamais deux fois le même créateur", noDuplicate);
  check("40 tirages : toujours une variante « live » (slot garanti)", guaranteedOk);
  check("40 tirages : la carte garantie reste la dernière", orderOk);
  check("40 tirages : tous les créateurs viennent du catalogue", catalogueOk);

  // --- Distribution du slot garanti (82 / 15 / 3) --------------------------
  // 400 boosters : l'écart-type tombe à ~1,8 point, les bornes ci-dessous
  // laissent passer la chance sans laisser passer un taux faux.
  const N = 400;
  const counts = { rare: 0, epic: 0, legendary: 0 };
  for (let i = 0; i < N; i += 1) {
    await client.query("update public.pack_state set packs = 4, last_regen_at = now() where user_id = $1", [USER]);
    const pack = (await client.query("select public.open_pack() as r")).rows[0].r;
    counts[pack.cards.find((card) => card.variant === "live").rarity] += 1;
  }
  const rarePart = (counts.rare / N) * 100;
  const epicPart = (counts.epic / N) * 100;
  console.log(`   slot garanti sur ${N} boosters : rare ${rarePart.toFixed(1)} %, épique ${epicPart.toFixed(1)} % (attendu 82 / 15)`);
  check("slot garanti : rare ≈ 82 %", Math.abs(rarePart - 82) <= 6, `${rarePart.toFixed(1)} %`);
  check("slot garanti : épique ≈ 15 %", Math.abs(epicPart - 15) <= 5, `${epicPart.toFixed(1)} %`);

  // --- Recharge (30 min, plafond 4) ---------------------------------------
  await client.query("update public.pack_state set packs = 0, last_regen_at = now() - interval '95 minutes' where user_id = $1", [USER]);
  const regenerated = (await client.query("select to_json(public.pack_status()) as s")).rows[0].s;
  check("recharge : 95 min → 3 boosters", regenerated.packs === 3, String(regenerated.packs));

  await client.query("update public.pack_state set packs = 4, last_regen_at = now() - interval '2 hours' where user_id = $1", [USER]);
  const full = (await client.query("select to_json(public.pack_status()) as s")).rows[0].s;
  check("réserve pleine : plafond respecté", full.packs === 4, String(full.packs));
  check("réserve pleine : pas de prochain booster", full.next_pack_at === null);

  // --- Reprise de l'état local (saves.state) ------------------------------
  async function inheritedPacks(userId, state) {
    await client.query("insert into auth.users (id) values ($1) on conflict do nothing", [userId]);
    await client.query(
      `insert into public.saves (user_id, state, save_version, device_updated_at, state_checksum)
       values ($1, $2, 1, $3, md5($4))
       on conflict (user_id) do update
         set state = excluded.state,
             save_version = excluded.save_version,
             device_updated_at = excluded.device_updated_at,
             state_checksum = excluded.state_checksum`,
      (() => {
        const json = JSON.stringify({ cards: [], level: 1, points: 0, packs: 3, openings: 0, ...state });
        return [userId, json, Date.now(), json];
      })(),
    );
    await client.query("delete from public.pack_state where user_id = $1", [userId]);
    await client.query("select set_config('test.uid', $1, false)", [userId]);
    return (await client.query("select public.open_pack() as r")).rows[0].r;
  }

  const recent = await inheritedPacks("22222222-2222-4222-8222-222222222222", {
    packs: 2,
    lastPackRegen: Date.now() - 60_000,
  });
  check("reprise locale : 2 boosters locaux → 1 après ouverture", recent.packs === 1, String(recent.packs));

  const stale = await inheritedPacks("33333333-3333-4333-8333-333333333333", {
    packs: 1,
    lastPackRegen: Date.now() - 95 * 60_000,
  });
  check("reprise locale : ancre ancienne → recharge appliquée", stale.packs === 3, String(stale.packs));

  // --- Échanges -------------------------------------------------------------
  // Trois joueurs : Alix propose, Bruno reçoit, Chloé regarde de loin.
  const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
  const B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
  const C = "cccccccc-3333-4333-8333-cccccccccccc";

  function card(id, slug, rarity, variant, minutesAgo) {
    return {
      id,
      creatorSlug: slug,
      rarity,
      variant,
      obtainedAt: Date.now() - minutesAgo * 60_000,
      rareDrop: false,
    };
  }

  // Deux copies du même couple chez Alix, pour vérifier qu'un échange retire
  // la plus **ancienne** (comme le client) et garde les cartes récentes.
  const alixOld = card("alix-vieux", "ibai", "uncommon", "holo", 600);
  const alixRecent = card("alix-recent", "ibai", "uncommon", "holo", 10);
  const brunoSkin = card("bruno-skin", "summit1g", "legendary", "gold", 300);

  async function player(userId, name, cards) {
    await client.query("insert into auth.users (id) values ($1) on conflict do nothing", [userId]);
    const state = {
      version: 1,
      playerId: userId,
      createdAt: Date.now() - 10_000_000,
      updatedAt: Date.now(),
      level: 3,
      xp: 120,
      points: 45,
      hourglasses: 0,
      packs: 3,
      lastPackRegen: Date.now(),
      openings: 7,
      cards,
      claimedTiers: [],
      themeId: "default",
    };
    const json = JSON.stringify(state);
    await client.query(
      `insert into public.saves (user_id, state, save_version, device_updated_at, state_checksum)
       values ($1, $2, 1, $3, md5($4))
       on conflict (user_id) do update
         set state = excluded.state,
             save_version = excluded.save_version,
             device_updated_at = excluded.device_updated_at,
             state_checksum = excluded.state_checksum`,
      [userId, json, Date.now(), json],
    );
    await client.query(
      `insert into public.profiles (user_id, display_name) values ($1, $2)
       on conflict (user_id) do update set display_name = excluded.display_name`,
      [userId, name],
    );
  }

  /** Appelle une fonction comme le ferait un joueur connecté (rôle + identité). */
  async function asPlayer(userId, sql, params = []) {
    await client.query("select set_config('test.uid', $1, false)", [userId ?? ""]);
    await client.query("set role authenticated");
    try {
      return await client.query(sql, params);
    } finally {
      await client.query("reset role");
    }
  }

  /** Vérifie qu'un appel échoue et que le message contient `needle`. */
  async function refuses(label, userId, sql, params, needle) {
    try {
      await asPlayer(userId, sql, params);
      check(label, false, "aucune erreur levée");
    } catch (error) {
      const message = String(error.message || "");
      check(label, message.includes(needle), message);
    }
  }

  async function stateOf(userId) {
    return (await client.query("select state from public.saves where user_id = $1", [userId])).rows[0].state;
  }

  function ownedBy(state, slug, variant) {
    return (state.cards || []).filter(
      (c) => c.creatorSlug === slug && c.variant === variant,
    );
  }

  await player(A, "Alix", [alixOld, alixRecent, card("alix-rare", "chowh1", "epic", "live", 900)]);
  await player(B, "Bruno", [brunoSkin, card("bruno-std", "auronplay", "legendary", "standard", 500)]);
  await player(C, "Chloé", [card("chloe-1", "auronplay", "rare", "standard", 400)]);

  // --- Trouver un partenaire ------------------------------------------------
  const found = (await asPlayer(A, "select public.search_players('run') as r")).rows[0].r;
  check(
    "recherche : le pseudo partiel trouve le joueur",
    found.length === 1 && found[0].displayName === "Bruno" && found[0].userId === B,
    JSON.stringify(found),
  );
  check(
    "recherche : je ne me trouve pas moi-même",
    (await asPlayer(A, "select public.search_players('ali') as r")).rows[0].r.length === 0,
  );
  check(
    "recherche : moins de deux caractères ne renvoie rien",
    (await asPlayer(A, "select public.search_players('u') as r")).rows[0].r.length === 0,
  );

  const variants = (
    await asPlayer(A, "select public.player_variants($1, $2) as r", [B, "summit1g"])
  ).rows[0].r;
  check(
    "variantes d'un joueur : uniquement celles qu'il possède, de la plus simple à la plus rare",
    JSON.stringify(variants) === JSON.stringify(["gold"]) &&
      (await asPlayer(A, "select public.player_variants($1, $2) as r", [B, "shroud"])).rows[0].r.length === 0,
    JSON.stringify(variants),
  );

  // --- Proposer -------------------------------------------------------------
  const created = (
    await asPlayer(A, "select public.create_trade($1, $2, $3) as r", [
      B,
      JSON.stringify([{ creatorSlug: "ibai", variant: "holo" }]),
      JSON.stringify([{ creatorSlug: "summit1g", variant: "gold", rarity: "common" }]),
    ])
  ).rows[0].r;
  const tradeId = created.trade.id;
  check("offre : créée et ouverte", created.trade.status === "open" && tradeId > 0, JSON.stringify(created.trade.status));
  const catalogueRarity = (
    await client.query(
      "select slug, rarity from public.creators where slug in ('ibai', 'summit1g') order by slug",
    )
  ).rows;
  const rarityOf = Object.fromEntries(catalogueRarity.map((row) => [row.slug, row.rarity]));
  check(
    "offre : la rareté vient du catalogue, pas du client",
    created.trade.recipientCards[0].rarity === rarityOf.summit1g
      && created.trade.proposerCards[0].rarity === rarityOf.ibai,
    `client a dit common/uncommon, catalogue dit ${JSON.stringify(rarityOf)}`,
  );
  check("offre : le destinataire possède bien la carte demandée", created.recipientMissing === null);

  await refuses(
    "offre : je ne peux pas donner une carte que je n'ai pas",
    A,
    "select public.create_trade($1, $2, $3)",
    [B, JSON.stringify([{ creatorSlug: "shroud", variant: "gold" }]), JSON.stringify([{ creatorSlug: "summit1g", variant: "gold" }])],
    "tu ne possèdes pas shroud",
  );
  await refuses(
    "offre : la même carte deux fois est refusée",
    A,
    "select public.create_trade($1, $2, $3)",
    [B, JSON.stringify([{ creatorSlug: "ibai", variant: "holo" }, { creatorSlug: "ibai", variant: "holo" }]), JSON.stringify([{ creatorSlug: "summit1g", variant: "gold" }])],
    "deux fois",
  );
  await refuses(
    "offre : créateur inconnu du catalogue refusé",
    A,
    "select public.create_trade($1, $2, $3)",
    [B, JSON.stringify([{ creatorSlug: "inconnu-au-bataillon", variant: "live" }]), JSON.stringify([{ creatorSlug: "summit1g", variant: "gold" }])],
    "créateur inconnu",
  );
  await refuses(
    "offre : pas d'échange avec soi-même",
    A,
    "select public.create_trade($1, $2, $3)",
    [A, JSON.stringify([{ creatorSlug: "ibai", variant: "holo" }]), JSON.stringify([{ creatorSlug: "ibai", variant: "holo" }])],
    "choisis un autre joueur",
  );

  // --- Voir ses offres ------------------------------------------------------
  const alixList = (await asPlayer(A, "select public.list_trades() as r")).rows[0].r;
  const brunoList = (await asPlayer(B, "select public.list_trades() as r")).rows[0].r;
  check(
    "liste : Alix voit une offre envoyée à Bruno",
    alixList.length === 1 && alixList[0].direction === "out" && alixList[0].partnerName === "Bruno",
    JSON.stringify(alixList[0]),
  );
  check(
    "liste : Bruno voit la même offre, en sens inverse",
    brunoList.length === 1 && brunoList[0].direction === "in"
      && brunoList[0].given[0].creatorSlug === "summit1g"
      && brunoList[0].received[0].creatorSlug === "ibai",
    JSON.stringify(brunoList[0]),
  );
  check(
    "liste : un tiers ne voit rien de l'échange",
    (await asPlayer(C, "select public.list_trades() as r")).rows[0].r.length === 0
      && (await asPlayer(C, "select count(*)::int as n from public.trades")).rows[0].n === 0,
  );
  check(
    "droits : un tiers ne peut pas répondre à l'échange",
    await (async () => {
      try {
        await asPlayer(C, "select public.respond_trade($1, true)", [tradeId]);
        return false;
      } catch (error) {
        return String(error.message).includes("ne t'est pas adressée");
      }
    })(),
  );
  check(
    "droits : les fonctions internes ne sont pas appelables par un joueur",
    await (async () => {
      try {
        await asPlayer(A, "select public._trade_remove($1, $2)", ['[]', '[]']);
        return false;
      } catch (error) {
        return /permission denied/i.test(String(error.message));
      }
    })(),
  );
  check(
    "droits : je ne peux pas réécrire la collection d'un autre",
    (await asPlayer(C, "update public.saves set state = $2 where user_id = $1", [A, JSON.stringify({ cards: [] })])).rowCount === 0,
  );

  // --- Refuser --------------------------------------------------------------
  const toDecline = (
    await asPlayer(A, "select public.create_trade($1, $2, $3) as r", [
      B,
      JSON.stringify([{ creatorSlug: "chowh1", variant: "live" }]),
      JSON.stringify([{ creatorSlug: "summit1g", variant: "gold" }]),
    ])
  ).rows[0].r.trade.id;
  const declined = (await asPlayer(B, "select public.respond_trade($1, false) as r", [toDecline])).rows[0].r;
  check("refus : l'offre est close", declined.status === "declined");
  check(
    "refus : aucune collection n'a bougé",
    ownedBy(await stateOf(A), "chowh1", "live").length === 1
      && ownedBy(await stateOf(B), "summit1g", "gold").length === 1,
  );

  // --- Annuler --------------------------------------------------------------
  const toCancel = (
    await asPlayer(A, "select public.create_trade($1, $2, $3) as r", [
      B,
      JSON.stringify([{ creatorSlug: "chowh1", variant: "live" }]),
      JSON.stringify([{ creatorSlug: "summit1g", variant: "gold" }]),
    ])
  ).rows[0].r.trade.id;
  await refuses("annulation : le destinataire n'annule pas l'offre du proposeur", B, "select public.cancel_trade($1)", [toCancel], "introuvable");
  check(
    "annulation : le proposeur reprend son offre",
    (await asPlayer(A, "select public.cancel_trade($1) as r", [toCancel])).rows[0].r.status === "cancelled",
  );

  // --- Accepter -------------------------------------------------------------
  const before = { a: await stateOf(A), b: await stateOf(B) };
  const accepted = (await asPlayer(B, "select public.respond_trade($1, true) as r", [tradeId])).rows[0].r;
  const after = { a: await stateOf(A), b: await stateOf(B) };

  check("acceptation : l'offre est close", accepted.status === "accepted");
  check(
    "acceptation : Alix a donné son ibai Holo et reçu le summit1g Gold",
    ownedBy(after.a, "ibai", "holo").length === 1
      && ownedBy(after.a, "summit1g", "gold").length === 1,
  );
  check(
    "acceptation : la carte la plus ancienne est partie",
    ownedBy(after.a, "ibai", "holo")[0].id === "alix-recent",
    JSON.stringify(ownedBy(after.a, "ibai", "holo").map((c) => c.id)),
  );
  check(
    "acceptation : Bruno a fait l'échange inverse",
    ownedBy(after.b, "ibai", "holo").length === 1
      && ownedBy(after.b, "summit1g", "gold").length === 0,
  );
  check(
    "acceptation : les cartes reçues portent l'origine de l'échange",
    ownedBy(after.a, "summit1g", "gold")[0].fromTrade === tradeId
      && ownedBy(after.b, "ibai", "holo")[0].fromTrade === tradeId,
  );
  check(
    "acceptation : points, niveau et boosters intacts",
    after.a.points === before.a.points && after.a.level === before.a.level
      && after.a.packs === before.a.packs && after.b.points === before.b.points,
  );
  const statsAfter = (
    await client.query(
      "select user_id, total_cards, verified from public.stats where user_id in ($1, $2) order by user_id",
      [A, B],
    )
  ).rows;
  check(
    "acceptation : les deux collections restent vérifiées",
    statsAfter.every((row) => row.verified === true) && statsAfter.length === 2,
    JSON.stringify(statsAfter),
  );
  const checksum = (
    await client.query("select md5(state::text) as c from public.saves where user_id = $1", [A])
  ).rows[0].c;
  check(
    "acceptation : l'empreinte de sauvegarde suit",
    (await client.query("select state_checksum as c from public.saves where user_id = $1", [A])).rows[0].c === checksum,
  );
  await refuses("acceptation : une offre déjà tranchée ne se rejoue pas", B, "select public.respond_trade($1, true)", [tradeId], "déjà accepted");

  // --- Une carte disparue annule tout --------------------------------------
  const fragile = (
    await asPlayer(A, "select public.create_trade($1, $2, $3) as r", [
      B,
      JSON.stringify([{ creatorSlug: "ibai", variant: "holo" }]),
      JSON.stringify([{ creatorSlug: "summit1g", variant: "gold" }]),
    ])
  ).rows[0].r;
  check("carte disparue : l'offre existe", fragile.trade.status === "open");

  // Bruno vide sa collection (comme s'il avait envoyé une sauvegarde sans cette
  // carte) : l'acceptation doit tout annuler, sans rien laisser à moitié fait.
  const brunoBefore = await stateOf(B);
  await client.query(
    "update public.saves set state = jsonb_set(state, '{cards}', '[]'::jsonb) where user_id = $1",
    [B],
  );
  await refuses("carte disparue : l'acceptation échoue", B, "select public.respond_trade($1, true)", [fragile.trade.id], "tu ne possèdes plus");
  const alixAfterFailure = await stateOf(A);
  const fragileRow = (await client.query("select status from public.trades where id = $1", [fragile.trade.id])).rows[0];
  check(
    "carte disparue : rien n'a bougé, ni la collection ni l'offre",
    alixAfterFailure.cards.length === before.a.cards.length
      && fragileRow.status === "open"
      && ownedBy(await stateOf(B), "summit1g", "gold").length === 0,
    `cartes=${alixAfterFailure.cards.length} statut=${fragileRow.status}`,
  );
  await client.query("update public.saves set state = $2 where user_id = $1", [B, JSON.stringify(brunoBefore)]);

  // --- Rejouabilité de la migration ----------------------------------------
  await client.query(
    (await readFile(path.join(MIGRATIONS, "0005_echanges.sql"), "utf8")),
  );
  const tradesStill = (await client.query("select count(*)::int as n from public.trades")).rows[0].n;
  check("migration échanges rejouable : table conservée", tradesStill >= 4, String(tradesStill));

  // --- Profil public --------------------------------------------------------
  // Diane a une collection variée, Ethan une toute petite, Fabien une
  // sauvegarde impossible : les trois servent à vérifier la projection, la
  // complétion, les rangs et ce qui reste invisible.
  const D = "dddddddd-4444-4444-8444-dddddddddddd";
  const E = "eeeeeeee-5555-4555-8555-eeeeeeeeeeee";
  const F = "ffffffff-6666-4666-8666-ffffffffffff";

  // Un créateur par rareté, pris dans le catalogue : les vérifications ne
  // dépendent pas de la rareté réelle d'un créateur précis.
  const oneOf = async (rarity) =>
    (await client.query("select slug, rarity from public.creators where rarity = $1 order by rank limit 1", [rarity])).rows[0];
  const [legendaryOne, uncommonOne, rareOne] = [await oneOf("legendary"), await oneOf("uncommon"), await oneOf("rare")];

  await player(D, "Diane", [
    card("diane-gold", legendaryOne.slug, legendaryOne.rarity, "gold", 5),
    card("diane-holo", uncommonOne.slug, uncommonOne.rarity, "holo", 6),
    // Deux fois le même créateur : une seule ligne dans la projection, un seul
    // créateur unique — mais bien deux cartes.
    card("diane-doublon", legendaryOne.slug, legendaryOne.rarity, "standard", 7),
    card("diane-epic", rareOne.slug, rareOne.rarity, "standard", 8),
    // Créateur qui n'existe pas au catalogue : compté nulle part.
    card("diane-faux", "streameur-qui-nexiste-pas", "legendary", "standard", 9),
  ]);
  await player(E, "Ethan", [card("ethan-1", "chowh1", "common", "standard", 30)]);
  await player(F, "Fabien", [card("fabien-faux", "kaicenat", "mythique", "standard", 12)]);

  const dianeRows = (
    await client.query("select count(*)::int as n, count(distinct creator_slug)::int as u from public.user_cards where user_id = $1", [D])
  ).rows[0];
  check(
    "projection : une ligne par carte de la sauvegarde, doublon de créateur compris",
    dianeRows.n === 4,
    JSON.stringify(dianeRows),
  );
  check("projection : le créateur inventé n'entre pas dans la table", dianeRows.u === 3, String(dianeRows.u));

  const dianeStats = (
    await client.query("select unique_creators, total_cards, gold_cards, holo_cards, verified from public.stats where user_id = $1", [D])
  ).rows[0];
  check(
    "statistiques : le créateur inventé ne compte pas dans la complétion",
    dianeStats.unique_creators === 3,
    JSON.stringify(dianeStats),
  );
  check(
    "statistiques : les nouvelles colonnes Gold et Holo suivent la sauvegarde",
    dianeStats.gold_cards === 1 && dianeStats.holo_cards === 1,
    JSON.stringify(dianeStats),
  );

  const profileD = (await asPlayer(E, "select public.player_profile($1) as p", [D])).rows[0].p;
  check("profil : la fiche d'un autre joueur est lisible", profileD?.display_name === "Diane", JSON.stringify(profileD?.display_name));
  check(
    "profil : complétion calculée sur le catalogue du serveur",
    profileD.catalog_size === 1000 && profileD.completion === 0.003,
    `${profileD.unique_creators}/${profileD.catalog_size} = ${profileD.completion}`,
  );
  check(
    "profil : la répartition par rareté donne possédé / total",
    profileD.by_rarity.legendary.total === 50
      && profileD.by_rarity.common.total === 300
      && profileD.by_rarity.rarity_inexistante === undefined
      && profileD.by_rarity.legendary.owned === 1
      && profileD.by_rarity.uncommon.owned === 1
      && profileD.by_rarity.rare.owned === 1
      && profileD.by_rarity.common.owned === 0,
    JSON.stringify(profileD.by_rarity),
  );

  check(
    "saisons : chaque créateur du catalogue porte sa famille",
    (
      await client.query(
        "select count(*)::int as n from public.creators where region is null or region !~ '^S[0-9]{2}$'",
      )
    ).rows[0].n === 0,
  );
  const families = profileD.by_region;
  const familyTotals = Object.values(families).reduce((sum, family) => sum + family.total, 0);
  const familyOwned = Object.values(families).reduce((sum, family) => sum + family.owned, 0);
  check(
    "saisons : les familles se partagent exactement le catalogue",
    familyTotals === profileD.catalog_size && Object.keys(families).length >= 9,
    `${familyTotals} sur ${profileD.catalog_size}, ${Object.keys(families).length} familles`,
  );
  check(
    "saisons : la complétion par famille ne compte que les créateurs possédés une fois",
    // Diane a trois créateurs uniques : le total des familles doit tomber
    // dessus, même si deux de ses cartes partagent un créateur.
    familyOwned === dianeStats.unique_creators,
    `${familyOwned} sur ${dianeStats.unique_creators}`,
  );
  check(
    "saisons : chaque créateur possédé tombe dans la famille que lui donne le catalogue",
    await (async () => {
      const rows = (
        await client.query(
          `select c.region, count(distinct uc.creator_slug)::int as n
             from public.user_cards uc join public.creators c on c.slug = uc.creator_slug
            where uc.user_id = $1
            group by c.region order by c.region`,
          [D],
        )
      ).rows;
      // Une seule bonne réponse : la famille de Diane ne compte que ses
      // créateurs à elle, et aucune autre famille ne compte quoi que ce soit.
      return rows.length > 0 && rows.every((row) => families[row.region]?.owned === row.n);
    })(),
  );
  check(
    "saisons : une famille sans aucune carte est à zéro, pas absente",
    Object.values(families).some((family) => family.owned === 0) &&
      Object.values(families).every((family) => typeof family.owned === "number"),
  );
  check(
    "saisons : le profil de n'importe qui donne les mêmes totaux par famille",
    (await asPlayer(E, "select public.player_profile($1) as p", [F])).rows[0].p.by_region.S01.total ===
      families.S01.total,
  );

  const verifiedRows = (
    await client.query("select user_id, unique_creators from public.stats where verified order by unique_creators desc")
  ).rows;
  const expectedRank = verifiedRows.filter((row) => row.unique_creators > dianeStats.unique_creators).length + 1;
  check(
    "profil : le rang correspond au nombre de joueurs devant",
    profileD.rank_completion === expectedRank,
    `${profileD.rank_completion} attendu ${expectedRank}`,
  );
  check(
    "profil : une sauvegarde impossible n'a pas de rang",
    (await asPlayer(E, "select public.player_profile($1) as p", [F])).rows[0].p.rank_completion === null,
  );
  check(
    "profil : un identifiant inconnu ne renvoie rien",
    (await asPlayer(E, "select public.player_profile($1) as p", ["99999999-9999-4999-8999-999999999999"])).rows[0].p === null,
  );

  // `user_cards` n'a aucune politique : même le propriétaire des cartes ne voit
  // rien. La table n'est lue que par les fonctions du serveur.
  check(
    "projection : les cartes restent invisibles au client",
    (await asPlayer(D, "select count(*)::int as n from public.user_cards")).rows[0].n === 0,
  );

  const goldRows = (await asPlayer(D, "select * from public.leaderboard(20, $1)", ["gold_cards"])).rows;
  check(
    "classement : le tri Gold met les plus dorés devant",
    goldRows.length > 0 && goldRows.every((row, index) => index === 0 || goldRows[index - 1].gold_cards >= row.gold_cards),
    JSON.stringify(goldRows.map((row) => row.gold_cards)),
  );
  check(
    "classement : chaque ligne porte la complétion et les variantes",
    typeof goldRows[0].completion === "string" || typeof goldRows[0].completion === "number",
    JSON.stringify(goldRows[0]),
  );
  check(
    "classement : un joueur non vérifié reste dehors",
    goldRows.every((row) => row.user_id !== F),
  );

  // Ce que le serveur montre d'un joueur suit ses écritures : Ethan envoie une
  // deuxième carte, sa projection et sa complétion doivent suivre.
  const ethan = (
    await client.query("select state from public.saves where user_id = $1", [E])
  ).rows[0].state;
  await client.query("update public.saves set state = $2 where user_id = $1", [
    E,
    JSON.stringify({ ...ethan, cards: [...ethan.cards, card("ethan-2", uncommonOne.slug, uncommonOne.rarity, "standard", 29)] }),
  ]);
  check(
    "projection : elle suit chaque écriture de sauvegarde",
    (await client.query("select count(*)::int as n from public.user_cards where user_id = $1", [E])).rows[0].n === 2,
  );

  // --- Vitrine nettoyée par un troc -----------------------------------------
  await asPlayer(B, "select public.set_showcase($1)", [["ibai", "auronplay"]]);
  const beforeShowcase = (
    await client.query("select showcase_slugs as s from public.profiles where user_id = $1", [B])
  ).rows[0].s;
  check(
    "vitrine : les deux créateurs sont épinglés avant l'échange",
    JSON.stringify(beforeShowcase) === JSON.stringify(["ibai", "auronplay"]),
    JSON.stringify(beforeShowcase),
  );

  const showcaseTrade = (
    await asPlayer(A, "select public.create_trade($1, $2, $3) as r", [
      B,
      JSON.stringify([{ creatorSlug: "chowh1", variant: "live" }]),
      JSON.stringify([{ creatorSlug: "auronplay", variant: "standard" }]),
    ])
  ).rows[0].r.trade.id;
  check("vitrine : l'offre est acceptée", (await asPlayer(B, "select public.respond_trade($1, true) as r", [showcaseTrade])).rows[0].r.status === "accepted");

  const afterShowcase = (
    await client.query("select showcase_slugs as s from public.profiles where user_id = $1", [B])
  ).rows[0].s;
  check(
    "vitrine : le créateur échangé quitte le profil public, l'autre reste",
    JSON.stringify(afterShowcase) === JSON.stringify(["ibai"]),
    JSON.stringify(afterShowcase),
  );

  // La vitrine de l'autre joueur n'est pas touchée : il n'a rien épinglé.
  check(
    "vitrine : celle de l'autre joueur reste vide",
    (await client.query("select showcase_slugs as s from public.profiles where user_id = $1", [A])).rows[0].s.length === 0,
  );

  // --- Direct ---------------------------------------------------------------
  // Le cache du direct : publié par le serveur, lu par tout le monde.
  const publish = await client.query(
    "select public.live_publish($1::jsonb, $2) as r",
    [
      JSON.stringify([
        {
          login: "kamet0",
          twitch_id: "123",
          display_name: "Kameto",
          game_name: "Just Chatting",
          title: "Sixième journée",
          viewers: 4120,
          started_at: "2026-10-06T18:12:00Z",
          thumbnail: "https://static-cdn.jtvnw.net/x-320x180.jpg",
        },
        {
          login: "ibai",
          twitch_id: "456",
          display_name: "ibai",
          game_name: "League of Legends",
          title: "LVP",
          viewers: "12000",
          // Date volontairement invalide : elle doit être ignorée, pas faire
          // échouer tout le rafraîchissement.
          started_at: "hier soir",
          thumbnail: "",
        },
      ]),
      "vérification",
    ],
  );
  check("direct : la publication renvoie le compte", publish.rows[0].r.streams === 2, JSON.stringify(publish.rows[0].r));
  check(
    "direct : les deux diffusions sont rangées, compteurs convertis",
    (await client.query("select count(*)::int as n, sum(viewers)::int as v from public.live_streams")).rows[0].n === 2 &&
      (await client.query("select count(*)::int as n, sum(viewers)::int as v from public.live_streams")).rows[0].v === 16120,
  );
  check(
    "direct : une date de début invalide devient NULL sans rien casser",
    (await client.query("select started_at as s from public.live_streams where login = 'ibai'")).rows[0].s === null,
  );
  check(
    "direct : l'état du cache est daté",
    (await client.query("select streams, refreshed_at from public.live_state where id")).rows[0].streams === 2,
  );
  // Un second appel remplace la liste : la diffusion terminée disparaît.
  await client.query("select public.live_publish($1::jsonb, $2)", [
    JSON.stringify([{ login: "kamet0", display_name: "Kameto", viewers: 10 }]),
    "après déconnexion d'ibai",
  ]);
  check(
    "direct : une diffusion terminée disparaît de la table",
    (await client.query("select count(*)::int as n from public.live_streams")).rows[0].n === 1,
  );
  check(
    "direct : le compteur de l'état suit",
    (await client.query("select streams from public.live_state where id")).rows[0].streams === 1,
  );
  check(
    "direct : la table est lisible par un joueur, même sans compte",
    (await client.query("set role anon")).command === "SET" &&
      (await client.query("select count(*)::int as n from public.live_streams")).rows[0].n === 1 &&
      (await client.query("reset role")).command === "RESET",
  );
  check(
    "direct : un joueur ne peut pas inventer un direct (publication refusée)",
    await (async () => {
      try {
        await asPlayer(A, "select public.live_publish($1::jsonb)", [JSON.stringify([{ login: "faux" }])]);
        return false;
      } catch (error) {
        return String(error.message).includes("permission denied");
      }
    })(),
  );
  check(
    "direct : un client ne peut pas écrire dans le cache à la main",
    await (async () => {
      try {
        await client.query("set role anon");
        await client.query("insert into public.live_streams (login) values ('pirate')");
        return false;
      } catch {
        return true;
      } finally {
        await client.query("reset role");
      }
    })(),
  );
  check(
    "direct : le catalogue porte le login Twitch (clé du rapprochement)",
    (await client.query("select count(*)::int as n from public.creators where login is not null")).rows[0].n === 1000,
  );
  check(
    "direct : le slug n'est pas le login (les deux sont conservés)",
    (
      await client.query("select count(*)::int as n from public.creators where slug <> login")
    ).rows[0].n > 0,
  );

  // --- Amis -----------------------------------------------------------------
  // Les amitiés sont symétriques et **décidées par le serveur** : un client ne
  // peut ni se déclarer ami, ni accepter à la place de quelqu'un d'autre. Ce
  // qu'on vérifie ici, c'est justement que tout cela se décide bien en base.
  // Sans compte : rien à lire, rien à envoyer.
  check(
    "amis : sans compte, on ne peut même pas envoyer une demande",
    await (async () => {
      try {
        await client.query("set role anon");
        await client.query("select public.send_friend_request($1)", [B]);
        return false;
      } catch (error) {
        return String(error.message).includes("permission denied");
      } finally {
        await client.query("reset role");
      }
    })(),
  );
  check(
    "amis : la fonction interne reste hors de portée d'un joueur",
    await (async () => {
      try {
        await asPlayer(A, "select public._friend_user_id($1)", [B]);
        return false;
      } catch (error) {
        return String(error.message).includes("permission denied");
      }
    })(),
  );

  // Envoyer, puis accepter.
  const sent = (await asPlayer(A, "select public.send_friend_request($1) as r", [B])).rows[0].r;
  check(
    "amis : la demande part et n'est pas encore une amitié",
    sent.request?.id != null && sent.alreadyFriends === false && sent.existingRequest === null,
    JSON.stringify(sent.alreadyFriends),
  );
  check(
    "amis : l'expéditeur voit sa demande envoyée, le destinataire la reçoit",
    (await asPlayer(A, "select public.list_outgoing_friend_requests() as r")).rows[0].r[0].recipientId === B &&
      (await asPlayer(B, "select public.list_incoming_friend_requests() as r")).rows[0].r[0].senderId === A,
  );
  check(
    "amis : ni l'un ni l'autre ne se voit déjà ami",
    (await asPlayer(A, "select public.list_friends() as r")).rows[0].r.length === 0 &&
      (await asPlayer(A, "select public.has_friendship($1) as r", [B])).rows[0].r === false,
  );
  check(
    "amis : envoyer deux fois la même demande ne crée pas de doublon",
    (await asPlayer(A, "select public.send_friend_request($1) as r", [B])).rows[0].r.request?.id === sent.request.id &&
      (await client.query("select count(*)::int as n from public.friend_requests where sender_id = $1", [A])).rows[0].n === 1,
  );
  check(
    "amis : la demande croisée est signalée, pas doublée",
    (await asPlayer(B, "select public.send_friend_request($1) as r", [A])).rows[0].r.existingRequest?.id === sent.request.id &&
      (await client.query("select count(*)::int as n from public.friend_requests where sender_id = $1", [B])).rows[0].n === 0,
  );
  check(
    "amis : seul le destinataire peut accepter",
    await (async () => {
      try {
        await asPlayer(A, "select public.accept_friend_request($1)", [sent.request.id]);
        return false;
      } catch (error) {
        return String(error.message).includes("introuvable");
      }
    })(),
  );
  const amitie = (await asPlayer(B, "select public.accept_friend_request($1) as r", [sent.request.id])).rows[0].r;
  check(
    "amis : l'acceptation crée une amitié unique",
    amitie.request?.status === "accepted" && amitie.friendship !== null &&
      (await client.query("select count(*)::int as n from public.friends")).rows[0].n === 1,
  );
  check(
    "amis : l'amitié se voit des deux côtés, dans les deux sens",
    (await asPlayer(A, "select public.list_friends() as r")).rows[0].r[0].friendId === B &&
      (await asPlayer(B, "select public.list_friends() as r")).rows[0].r[0].friendId === A &&
      (await asPlayer(B, "select public.has_friendship($1) as r", [A])).rows[0].r === true,
  );
  check(
    "amis : une demande acceptée quitte les listes d'attente",
    (await asPlayer(A, "select public.list_outgoing_friend_requests() as r")).rows[0].r.length === 0 &&
      (await asPlayer(B, "select public.list_incoming_friend_requests() as r")).rows[0].r.length === 0,
  );
  check(
    "amis : on ne renvoie pas de demande à quelqu'un dont on est déjà l'ami",
    (await asPlayer(A, "select public.send_friend_request($1) as r", [B])).rows[0].r.alreadyFriends === true,
  );
  check(
    "amis : un joueur ne peut pas s'ajouter lui-même",
    await (async () => {
      try {
        await asPlayer(A, "select public.send_friend_request($1)", [A]);
        return false;
      } catch (error) {
        return String(error.message).includes("toi-même");
      }
    })(),
  );
  check(
    "amis : un identifiant inconnu est refusé",
    await (async () => {
      try {
        await asPlayer(A, "select public.send_friend_request($1)", ["99999999-9999-4999-8999-999999999999"]);
        return false;
      } catch (error) {
        return String(error.message).includes("n''existe pas") || String(error.message).includes("n'existe pas");
      }
    })(),
  );

  // Refuser, annuler, retirer.
  const rejected = (await asPlayer(C, "select public.send_friend_request($1) as r", [D])).rows[0].r.request.id;
  await asPlayer(D, "select public.reject_friend_request($1)", [rejected]);
  check(
    "amis : un refus n'crée pas d'amitié et sort des listes",
    (await asPlayer(C, "select public.list_outgoing_friend_requests() as r")).rows[0].r.length === 0 &&
      (await asPlayer(D, "select public.has_friendship($1) as r", [C])).rows[0].r === false,
  );
  const cancelled = (await asPlayer(C, "select public.send_friend_request($1) as r", [E])).rows[0].r.request.id;
  await asPlayer(C, "select public.cancel_friend_request($1)", [cancelled]);
  check(
    "amis : une demande annulée sort des deux listes",
    (await asPlayer(C, "select public.list_outgoing_friend_requests() as r")).rows[0].r.length === 0 &&
      (await asPlayer(E, "select public.list_incoming_friend_requests() as r")).rows[0].r.length === 0,
  );
  await asPlayer(A, "select public.remove_friend($1)", [B]);
  check(
    "amis : retirer un ami efface le lien, des deux côtés",
    (await asPlayer(A, "select public.list_friends() as r")).rows[0].r.length === 0 &&
      (await asPlayer(B, "select public.list_friends() as r")).rows[0].r.length === 0 &&
      (await client.query("select count(*)::int as n from public.friends")).rows[0].n === 0,
  );

  // Un tiers ne voit rien : ni les demandes, ni les amitiés des autres.
  await asPlayer(A, "select public.send_friend_request($1)", [B]);
  check(
    "amis : un joueur étranger ne voit ni les demandes ni les amitiés des autres",
    // Ses propres lignes restent visibles (une demande annulée le concerne) :
    // ce qui doit disparaître, c'est tout ce qui ne le regarde pas.
    (await asPlayer(E, "select public.list_incoming_friend_requests() as r")).rows[0].r.length === 0 &&
      (await asPlayer(E, "select public.list_outgoing_friend_requests() as r")).rows[0].r.length === 0 &&
      (await asPlayer(E, "select count(*)::int as n from public.friend_requests where sender_id = $1 or recipient_id = $1", [A])).rows[0].n === 0 &&
      (await asPlayer(E, "select count(*)::int as n from public.friend_requests")).rows[0].n === 1 &&
      (await asPlayer(E, "select count(*)::int as n from public.friends")).rows[0].n === 0,
  );
  check(
    "amis : on ne peut pas écrire une amitié à la main",
    await (async () => {
      try {
        await asPlayer(A, `insert into public.friends (user1_id, user2_id) values (least($1::uuid, $2::uuid), greatest($1::uuid, $2::uuid))`, [A, B]);
        return false;
      } catch {
        return true;
      }
    })(),
  );

  // --- Rejouabilité --------------------------------------------------------
  await client.query(catalogue);
  await client.query(tirage);
  await client.query(await readFile(path.join(MIGRATIONS, "0006_profil_public.sql"), "utf8"));
  await client.query(direct);
  await client.query(friends);
  check(
    "profil public rejouable : la projection est intacte",
    (await client.query("select count(*)::int as n from public.user_cards where user_id = $1", [D])).rows[0].n === 4,
  );
  check(
    "profil public rejouable : le profil répond encore",
    (await asPlayer(E, "select public.player_profile($1) as p", [D])).rows[0].p.unique_creators === 3,
  );
  await client.query("select set_config('test.uid', $1, false)", [USER]);
  const replay = (await client.query("select public.open_pack() as r")).rows[0].r;
  check("migrations rejouables : open_pack répond encore 5 cartes", replay.cards.length === 5);
  const afterReplay = await client.query("select count(*)::int as n from public.creators");
  check("migrations rejouables : toujours 1000 créateurs", afterReplay.rows[0].n === 1000, String(afterReplay.rows[0].n));
  check(
    "migrations rejouables : la complétion par famille répond encore",
    (await asPlayer(E, "select public.player_profile($1) as p", [D])).rows[0].p.by_region.S01.total ===
      families.S01.total,
  );
  check(
    "migrations rejouables : les amis répondent encore",
    (await asPlayer(A, "select public.list_friends() as r")).rows[0].r.length === 0 &&
      (await asPlayer(A, "select public.list_outgoing_friend_requests() as r")).rows[0].r[0]?.recipientId === B,
  );
  check(
    "migrations rejouables : le direct répond encore",
    (await client.query("select streams from public.live_state where id")).rows[0].streams === 1,
  );

  console.log("");
  console.log(failures === 0 ? "🎉 Toutes les vérifications passent." : `⚠️ ${failures} vérification(s) en échec.`);
} finally {
  await client.end().catch(() => {});
  await server.stop().catch(() => {});
  await rm(dataDir, { recursive: true, force: true }).catch(() => {});
}

process.exit(failures === 0 ? 0 : 1);
