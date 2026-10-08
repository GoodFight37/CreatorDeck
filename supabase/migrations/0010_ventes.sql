-- CreatorDeck — le carnet de notifications : les ventes.
--
-- Dixième migration, à exécuter **après** `0009_marche.sql`.
--
-- ## Pourquoi une migration si petite
--
-- Le carnet de notifications ne vit pas côté serveur : chaque ligne qu'il
-- affiche existe déjà — une offre d'échange (`0005`), une demande d'ami
-- (`0008`), une annonce vendue (`0009`). L'app les relit et les met en français
-- (`src/lib/social/inbox.ts`). Une table « notifications » n'apporterait qu'un
-- deuxième endroit où la même vérité pourrait diverger.
--
-- Il manquait **une** chose pourtant : voir ses **propres** ventes. Le comptoir
-- (`market_shelf()`) ne montre que ce qui est encore à vendre, et la vitrine
-- d'un joueur (`market_listings_of()`) ne montre que ses annonces ouvertes — ce
-- qui est exactement ce qu'il faut pour la vitrine, et exactement ce qu'il ne
-- faut pas pour dire « ta carte a été vendue ».
--
-- D'où cette fonction unique, courte : `market_sales()`, mes ventes conclues,
-- avec l'acheteur et le prix. Tant qu'elle n'est pas collée, le carnet vit sans
-- les ventes (l'appel échoue proprement, côté application).
--
-- Rejouable : `create or replace`.

create or replace function public.market_sales(p_limit integer default 20)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(jsonb_agg(row order by row -> 'soldAt' desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
             'id', l.id,
             'creatorSlug', l.creator_slug,
             'rarity', l.rarity,
             'variant', l.variant,
             'price', l.price,
             'payout', l.payout,
             'soldAt', l.sold_at,
             -- L'acheteur : c'est lui qui a pris la carte, et c'est son nom qui
             -- rend la nouvelle concrète.
             'buyerName', coalesce(bp.display_name, 'Un joueur')
           ) as row
    from public.market_listings l
    left join public.profiles bp on bp.user_id = l.buyer_id
    where l.seller_id = auth.uid()
      and l.status = 'sold'
    order by l.sold_at desc nulls last
    limit least(greatest(coalesce(p_limit, 20), 1), 100)
  ) t;
$$;

-- Réservée aux joueurs connectés : un visiteur n'a pas de ventes.
revoke all on function public.market_sales(integer) from public, anon;
grant execute on function public.market_sales(integer) to authenticated;
