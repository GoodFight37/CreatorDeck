/** Preuves 0056 sur le vrai Postgres jetable, après les scénarios historiques. */
export async function verifyCircleDraw({ client, player, asPlayer, refuses, check, sql }) {
  await client.query(sql);
  const circle = (await client.query("select slug from public.creators where rarity = 'common' and not retired order by slug limit 8")).rows.map(c => c.slug);
  for (const [scenario, count] of [0, 1, 5, 6, 7, 8].entries()) {
    const user = `56565656-0000-4000-8000-${String(scenario + 1).padStart(12, "0")}`;
    const owned = circle.slice(0, count).map((creatorSlug, i) => ({ id: `circle-${i}`, creatorSlug, rarity: "common", variant: "standard", obtainedAt: Date.now(), rareDrop: false }));
    await player(user, `Cercle ${scenario}`, owned);
    await asPlayer(user, "select public.set_circle($1::text[])", [circle]);
    await asPlayer(user, "select public.complete_tutorial()");
    await client.query("insert into public.return_gifts(user_id, boosters_remaining, claimed_at) values($1, 5, now()) on conflict(user_id) do update set boosters_remaining = 5, claimed_at = now()", [user]);
    const missing = circle.slice(count);
    // Les cartes obtenues lors du tirage précédent sont retirées de la fixture,
    // mais leurs droits historiques restent : on teste la collection actuelle.
    const restoreCollection = () => client.query("update public.saves set state = jsonb_set(state, '{cards}', $2::jsonb) where user_id = $1", [user, JSON.stringify(owned)]);
    for (let run = 0; run < 9; run++) {
      await restoreCollection();
      await client.query("insert into public.pack_state(user_id, packs, last_regen_at) values($1, 4, now()) on conflict(user_id) do update set packs = 4, last_regen_at = now()", [user]);
      const gift = run >= 4;
      const query = gift ? run % 2 === 0 ? "select public.open_circle_gift_pack($1::text[]) as r" : "select public.open_return_gift_pack() as r" : "select public.open_pack() as r";
      const result = (await asPlayer(user, query, gift && run % 2 === 0 ? [circle] : [])).rows[0].r;
      const cards = result.cards;
      const label = `0056 : ${gift ? `cadeau ${run - 3}/5` : `Live Drop ${run + 1}/4`}, ${missing.length} absentes`;
      check(`${label} : cinq cartes`, cards.length === 5);
      if (missing.length) {
        check(`${label} : dernière carte absente du cercle`, missing.includes(cards[4].creatorSlug), cards[4].creatorSlug);
        check(`${label} : au moins trois absentes`, cards.filter(c => missing.includes(c.creatorSlug)).length >= 3);
        if (missing.length >= 3) check(`${label} : cinq identités distinctes`, new Set(cards.map(c => c.creatorSlug)).size === 5);
        if (!count) check(`${label} : préférée choisie à poids égal`, cards.some(c => c.creatorSlug === circle[0]));
      } else {
        check(`${label} : retour au monde`, cards.some(c => !circle.includes(c.creatorSlug)) && ["rare", "epic", "legendary"].includes(cards[4].rarity));
      }
      const projected = (await client.query("select distinct creator_slug from public.user_cards where user_id = $1", [user])).rows.map(c => c.creator_slug);
      check(`${label} : collection écrite par le serveur`, cards.every(c => projected.includes(c.creatorSlug)));
      if (gift) check(`${label} : débit cadeau exact`, result.gift_remaining === 8 - run);
    }
    // Le compte a des droits sur les tirages précédents, mais les cartes ont
    // été retirées : l'historique ne doit pas les faire compter comme possédées.
    await restoreCollection();
    const actual = (await client.query("select public._pack_circle_missing($1) as r", [user])).rows[0].r;
    check(`0056 : ${missing.length} absentes selon la collection, pas les droits historiques`, JSON.stringify(actual) === JSON.stringify(missing));
    await refuses("0056 : helper de collection fermé au client", user, "select public._pack_circle_missing($1)", [user], "permission denied");
  }
  // Le seuil de malchance ne doit pas faire perdre la dernière Commune absente.
  const pityUser = "56565656-0000-4000-8000-000000000001";
  await client.query("delete from public.pack_draws where user_id = $1", [pityUser]);
  await client.query(`insert into public.pack_draws(user_id, cards, drawn_at)
    select $1, $2::jsonb, now() - interval '1 hour' from generate_series(1, 11)`,
  [pityUser, JSON.stringify(Array.from({ length: 5 }, () => ({ creatorSlug: circle[0], rarity: "common", variant: "standard" })))]);
  await client.query("update public.pack_state set packs = 4 where user_id = $1", [pityUser]);
  const pity = (await asPlayer(pityUser, "select public.open_pack() as r")).rows[0].r;
  check("0056 : sous pity aussi, dernière absente du cercle", pity.pity_hit && circle.includes(pity.cards[4].creatorSlug) && pity.cards[4].rarity === "common");
  await refuses("0056 : tirage de cercle interne fermé au client", pityUser,
    "select public._pack_circle_pick($1::text[], '{}'::jsonb, $2)", [circle, circle[0]], "permission denied");
  await refuses("0056 : Live Drop sans compte refusé", null, "select public.open_pack()", [], "connecte-toi");
  await client.query(sql);
  check("0056 : migration rejouable", true);
}
