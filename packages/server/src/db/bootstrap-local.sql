-- Bootstrap DDL for AUTH_PROVIDER=local deployments only.
--
-- Neon provisions the `authenticated` Postgres role and the
-- `auth_is_org_member()` function automatically when Neon Auth is enabled on a
-- project, and its `pg_session_jwt` extension maps `request.jwt.claims` to that
-- role at the connection level. A plain Postgres/pgvector container has none of
-- that, so this script recreates the pieces the app's RLS policies
-- (drizzle-orm/neon/rls's crudPolicy, see db/schema.ts) depend on: the role
-- itself (db/index.ts issues `SET LOCAL ROLE authenticated` after setting the
-- claim, in local mode only) and an `auth_is_org_member` with the same name and
-- signature Neon's version has, backed by own-auth's own membership table
-- instead of `neon_auth.member`.
--
-- Neon's neon_auth.* tables live in a separate `neon_auth` schema, so its
-- equivalent role provisioning never touches them. own-auth has no per-schema
-- config and puts its own_auth_* tables (sessions, password hashes, API keys)
-- in this same `public` schema, so grants here are listed per-table rather
-- than schema-wide - "GRANT ... ON ALL TABLES IN SCHEMA public" would also
-- hand the authenticated role table-level access to those. Add a table name
-- to the relevant array below whenever one is added to db/schema.ts.
--
-- Idempotent, and safe to run before the tables below exist (each GRANT is
-- skipped via a to_regclass() check rather than erroring) - scripts/
-- migrate-local.ts runs this file after Drizzle migrations create those
-- tables, but the role/extension/function need to exist even earlier, before
-- Drizzle's own migration runs (its RLS policies reference both by name), so
-- it also applies those three ahead of Drizzle - see that file for the why.

CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO authenticated;

DO $$
DECLARE
  read_only_tables text[] := ARRAY['cards', 'games'];
  read_write_tables text[] := ARRAY[
    'bin_sets', 'bins', 'bin_routes', 'module_configs', 'feeder_configs',
    'collections', 'collection_cards', 'org_settings',
    'bin_set_audit', 'bin_route_audit', 'module_config_audit', 'feeder_config_audit'
  ];
  tbl text;
BEGIN
  -- Global read-only tables (crudPolicy read: true, modify: false) - written
  -- only by the admin sync job, which uses `db` directly and so bypasses RLS.
  FOREACH tbl IN ARRAY read_only_tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT ON %I TO authenticated', tbl);
    END IF;
  END LOOP;

  -- Org-scoped tables (crudPolicy read/modify: orgRls(...)) - RLS policies
  -- still gate which rows are visible/writable per org; these grants only
  -- govern which commands authenticated may attempt at all. Each table's
  -- serial primary key needs its backing sequence granted separately -
  -- unlike GENERATED ALWAYS AS IDENTITY, a plain serial()'s sequence is a
  -- distinct object that INSERT privilege on the table doesn't cover.
  FOREACH tbl IN ARRAY read_write_tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', tbl);
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %I TO authenticated', tbl || '_id_seq');
    END IF;
  END LOOP;
END
$$;

-- platform_user_roles and impersonation_audit are intentionally not granted
-- here - the app only ever touches them via `db` directly (see auth/local.ts,
-- routes/impersonation.ts), never through an authQuery()/authenticated
-- session, so authenticated has no need to read or write them.

-- SECURITY DEFINER: evaluated with the privileges of the function's owner
-- (the migration role), not the calling `authenticated` role - authenticated
-- is never granted direct table access to own_auth_organisation_members (it
-- holds no secrets, but the rest of own-auth's tables do, and this keeps the
-- exception narrow and function-mediated rather than a table grant that
-- would need to be remembered/kept in sync). SET search_path pins name
-- resolution to `public`, the standard hardening against search_path
-- hijacking on SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION auth_is_org_member(org_id text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM own_auth_organisation_members m
    WHERE m.organisation_id = org_id
      AND m.user_id = (current_setting('request.jwt.claims', true)::json ->> 'sub')
      AND m.status = 'active'
  );
$$;
