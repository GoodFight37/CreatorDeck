import { readFile } from "node:fs/promises";

/** Même jeu de scénarios que supabase-retention.test.ts, sur le vrai SQL. */
export async function verifyRetention({ client, player, asPlayer, refuses, check, sql }) {
  await client.query(sql);
  // Le journal déclenche aussi Last Pack : même une fixture de dates doit
  // contenir cinq cartes valides, conformément à sa contrainte serveur.
  const cards = (await client.query(`select jsonb_agg(jsonb_build_object(
    'id', gen_random_uuid()::text, 'creatorSlug', slug, 'rarity', rarity,
    'variant', 'standard', 'rareDrop', false, 'obtainedAt', 1)) as cards
    from (select slug, rarity from public.creators where not retired order by slug limit 5) c`)).rows[0].cards;
  const cases = JSON.parse(await readFile(new URL("../src/data/retention-cases.json", import.meta.url), "utf8"));
  for (const [index, scenario] of cases.entries()) {
    const user = `57575757-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    await player(user, `Rétention ${index}`, []);
    for (const offset of scenario.days) {
      await client.query("insert into public.pack_draws(user_id, cards, kind, drawn_at) values($1, $3::jsonb, 'live', $2)",
        [user, new Date(Date.UTC(2026, 9, 1, 12) + offset * 86_400_000), JSON.stringify(cards)]);
    }
    const at = new Date(Date.UTC(2026, 9, 1, 12) + scenario.days.at(-1) * 86_400_000);
    const actual = (await client.query("select public._pack_streak_state($1, $2) as r", [user, at])).rows[0].r;
    check(`0057 : ${scenario.name}, même série que TS`, actual.streak === scenario.streak);
    check(`0057 : ${scenario.name}, même protection que TS`, actual.protection_used === scenario.protected);
  }
  const config = JSON.parse(await readFile(new URL("../src/data/progression.json", import.meta.url), "utf8"));
  for (let day = 0; day <= 8; day++) {
    const actual = (await client.query("select public._streak_reward_packs($1) as packs, public._streak_reward_points($1) as points, public._streak_reward_tokens($1) as tokens", [day])).rows[0];
    check(`0057 : barème J${day} identique au fichier TS`, actual.packs === (config.streak.rewards.find(r => r.day === day)?.packs ?? 0) && actual.points === 0 && actual.tokens === 0);
  }
  const user = "57575757-0000-4000-8000-000000000099";
  await player(user, "Booster de série", []);
  await client.query("insert into public.pack_state(user_id, packs, last_regen_at) values($1, 4, now())", [user]);
  const first = (await asPlayer(user, "select public.open_pack() as r")).rows[0].r;
  const second = (await asPlayer(user, "select public.open_pack() as r")).rows[0].r;
  check("0057 : premier jour crédite réellement un booster", first.packs === 4 && first.streak_reward.packs === 1);
  check("0057 : seconde ouverture ne repaie pas", second.packs === 3 && second.streak_reward.packs === 0);
  check("0057 : aucune monnaie de série annoncée", first.streak_reward.points === 0 && first.streak_reward.tokens === 0);
  await refuses("0057 : le client ne peut plus voler une carte", user, "select public.last_pack_steal(1, 1)", [], "permission denied");
}
