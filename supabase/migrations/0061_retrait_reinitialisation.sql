-- creatordeck-deploy: automatic
-- Malik, 22 octobre 2026 : retirer définitivement le reset de progression.
-- Aucun effacement de données ; les migrations historiques restent intactes.
drop function if exists public.reset_progress();
