/**
 * One-off backfill: creates a device for every org that doesn't have one
 * yet. New orgs get a device automatically at creation time (see
 * routes/local-auth/organizations-add.ts, routes/local-auth/bootstrap.ts,
 * and lib/auth/index.ts's ensureDeviceForOrg on the web side for Neon mode)
 * - this script is only for orgs that existed before that was wired up, or
 * a Neon-mode org whose eager client-side call happened to fail.
 *
 * Reads the org list from whichever auth provider is configured
 * (AUTH_PROVIDER=neon -> neon_auth.organization, local -> own_auth_organisations).
 * Idempotent and safe to re-run: getOrCreateDevice no-ops for orgs that
 * already have a device.
 *
 * Usage (from packages/server):
 *   tsx --env-file ../../.env scripts/backfill-missing-devices.ts            # dry run, prints a report
 *   tsx --env-file ../../.env scripts/backfill-missing-devices.ts --apply    # writes the changes
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { getOrCreateDevice } from "../src/lib/devices";

async function listOrgIds(): Promise<{ id: string; name: string }[]> {
  const provider = process.env.AUTH_PROVIDER ?? "neon";
  const table =
    provider === "local" ? "own_auth_organisations" : "neon_auth.organization";
  const result = await db.execute<{ id: string; name: string }>(
    sql.raw(`SELECT id, name FROM ${table} ORDER BY name`),
  );
  return result.rows;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const orgs = await listOrgIds();
  console.log(`Found ${orgs.length} org(s) total.\n`);

  const existingDevices = await db.query.devices.findMany({
    columns: { orgId: true },
  });
  const haveDevice = new Set(existingDevices.map((r) => r.orgId));
  const missing = orgs.filter((o) => !haveDevice.has(o.id));

  console.log(`${missing.length} org(s) missing a device:`);
  for (const org of missing) {
    console.log(`  - ${org.name} (${org.id})`);
  }

  if (!apply) {
    console.log("\nDry run - re-run with --apply to create these devices.");
    process.exit(0);
  }

  let created = 0;
  for (const org of missing) {
    await db.transaction((tx) => getOrCreateDevice(tx, org.id));
    created++;
  }
  console.log(`\nCreated ${created} device(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
