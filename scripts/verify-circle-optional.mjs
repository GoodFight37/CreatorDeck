/** Preuves 0058 sur le vrai Postgres jetable : cercle facultatif, de 0 à 15. */
export async function verifyCircleOptional({ client, player, asPlayer, refuses, check, sql }) {
  const pool = (await client.query("select slug from public.creators where not retired order by slug limit 16")).rows.map(c => c.slug);
  const kept = "58585858-0000-4000-8000-000000000005";
  await player(kept, "Cercle de cinq gardé", []);
  await asPlayer(kept, "select public.set_circle($1::text[])", [pool.slice(0, 5)]);
  await client.query(sql);
  const keptRow = (await client.query("select slugs from public.player_circles where user_id = $1", [kept])).rows[0];
  check("0058 : un cercle de cinq déjà enregistré reste intact", JSON.stringify(keptRow?.slugs) === JSON.stringify(pool.slice(0, 5)));

  const one = "58585858-0000-4000-8000-000000000001";
  await player(one, "Une chaîne", []);
  await asPlayer(one, "select public.set_circle($1::text[])", [[pool[0]]]);
  let row = (await client.query("select slugs from public.player_circles where user_id = $1", [one])).rows[0];
  check("0058 : une seule chaîne est acceptée", JSON.stringify(row?.slugs) === JSON.stringify([pool[0]]));
  for (let run = 0; run < 3; run++) {
    await client.query("insert into public.pack_state(user_id, packs, last_regen_at) values($1, 4, now()) on conflict(user_id) do update set packs = 4, last_regen_at = now()", [one]);
    await client.query("update public.saves set state = jsonb_set(state, '{cards}', '[]'::jsonb) where user_id = $1", [one]);
    const cards = (await asPlayer(one, "select public.open_pack() as r")).rows[0].r.cards;
    check(`0058 : une chaîne nommée, Live Drop ${run + 1} la met en dernière carte`, cards.length === 5 && cards[4].creatorSlug === pool[0], cards[4].creatorSlug);
  }

  const two = "58585858-0000-4000-8000-000000000002";
  await player(two, "Deux chaînes", []);
  await asPlayer(two, "select public.set_circle($1::text[])", [pool.slice(0, 2)]);
  await client.query("insert into public.pack_state(user_id, packs, last_regen_at) values($1, 4, now()) on conflict(user_id) do update set packs = 4", [two]);
  const twoCards = (await asPlayer(two, "select public.open_pack() as r")).rows[0].r.cards;
  check("0058 : deux chaînes nommées, les deux comptent", pool.slice(0, 2).every(slug => twoCards.some(c => c.creatorSlug === slug)));

  await asPlayer(one, "select public.set_circle($1::text[])", [[]]);
  row = (await client.query("select slugs from public.player_circles where user_id = $1", [one])).rows[0];
  check("0058 : zéro chaîne retire la ligne", row === undefined);
  const missing = (await client.query("select public._pack_circle_missing($1) as r", [one])).rows[0].r;
  check("0058 : sans cercle, aucune chaîne inventée", Array.isArray(missing) && missing.length === 0);
  await client.query("update public.pack_state set packs = 4 where user_id = $1", [one]);
  const world = (await asPlayer(one, "select public.open_pack() as r")).rows[0].r;
  check("0058 : sans cercle, Live Drop mondial", world.cards.length === 5 && world.pity_circle === false);

  await refuses("0058 : seize chaînes refusées", one, "select public.set_circle($1::text[])", [pool.slice(0, 16)], "15 chaînes au maximum");
  await refuses("0058 : doublon refusé", one, "select public.set_circle($1::text[])", [[pool[0], pool[0]]], "en double");
  await refuses("0058 : chaîne inconnue refusée", one, "select public.set_circle($1::text[])", [["chaine-inexistante-0058"]], "inconnue");
  await refuses("0058 : sans compte refusé", null, "select public.set_circle($1::text[])", [[]], "connecte-toi");
  await client.query(sql);
  check("0058 : migration rejouable", true);
}
