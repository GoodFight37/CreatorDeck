-- 0025_direct_auto.sql — la veille du direct tourne toute seule
--
-- Jusqu'ici, c'est l'application qui demandait à `refresh-live` d'interroger
-- Twitch : le direct n'était vu que **quand quelqu'un avait le jeu ouvert**. Un
-- créateur qui passe en direct pendant que personne ne joue n'existait pour
-- personne — pas de badge frais, et surtout pas de notification. Le test du
-- brief (« est-ce que quelqu'un ouvre l'app parce qu'un type vient de lancer son
-- live ? ») ne pouvait donc passer qu'à moitié.
--
-- Cette migration branche l'horloge de la base sur la fonction serveur :
--
--   `pg_cron` (toutes les deux minutes) → `pg_net` (requête HTTP) →
--   `refresh-live` (Twitch → `live_publish()` → `notify-live`)
--
-- **Aucune clé de service n'entre dans la base.** La fonction accepte n'importe
-- quel porteur non vide, et la clé publique du projet — celle qui est déjà dans
-- l'APK, et publique par conception — suffit. Le mot de passe de service, lui,
-- reste là où il est : dans les secrets des Edge Functions.
--
-- Rejouable : `create or replace`, `if not exists`, et la planification
-- supprime le travail du même nom avant de le recréer.

-- ---------------------------------------------------------------------------
-- Les deux extensions, sans jamais faire échouer la migration
-- ---------------------------------------------------------------------------
-- Sur un Postgres ordinaire (le vérifieur, une préproduction), ni `pg_cron` ni
-- `pg_net` ne sont installés : la migration doit passer quand même, sinon elle
-- rendrait impossible la relecture des 25 migrations ailleurs. Ici, on prévient
-- et on continue ; le reste du fichier ne planifie simplement rien.

do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron non installé (%), la veille automatique du direct est ignorée', sqlerrm;
end
$$;

do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net non installé (%), aucune requête ne pourra partir d''ici', sqlerrm;
end
$$;

-- ---------------------------------------------------------------------------
-- La porte : une fonction qui demande le rafraîchissement
-- ---------------------------------------------------------------------------
-- Elle ne fait que **demander** : tout le travail (Twitch, publication,
-- notifications) reste dans `refresh-live`, à un seul endroit. La base n'a donc
-- qu'un rôle d'horloge, et si la fonction change demain, rien à modifier ici.
--
-- `security definer` : la fonction écrit dans le schéma `net` de `pg_net`, dont
-- le rôle de l'horloge pourrait ne pas avoir l'usage. Et elle est **fermée aux
-- joueurs** : sans cela, n'importe qui connecté pourrait faire taper Twitch à
-- volonté — le genre de porte qui ne se voit pas jusqu'au jour du quota.
create or replace function public.cron_refresh_live()
returns bigint
language plpgsql
security definer
set search_path = public, net
as $$
declare
  v_request bigint;
begin
  select net.http_post(
    -- L'adresse du projet et sa clé **publique** (`sb_publishable_…`) : la
    -- même paire que celle embarquée dans l'APK, visible de tous, sans pouvoir.
    -- Le jour où la clé change, c'est cette ligne qu'il faut suivre (et la
    -- migration se recolle sans risque : elle est rejouable).
    url := 'https://yzxchpybqrfegvecihxf.supabase.co/functions/v1/refresh-live',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_cbbKecrvKbPcifWUsolQ4w_bmmslot1'
    ),
    body := '{}'::jsonb,
    -- Cinq secondes : une fonction Edge à froid met une à deux secondes à
    -- répondre. Au-delà, `pg_net` abandonne et l'essai suivant arrive dans deux
    -- minutes — sans conséquence, le rafraîchissement est idempotent.
    timeout_milliseconds := 5000
  ) into v_request;

  return v_request;
end;
$$;

-- Personne dans le jeu ne déclenche cette porte : ni un visiteur, ni un compte.
revoke all on function public.cron_refresh_live() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- L'horloge : toutes les deux minutes
-- ---------------------------------------------------------------------------
-- Pourquoi deux minutes et pas trente secondes : `refresh-live` se limite
-- lui-même à une requête Twitch toutes les 90 secondes (verrou d'écriture
-- conditionnelle sur `live_state.refreshed_at`), donc appeler plus vite ne
-- rafraîchirait rien de plus. Et deux minutes, c'est déjà bien plus frais que
-- l'app, qui attend trois minutes pour redemander.
--
-- Le nom du travail sert d'identifiant : le supprimer avant de le reposer rend
-- la migration rejouable sans empiler deux horloges identiques (avec l'ancienne
-- qui pointerait vers du vide — le genre de doublon qu'on ne découvre qu'en
-- cherchant pourquoi Twitch est appelé deux fois).
do $$
declare
  tache record;
begin
  if to_regnamespace('cron') is null then
    raise notice 'pg_cron absent : la veille automatique du direct ne sera pas planifiée';
    return;
  end if;

  for tache in select jobid from cron.job where jobname = 'creatordeck-refresh-live'
  loop
    perform cron.unschedule(tache.jobid);
  end loop;

  perform cron.schedule(
    'creatordeck-refresh-live',
    '*/2 * * * *',
    'select public.cron_refresh_live()'
  );

  raise notice 'veille du direct planifiée : toutes les deux minutes';
end
$$;
