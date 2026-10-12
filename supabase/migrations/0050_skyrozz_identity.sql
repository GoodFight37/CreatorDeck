-- creatordeck-deploy: automatic
-- Skyrozz : le login Twitch est skyrroztv ; le slug historique reste skyroz.
update public.creators
set login = 'skyrroztv',
    display_name = 'Skyrozz'
where slug = 'skyroz';
