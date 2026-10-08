-- 0042_tribunal.sql — Le Tribunal des Bannis paie sa séance.
--
-- Le mode est dans l'application : les dossiers vivent dans
-- `src/data/tribunal.json`, le tirage du jour est calculé par
-- `src/lib/tribunal.ts`, et l'écran ne montre rien d'autre que ce calcul. Il ne
-- manquait qu'une chose au serveur : **la caisse**.
--
-- Depuis `0027_wallet.sql`, les points vivent au serveur. Une récompense
-- versée sur l'appareil serait reprise à la première synchronisation, et le
-- joueur aurait vu un gain qui n'existe pas. Cette migration ferme donc la
-- porte du côté du serveur, avec trois règles :
--
--   * **le client ne propose pas un montant** : il envoie la journée de jeu,
--     les verdicts rendus, et le `login` du créateur qui préside. Le serveur
--     recalcule le karma et les points — un appel qui annoncerait « 40 points »
--     ne passerait pas ;
--   * **le karma est recalculé depuis la vérité** : les verdicts attendus sont
--     dans `public.tribunal_dossiers`. Le client peut envoyer les verdicts
--     qu'il veut, il ne peut pas inventer un dossier ;
--   * **une séance paie une fois par journée de jeu** : c'est l'index unique
--     `wallet_ledger_once (user_id, kind, ref)` qui en décide, avec
--     `kind = 'tribunal'` et `ref = journée` — exactement le mécanisme qui
--     empêche d'encaisser deux fois le même tirage ou le même palier.
--
-- Ce que le serveur **ne peut pas** vérifier : que le joueur a réellement lu
-- les dossiers. Les dossiers sont dans le bundle, donc un joueur décidé peut
-- envoyer les bons verdicts sans ouvrir l'écran. La récompense est calibrée
-- pour ça : 40 points au maximum par jour (80 si le créateur préside en
-- direct), là où une carte au choix en coûte 400. Le mode reste un plaisir de
-- lecture, pas une économie.
--
-- Le multiplicateur Direct n'est pas envoyé par le client : le serveur relit
-- `public.live_streams` lui-même, dans la même fenêtre de dix minutes que le
-- badge Direct et le raid (`_streamer_live_window()`, `0039`).

-- ---------------------------------------------------------------------------
-- La vérité des dossiers (et rien d'autre : le texte reste dans l'application)
-- ---------------------------------------------------------------------------

create table if not exists public.tribunal_dossiers (
  id              text primary key,
  verdict_attendu text not null check (verdict_attendu in ('deban', 'ban'))
);

alter table public.tribunal_dossiers enable row level security;

-- Personne ne lit cette table directement : seule la fonction ci-dessous
-- (security definer) s'en sert. La vérité des dossiers ne se télécharge pas.
revoke all on table public.tribunal_dossiers from public, anon, authenticated;

insert into public.tribunal_dossiers (id, verdict_attendu) values
  ('t-01', 'deban'), ('t-02', 'ban'),   ('t-03', 'ban'),   ('t-04', 'deban'),
  ('t-05', 'ban'),   ('t-06', 'ban'),   ('t-07', 'deban'), ('t-08', 'ban'),
  ('t-09', 'deban'), ('t-10', 'ban'),   ('t-11', 'ban'),   ('t-12', 'ban'),
  ('t-13', 'ban'),   ('t-14', 'ban'),   ('t-15', 'deban'), ('t-16', 'ban'),
  ('t-17', 'ban'),   ('t-18', 'ban'),   ('t-19', 'deban'), ('t-20', 'ban'),
  ('t-21', 'deban'), ('t-22', 'ban'),   ('t-23', 'deban'), ('t-24', 'deban'),
  ('t-25', 'ban'),   ('t-26', 'deban')
on conflict (id) do update set verdict_attendu = excluded.verdict_attendu;

-- ---------------------------------------------------------------------------
-- Les réglages, côté serveur (miroir de `src/data/tribunal.json`)
-- ---------------------------------------------------------------------------

create or replace function public._tribunal_regles()
returns jsonb
language sql
immutable
set search_path = public
as $$ select jsonb_build_object('seuil', 60, 'points', 40, 'direct', 2); $$;

-- ---------------------------------------------------------------------------
-- La récompense de la séance
-- ---------------------------------------------------------------------------

