-- 0029_wallet_surcharge.sql — la vieille surcharge de `_wallet_apply`
--
-- Ce que ça répare
-- ----------------
-- La **première** version de `0027_wallet.sql` créait `public._wallet_apply`
-- avec **cinq** paramètres, dont `p_once boolean default false`. La version
-- corrigée — celle du dépôt, où `p_once` a disparu parce que c'est l'index
-- unique du journal qui décide — n'en a plus que quatre.
--
-- `create or replace` ne remplace une fonction que si sa **signature est
-- identique** : la nouvelle version a donc créé une **deuxième** fonction à
-- côté de l'ancienne. La cinquième ayant une valeur par défaut, un appel à
-- quatre arguments — celui de `wallet_credit`, de `wallet_spend`, du trigger de
-- vente — correspond aux **deux**, et Postgres refuse de choisir :
--
--   ERROR: function public._wallet_apply(uuid, integer, text, text) is not unique
--
-- Vue en vrai le 7 octobre : le tirage créditait les points par ce chemin,
-- l'appel échouait, et **le booster ne s'ouvrait plus** (« Je peux pas ouvrir de
-- booster »).
--
-- Ce que fait cette migration : elle retire toutes les surcharges de
-- `_wallet_apply` dont la signature n'est pas exactement
-- `(uuid, integer, text, text)`. Aucune fonction ne peut dépendre d'une autre
-- par son corps (un appel dans du `plpgsql` est résolu à l'exécution), donc le
-- retrait est sans effet de bord — et les autres migrations sont intactes.
--
-- Rejouable : sur une base neuve, il n'y a rien à retirer et elle ne dit rien.
-- Coller `0028` puis `0029` suffit, dans cet ordre.

do $$
declare
  v_canonique integer;
  v_retirees  text[] := '{}';
  v_signature text;
begin
  -- La fonction canonique doit être là. Si elle manque, `0027` n'a pas été
  -- collée : on ne retire **rien** (une base sans aucune `_wallet_apply` serait
  -- encore plus cassée) et on le dit franchement.
  select count(*) into v_canonique
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = '_wallet_apply'
     and oidvectortypes(p.proargtypes) = 'uuid, integer, text, text';

  if v_canonique = 0 then
    raise exception
      'la fonction public._wallet_apply(uuid, integer, text, text) est absente : colle d''abord 0027_wallet.sql'
      using errcode = 'P0001';
  end if;

  for v_signature in
    select oidvectortypes(p.proargtypes)
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = '_wallet_apply'
       and oidvectortypes(p.proargtypes) <> 'uuid, integer, text, text'
  loop
    execute format('drop function public._wallet_apply(%s)', v_signature);
    v_retirees := v_retirees || v_signature;
  end loop;

  if cardinality(v_retirees) = 0 then
    raise notice 'surcharge : rien à retirer, `_wallet_apply` n''a qu''une signature';
  else
    raise notice 'surcharge : retirée(s) → _wallet_apply(%)', array_to_string(v_retirees, ') et _wallet_apply(');
  end if;
end;
$$;
