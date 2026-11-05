-- Afscherming van de tabellen (defense in depth).
--
-- De app praat rechtstreeks met PostgreSQL als eigenaar van de tabellen en heeft
-- geen Data API (PostgREST) nodig. Op Supabase zijn tabellen in het schema `public`
-- standaard bereikbaar voor de rollen `anon` en `authenticated` via de Data API.
-- Deze migratie zet Row Level Security aan op alle tabellen (zonder policies = geen
-- toegang voor andere rollen; de eigenaar wordt niet geraakt) en trekt de rechten
-- van die rollen in, ook voor toekomstige tabellen. Op gewone PostgreSQL/PGlite,
-- waar die rollen niet bestaan, doet het tweede deel niets.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated';
    EXECUTE 'ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated';
  END IF;
END $$;
