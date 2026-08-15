-- Run in Supabase Dashboard → SQL Editor (or via psql against the project DB).
--
-- Enables RLS on all public tables except Prisma's migration history.
-- Deliberately creates NO policies: anon/authenticated PostgREST access is denied.
-- Your Next.js app uses Prisma + DATABASE_URL (postgres role) and keeps working.
--
-- Safe to re-run: ENABLE ROW LEVEL SECURITY is idempotent on already-protected tables.

DO $$
DECLARE
  tbl RECORD;
BEGIN
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    RAISE NOTICE 'RLS enabled on public.%', tbl.tablename;
  END LOOP;
END $$;

-- Optional verification (should list every public app table with rowsecurity = true):
-- SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE n.nspname = 'public'
--   AND c.relkind = 'r'
--   AND c.relname <> '_prisma_migrations'
-- ORDER BY c.relname;
