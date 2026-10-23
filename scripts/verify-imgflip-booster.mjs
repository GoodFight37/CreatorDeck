import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

/** 0062 sur le Postgres jetable existant ; jamais de connexion distante. */
export async function verifyImgflipBooster({ client, player, asPlayer, refuses, check, sql }) {
  const cards = JSON.parse(await readFile(new URL("../src/data/imgflip.json", import.meta.url), "utf8"));
  const rates = JSON.parse(await readFile(new URL("../src/data/pull-rates.json", import.meta.url), "utf8"));
  const snapshot = JSON.parse(sql.match(/v_rates constant jsonb := '([^']+)'::jsonb/)[1]);
  check("0062 : déploiement manuel obligatoire", sql.startsWith("-- creatordeck-deploy: manual\n"));
  check("0062 : taux Live et garantie identiques au client", JSON.stringify(snapshot) === JSON.stringify({
    slots: rates.packs.live.slots, guaranteed: rates.packs.live.guaranteed,
    rareDrop: rates.packs.live.rareDrop, pity: rates.pity.threshold,
  }));
  const user = "62626262-0000-4000-8000-000000000001";
  const other = "62626262-0000-4000-8000-000000000002";
  await player(user, "Imgflip local", []);
  await player(other, "Autre Imgflip", []);
  const protectedTables = ["meme_catalog", "meme_profile", "meme_collection", "meme_openings", "wallets", "pack_state", "user_cards"];
  async function protectedState() {
    return Promise.all(protectedTables.map(async table => (await client.query(
      `select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text), '[]'::jsonb) as data from public.${table} t`,
    )).rows[0].data));
  }
  const before = await protectedState();
  await client.query(sql);
  const catalog = (await client.query("select id, title, rarity from public.imgflip_catalog order by id")).rows;
  check("0062 : 999 cartes et raretés inchangées", catalog.length === 999 && JSON.stringify(catalog) === JSON.stringify(
    cards.map(card => ({ id: card.id, title: card.name, rarity: card.rarity })).sort((a, b) => a.id.localeCompare(b.id)),
  ));
  for (const table of ["imgflip_catalog", "imgflip_profile", "imgflip_collection", "imgflip_openings"]) {
    const privileges = (await client.query(`select relrowsecurity as rls,
      has_table_privilege('anon', oid, 'select,insert,update,delete') as anon,
      has_table_privilege('authenticated', oid, 'select,insert,update,delete') as auth
      from pg_class where oid = $1::regclass`, [`public.${table}`])).rows[0];
    check(`0062 : ${table} protégée par RLS et sans accès direct`, privileges.rls && !privileges.anon && !privileges.auth);
  }
  check("0062 : helper privé, RPC sans accès anonyme", (await client.query(`select
    not has_function_privilege('authenticated', 'public._imgflip_refill(uuid)', 'execute')
    and not has_function_privilege('anon', 'public.imgflip_status()', 'execute')
    and not has_function_privilege('anon', 'public.open_imgflip_pack(uuid)', 'execute') as ok`)).rows[0].ok);
  await refuses("0062 : identité absente refusée", null, "select public.imgflip_status()", [], "Connecte-toi");
  await refuses("0062 : tirage sans identité refusé", null, "select public.open_imgflip_pack($1)", [randomUUID()], "Connecte-toi");
  await refuses("0062 : requête sans UUID refusée", user, "select public.open_imgflip_pack(null)", [], "Réessaie");
  const status = async id => (await asPlayer(id, "select public.imgflip_status() as r")).rows[0].r;
  const draw = async (id, request = randomUUID()) => (await asPlayer(id, "select public.open_imgflip_pack($1) as r", [request])).rows[0].r;
  const initial = await status(user);
  check("0062 : réserve séparée de quatre et collection vide", initial.stock === 4 && initial.owned.length === 0);
  const request = randomUUID();
  const first = await draw(user, request);
  const replay = await draw(user, request);
  const byId = new Map(cards.map(card => [card.id, card]));
  check("0062 : cinq cartes Imgflip distinctes, dernière Rare ou mieux", first.cards.length === 5 && new Set(first.cards).size === 5
    && first.cards.every(id => byId.has(id)) && ["rare", "epic", "legendary"].includes(byId.get(first.cards[4]).rarity));
  check("0062 : même requête rejouée une seule fois", replay.replayed && JSON.stringify(first.cards) === JSON.stringify(replay.cards)
    && (await status(user)).stock === 3 && (await status(user)).openings === 1);
  check("0062 : cinq possessions serveur, autre compte isolé", (await status(user)).owned.reduce((sum, item) => sum + item.copies, 0) === 5
    && (await status(other)).owned.length === 0);
  for (let i = 0; i < 3; i++) await draw(user);
  await refuses("0062 : réserve épuisée refusée", user, "select public.open_imgflip_pack($1)", [randomUUID()], "Aucun booster");
  check("0062 : rejeu possible même réserve vide", (await draw(user, request)).replayed && (await status(user)).stock === 0);
  await client.query("update public.imgflip_profile set anchor_at = now() - interval '61 minutes' where user_id=$1", [user]);
  const refilled = await status(user);
  check("0062 : recharge par tranches de 30 minutes", refilled.stock === 2 && refilled.next_at !== null);
  await client.query("update public.imgflip_profile set stock=4, dry_streak=$2 where user_id=$1", [user, rates.pity.threshold]);
  const pity = await draw(user);
  check("0062 : garantie légendaire et compteur remis à zéro", byId.get(pity.cards[4]).rarity === "legendary"
    && (await client.query("select dry_streak from public.imgflip_profile where user_id=$1", [user])).rows[0].dry_streak === 0);

  // setseed ne modifie pas le code : on trouve une graine réelle déclenchant le Perfect.
  let seed;
  for (let i = 0; i < 20000; i++) {
    const candidate = i / 20000;
    await client.query("select setseed($1)", [candidate]);
    if ((await client.query("select public._pack_random_int(1000) as n")).rows[0].n < rates.packs.live.rareDrop.chancePermille) {
      seed = candidate;
      break;
    }
  }
  if (seed === undefined) throw new Error("Aucune graine Perfect trouvée sur le Postgres local.");
  await client.query("select setseed($1)", [seed]);
  const perfect = await draw(user);
  check("0062 : Perfect réel, cinq Épiques ou Légendaires sans mythique", perfect.cards.every(id => ["epic", "legendary"].includes(byId.get(id).rarity)));
  await client.query("update public.imgflip_profile set stock=4, anchor_at=now() where user_id=$1", [user]);
  const concurrentRequest = randomUUID();
  const peers = [new client.constructor(client.connectionParameters), new client.constructor(client.connectionParameters)];
  let concurrent;
  try {
    concurrent = await Promise.all(peers.map(async peer => {
      await peer.connect();
      await peer.query("select set_config('test.uid', $1, false)", [user]);
      await peer.query("set role authenticated");
      return (await peer.query("select public.open_imgflip_pack($1) as r", [concurrentRequest])).rows[0].r;
    }));
  } finally { await Promise.all(peers.map(peer => peer.end())); }
  check("0062 : double requête concurrente, un débit et mêmes cartes", concurrent.filter(item => item.replayed).length === 1
    && JSON.stringify(concurrent[0].cards) === JSON.stringify(concurrent[1].cards) && (await status(user)).stock === 3);

  const saved = await status(user);
  let incomplete;
  await client.query("begin");
  try {
    await client.query("update public.imgflip_catalog set pullable=false");
    await client.query("set role authenticated");
    await client.query("select public.open_imgflip_pack($1)", [randomUUID()]);
  } catch (error) { incomplete = error.message.includes("Catalogue Imgflip incomplet"); }
  finally { await client.query("rollback"); }
  check("0062 : catalogue incomplet refusé sans débit ni possession partielle", incomplete && JSON.stringify(await status(user)) === JSON.stringify(saved));
  await client.query(sql);
  check("0062 : migration rejouable sans perdre la collection", JSON.stringify(await status(user)) === JSON.stringify(saved));
  check("0062 : MEMES, Twitch et wallet conservés", JSON.stringify(before) === JSON.stringify(await protectedState()));
}
