// AUTH_PROVIDER=local only - run before starting the server (see the
// "server" service's command in docker-compose.yml). Applies, in order:
// 0. pgvector extension + `authenticated` role - independent of everything
//    else, but Drizzle's own migrations need both already (vector(768)
//    columns, RLS policies written "TO authenticated")
// 1. own-auth's own migrations - its own_auth_* tables. Independent of
//    everything else, but must run before step 2: unlike a plpgsql function,
//    Postgres fully parses a `LANGUAGE sql` function body at CREATE time, so
//    auth_is_org_member() (below) needs own_auth_organisation_members to
//    already exist, not just by the time it's actually invoked
// 2. auth_is_org_member() - needed by Drizzle's RLS policies (CREATE POLICY
//    validates the function reference eagerly too, unlike a plain SELECT)
// 3. Drizzle migrations (drizzle/*.sql) - the app's own tables + RLS policies
// 4. bootstrap-local.sql (re-running steps 0 and 2, harmlessly) - plus the
//    GRANTs, which do need step 3's tables to exist (guarded with
//    to_regclass() checks so the whole file stays safe to run standalone at
//    any point too)
// Every step is idempotent.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

async function main() {
  const root = join(__dirname, "..");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL !== "false",
  });

  console.log("[migrate-local] Ensuring pgvector extension and role...");
  await pool.query("CREATE EXTENSION IF NOT EXISTS vector");
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
    END
    $$;
  `);

  console.log("[migrate-local] Applying own-auth migrations...");
  execSync("npx own-auth migrate", { stdio: "inherit", cwd: root });

  console.log("[migrate-local] Creating auth_is_org_member()...");
  await pool.query(`
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
  `);

  console.log("[migrate-local] Applying Drizzle migrations...");
  execSync("npx drizzle-kit migrate", { stdio: "inherit", cwd: root });

  console.log("[migrate-local] Applying bootstrap-local.sql...");
  const sql = readFileSync(join(root, "src/db/bootstrap-local.sql"), "utf-8");
  await pool.query(sql);
  await pool.end();

  console.log("[migrate-local] Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
