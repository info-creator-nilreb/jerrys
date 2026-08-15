-- Defense-in-depth: block Supabase PostgREST access (anon/authenticated) to app tables.
-- No RLS policies are added — roles subject to RLS see zero rows without a policy.
-- Prisma connects as postgres (BYPASSRLS) via DATABASE_URL; application behavior unchanged.

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
  END LOOP;
END $$;