/**
 * Paie une séance du Tribunal.
 *
 * `p_verdicts` est un objet `{ "t-01": "deban", … }` : les verdicts rendus,
 * et rien de plus. Le serveur compte les verdicts **justes**, en pourcent,
 * puis paie — ou pas. `p_login` est le login Twitch du créateur qui préside :
 * le multiplicateur se décide côté serveur, jamais côté client.
 */
create or replace function public.tribunal_recompense(
  p_day      text,
  p_verdicts jsonb default '{}'::jsonb,
  p_login    text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_jour   text := btrim(coalesce(p_day, ''));
  v_total  integer := 0;
  v_justes integer := 0;
  v_karma  integer := 0;
  v_mult   integer := 1;
  v_delta  integer := 0;
  v_avant  integer;
  v_points integer;
  v_regles jsonb := public._tribunal_regles();
  v_login  text := lower(btrim(coalesce(p_login, '')));
begin
  if v_user is null then
    raise exception 'tribunal : connecte-toi pour faire payer ta séance' using errcode = 'P0001';
  end if;
  if v_jour !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'tribunal : journée de jeu illisible (%)', v_jour using errcode = 'P0001';
  end if;
  if coalesce(p_verdicts, '{}'::jsonb) = '{}'::jsonb then
    raise exception 'tribunal : séance vide, rien à payer' using errcode = 'P0001';
  end if;

  -- Le karma, recalculé depuis la vérité : un dossier inconnu ne compte pas,
  -- un verdict illisible non plus. Le client n'a jamais le dernier mot sur le
  -- nombre de points, ni sur la note.
  select count(*), count(*) filter (where d.verdict_attendu = v.rendu)
    into v_total, v_justes
    from jsonb_each_text(coalesce(p_verdicts, '{}'::jsonb)) as v(id, rendu)
    join public.tribunal_dossiers d on d.id = v.id
   where v.rendu in ('deban', 'ban');

  if v_total = 0 then
    raise exception 'tribunal : aucun dossier reconnu dans cette séance' using errcode = 'P0001';
  end if;

  v_karma := round((v_justes::numeric / v_total) * 100)::integer;

  -- Le direct, lu au serveur : le client dit **qui** préside, pas **si** ce
  -- créateur est en direct à cet instant.
  if v_login <> '' then
    select case when count(*) > 0 then (v_regles ->> 'direct')::integer else 1 end
      into v_mult
      from public.live_streams s
     where lower(s.login) = v_login
       and (select ls.refreshed_at from public.live_state ls where ls.id)
           > now() - interval '10 minutes';
  end if;

  if v_karma < (v_regles ->> 'seuil')::integer then
    -- En dessous du seuil : la séance est jugée, elle ne paie pas. Rien
    -- n'est écrit dans le journal, donc le joueur peut rejouer demain — pas
    -- rejouer la même journée en boucle.
    return jsonb_build_object(
      'ok', true, 'paye', false,
      'karma', v_karma, 'seuil', (v_regles ->> 'seuil')::integer,
      'multiplicateur', v_mult,
      'gained', 0,
      'points', public._wallet_ensure(v_user)
    );
  end if;

  v_delta := round(((v_regles ->> 'points')::numeric * v_karma) / 100)::integer * v_mult;

  v_avant := public._wallet_ensure(v_user);
  -- `ref = journée` : l'index unique du journal fait qu'une seconde séance le
  -- même jour ne paie pas, même si le client insiste.
  v_points := public._wallet_apply(v_user, v_delta, 'tribunal', v_jour);
  perform public._wallet_mirror(v_user, v_points);

  return jsonb_build_object(
    'ok', true, 'paye', true,
    'karma', v_karma, 'seuil', (v_regles ->> 'seuil')::integer,
    'multiplicateur', v_mult,
    -- `gained` est ce qui a **réellement** bougé : si la journée était déjà
    -- payée, c'est zéro, et l'écran n'annonce pas un gain qui n'a pas eu lieu.
    'gained', v_points - v_avant,
    'points', v_points
  );
end;
$$;

revoke all on function public.tribunal_recompense(text, jsonb, text) from public, anon;
grant execute on function public.tribunal_recompense(text, jsonb, text) to authenticated;

comment on function public.tribunal_recompense(text, jsonb, text) is
  'Paie une séance du Tribunal des Bannis : karma recalculé côté serveur, une fois par journée de jeu.';
