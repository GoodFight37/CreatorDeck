/** Preuves 0060 sur le vrai Postgres jetable : une chaîne hors catalogue, sans carte. */
export async function verifyCircleHorsCatalogue({ client, player, asPlayer, refuses, check, sql }) {
  await client.query(sql);
  const pool = (await client.query("select slug from public.creators where not retired order by slug limit 2")).rows.map(c => c.slug);
  const login = (await client.query("select lower(login) as l from public.creators where login is not null limit 1")).rows[0].l;
  const user = "60606060-0000-4000-8000-000000000001";
  const name = "Chaîne 0060";
  // Garde : display_name est limité à 24 caractères (0001_comptes_cloud.sql).
  if ([...name].length > 24) throw new Error(`pseudo de test trop long : ${name}`);
  await player(user, name, []);

  // Préférée hors catalogue, puis une chaîne du catalogue.
  const circle = ["twitch:petite_chaine_60", pool[0]];
  await asPlayer(user, "select public.set_circle($1::text[])", [[" Twitch:Petite_Chaine_60 ", pool[0]]]);
  const row = (await client.query("select slugs from public.player_circles where user_id = $1", [user])).rows[0];
  check("0060 : une chaîne hors catalogue est acceptée, normalisée", JSON.stringify(row?.slugs) === JSON.stringify(circle), JSON.stringify(row?.slugs));

  const missing = (await client.query("select public._pack_circle_missing($1) as r", [user])).rows[0].r;
  check("0060 : la chaîne hors catalogue n'est jamais une absente à tirer", JSON.stringify(missing) === JSON.stringify([pool[0]]));
  for (let run = 0; run < 3; run++) {
    await client.query("insert into public.pack_state(user_id, packs, last_regen_at) values($1, 4, now()) on conflict(user_id) do update set packs = 4, last_regen_at = now()", [user]);
    await client.query("update public.saves set state = jsonb_set(state, '{cards}', '[]'::jsonb) where user_id = $1", [user]);
    const cards = (await asPlayer(user, "select public.open_pack() as r")).rows[0].r.cards;
    check(`0060 : Live Drop ${run + 1} sans carte hors catalogue, la chaîne du catalogue compte`,
      cards.length === 5 && cards.every(c => !String(c.creatorSlug).startsWith("twitch:")) && cards.some(c => c.creatorSlug === pool[0]));
  }

  // Quinze entrées hors catalogue : la borne reste 15, quelle que soit la forme.
  const many = Array.from({ length: 15 }, (_, i) => `twitch:chaine_${String(i).padStart(2, "0")}`);
  await asPlayer(user, "select public.set_circle($1::text[])", [many]);
  check("0060 : quinze chaînes hors catalogue acceptées", true);
  await refuses("0060 : seize entrées refusées", user, "select public.set_circle($1::text[])", [[...many, pool[0]]], "15 chaînes au maximum");
  await refuses("0060 : doublon hors catalogue refusé", user, "select public.set_circle($1::text[])", [["twitch:abcd", "TWITCH:abcd"]], "en double");
  await refuses("0060 : login trop court refusé", user, "select public.set_circle($1::text[])", [["twitch:abc"]], "Twitch invalide");
  await refuses("0060 : login à caractère interdit refusé", user, "select public.set_circle($1::text[])", [["twitch:abc-def"]], "Twitch invalide");
  await refuses("0060 : slug nu inconnu toujours refusé", user, "select public.set_circle($1::text[])", [["chaine-inexistante-0060"]], "inconnue");

  // Le direct : les logins seuls, dédoublonnés, sans ceux du catalogue, service seulement.
  const other = "60606060-0000-4000-8000-000000000002";
  await player(other, "Deuxième joueur 0060", []);
  await asPlayer(other, "select public.set_circle($1::text[])", [["twitch:chaine_00", `twitch:${login}`]]);
  const logins = (await client.query("select public.live_circle_logins() as r")).rows[0].r;
  check("0060 : live_circle_logins rend les logins hors catalogue, le plus suivi d'abord",
    logins.length === 15 && logins[0] === "chaine_00" && !logins.includes(login) && logins.every(l => !l.startsWith("twitch:")), JSON.stringify(logins.slice(0, 3)));
  check("0060 : live_circle_logins plafonné", (await client.query("select cardinality(public.live_circle_logins(2)) as n")).rows[0].n === 2);
  await refuses("0060 : live_circle_logins fermé aux joueurs", user, "select public.live_circle_logins()", [], "permission denied");

  await client.query(sql);
  check("0060 : migration rejouable", true);
}
