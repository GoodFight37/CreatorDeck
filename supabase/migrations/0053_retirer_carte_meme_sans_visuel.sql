-- creatordeck-deploy: automatic
-- D-131 : retire la fiche source sans illustration, après contrôle des références.
do $migration$
begin
  if not exists (
    select 1 from public.meme_catalog
    where id = 'juventus-rose' and title = 'Carte supprimée' and not pullable
  ) then
    raise exception 'D-131: fiche Mèmes attendue absente ou inattendue; aucune suppression effectuée';
  end if;

  if exists (select 1 from public.meme_collection where card_id = 'juventus-rose') then
    raise exception 'D-131: la fiche juventus-rose est détenue; suppression refusée';
  end if;

  if exists (
    select 1 from public.meme_openings where cards @> array['juventus-rose']::text[]
  ) then
    raise exception 'D-131: un tirage historique référence juventus-rose; suppression refusée';
  end if;

  delete from public.meme_catalog
  where id = 'juventus-rose' and title = 'Carte supprimée' and not pullable;

  if not found then
    raise exception 'D-131: suppression de juventus-rose non effectuée';
  end if;
end;
$migration$;
