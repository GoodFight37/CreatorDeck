/** Preuves 0059 sur le vrai Postgres jetable : une chaîne du cercle au plus une fois par booster. */
export async function verifyCircleOnce({ client, player, asPlayer, check, sql }) {
  await client.query(sql);
  const pool = (await client.query("select slug from public.creators where not retired order by slug limit 2")).rows.map(c => c.slug);
  const open = async (user) => {
    await client.query("insert into public.pack_state(user_id, packs, last_regen_at) values($1, 4, now()) on conflict(user_id) do update set packs = 4, last_regen_at = now()", [user]);
    await client.query("update public.saves set state = jsonb_set(state, '{cards}', '[]'::jsonb) where user_id = $1", [user]);
    return (await asPlayer(user, "select public.open_pack() as r")).rows[0].r.cards;
  };

  const one = "59595959-0000-4000-8000-000000000001";
  await player(one, "Une chaîne 0059", []);
  await asPlayer(one, "select public.set_circle($1::text[])", [[pool[0]]]);
  for (let run = 0; run < 3; run++) {
    const cards = await open(one);
    const count = cards.filter(c => c.creatorSlug === pool[0]).length;
    check(`0059 : une chaîne nommée sort une seule fois (Live Drop ${run + 1})`, cards.length === 5 && count === 1 && cards[4].creatorSlug === pool[0], `${count} fois`);
  }

  const two = "59595959-0000-4000-8000-000000000002";
  await player(two, "Deux chaînes 0059", []);
  await asPlayer(two, "select public.set_circle($1::text[])", [pool]);
  const cards = await open(two);
  check("0059 : deux chaînes nommées, chacune une fois, cinq créateurs différents",
    pool.every(slug => cards.filter(c => c.creatorSlug === slug).length === 1) && new Set(cards.map(c => c.creatorSlug)).size === 5);

  await client.query(sql);
  check("0059 : migration rejouable", true);
}
