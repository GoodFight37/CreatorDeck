/** Scénarios exécutés sur le Postgres jetable du vérificateur, jamais en production. */
export async function verifyHourglasses({ client, pg, asPlayer, refuses, check, sql, followupSql }) {
  await client.query(sql);
  await client.query(followupSql);
  const user = 'f7777777-7777-4777-8777-777777777777';
  const other = 'f8888888-8888-4888-8888-888888888888';
  const request = '11111111-1111-4111-8111-111111111111';
  const nextRequest = '22222222-2222-4222-8222-222222222222';
  await client.query('insert into auth.users(id) values($1),($2)', [user, other]);
  const template = (await client.query("select state from public.saves where user_id='f6666666-6666-4666-8666-666666666666'")).rows[0].state;
  const seed = { ...template, playerId: user, hourglasses: 2, hourglassesSpent: 0, packs: 0, cards: [], openings: 0 };
  await client.query("insert into public.saves(user_id,state,save_version,device_updated_at,state_checksum) values($1,$2::jsonb,9,0,md5($2::text))", [user, JSON.stringify(seed)]);
  await client.query("insert into public.pack_state(user_id,packs,last_regen_at) values($1,0,clock_timestamp()-interval '20 minutes')", [user]);
  await refuses('sabliers : authentification obligatoire', null, 'select public.use_hourglass($1)', [request], 'connecte-toi');
  await refuses('sabliers : sauvegarde requise, pas de crédit implicite', other, 'select public.use_hourglass($1)', [request], 'synchronise ta partie');
  await refuses('sabliers : clé de rejeu obligatoire', user, 'select public.use_hourglass(null)', [], 'manquante');
  await refuses('sabliers : écriture directe du registre interdite', user, 'insert into public.hourglass_spends(user_id,request_id) values($1,$2)', [user, request], 'permission denied');
  const before = (await client.query('select last_regen_at from public.pack_state where user_id=$1', [user])).rows[0].last_regen_at;
  const used = (await asPlayer(user, 'select public.use_hourglass($1) r', [request])).rows[0].r;
  check('sabliers : débit exact, compteur protégé et booster rechargé', used.save.state.hourglasses === 1 && used.save.state.hourglassesSpent === 1 && used.save.state.packs === 1);
  const after = (await client.query('select last_regen_at from public.pack_state where user_id=$1', [user])).rows[0].last_regen_at;
  check('sabliers : avance exacte de 15 min avec report de la recharge', after.getTime() - before.getTime() === 15 * 60_000);
  const replay = (await asPlayer(user, 'select public.use_hourglass($1) r', [request])).rows[0].r;
  check('sabliers : rejeu sans double débit ni nouvelle recharge', replay.replayed && replay.save.state.hourglasses === 1 && replay.save.state.hourglassesSpent === 1 && replay.save.state.lastPackRegen === used.save.state.lastPackRegen);
  await refuses('sabliers : sauvegarde périmée forcée ne restitue pas la dépense', user, 'select public.push_save($1::jsonb,9,0,true)', [JSON.stringify(seed)], 'charge la sauvegarde');
  await refuses('sabliers : compteur inventé ne passe pas', user, 'select public.push_save($1::jsonb,9,0,true)', [JSON.stringify({ ...used.save.state, hourglassesSpent: 100 })], 'charge la sauvegarde');
  const earned = { ...used.save.state, hourglasses: 3 };
  const synced = (await asPlayer(user, 'select public.push_save($1::jsonb,9,0,false,$2) r', [JSON.stringify(earned), used.save.updated_at])).rows[0].r;
  check('sabliers : gains existants toujours synchronisables sans changement de récompense', synced.status === 'pushed' && synced.save.state.hourglasses === 3);
  const opened = (await asPlayer(user, 'select public.open_pack() r')).rows[0].r;
  check('sabliers : booster rechargé ouvre réellement cinq cartes', opened.cards.length === 5 && opened.packs === 0 && opened.save.state.hourglassesSpent === 1);
  await client.query('update public.pack_state set packs=4,last_regen_at=clock_timestamp() where user_id=$1', [user]);
  const bonus = (await asPlayer(user, 'select public.use_hourglass($1) r', [nextRequest])).rows[0].r;
  check('sabliers : réserve pleine accepte un booster bonus à 5/4', bonus.save.state.packs === 5 && bonus.save.state.hourglasses === 2);
  check('sabliers : le statut conserve 5/4 jusqu’à ouverture', (await asPlayer(user, 'select public.pack_status() r')).rows[0].r.packs === 5);
  await refuses('sabliers : un seul booster bonus avant ouverture', user, 'select public.use_hourglass($1)', ['66666666-6666-4666-8666-666666666666'], 'booster bonus');
  const bonusOpened = (await asPlayer(user, 'select public.open_pack() r')).rows[0].r;
  check('sabliers : ouverture du bonus ramène à 4/4 et ouvre cinq cartes', bonusOpened.packs === 4 && bonusOpened.cards.length === 5);
  await client.query('update public.pack_state set packs=0,last_regen_at=clock_timestamp() where user_id=$1', [user]);
  await client.query("update public.saves set state=jsonb_set(state,'{hourglasses}','1') where user_id=$1", [user]);

  // Deux connexions et vraies transactions concurrentes : deux identifiants
  // distincts ne peuvent pas consommer le même dernier sablier.
  const racers = [new pg.Client(client.connectionParameters), new pg.Client(client.connectionParameters)];
  try {
    await Promise.all(racers.map(async (connection) => {
      await connection.connect();
      await connection.query("select set_config('test.uid',$1,false)", [user]);
      await connection.query('set role authenticated');
    }));
    const raceRequests = ['33333333-3333-4333-8333-333333333333', '55555555-5555-4555-8555-555555555555'];
    const outcomes = await Promise.allSettled(racers.map((connection, index) => connection.query('select public.use_hourglass($1) r', [raceRequests[index]])));
    check('sabliers : deux demandes concurrentes, un seul dernier sablier dépensé', outcomes.filter((r) => r.status === 'fulfilled').length === 1 && outcomes.filter((r) => r.status === 'rejected' && r.reason.message.includes('plus de sablier')).length === 1);
  } finally { await Promise.all(racers.map((connection) => connection.end())); }
  await refuses('sabliers : solde vide refuse sans recharge', user, 'select public.use_hourglass($1)', ['44444444-4444-4444-8444-444444444444'], 'plus de sablier');
  const final = (await client.query('select state from public.saves where user_id=$1', [user])).rows[0].state;
  await client.query(sql);
  await client.query(followupSql);
  check('sabliers : migrations rejouées conservent solde et registre', (await client.query('select count(*)::int n from public.hourglass_spends where user_id=$1', [user])).rows[0].n === 3 && (await client.query('select state from public.saves where user_id=$1', [user])).rows[0].state.hourglasses === 0);
  await asPlayer(user, 'select public.reset_progress()');
  check('sabliers : reset individuel nettoie seulement son registre', (await client.query('select count(*)::int n from public.hourglass_spends where user_id=$1', [user])).rows[0].n === 0);
  const reset = { ...template, playerId: user, hourglasses: 1, hourglassesSpent: 0, packs: 2, cards: [], openings: 0 };
  const pushed = (await asPlayer(user, 'select public.push_save($1::jsonb,9,0,true) r', [JSON.stringify(reset)])).rows[0].r;
  check('sabliers : nouvelle progression synchronisable après reset', pushed.status === 'pushed');
  check('sabliers : la collection obtenue reste intacte après les dépenses', final.cards.length === 10);
  await client.query("select set_config('test.uid','',false)");
}
