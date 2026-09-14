/**
 * One-off backfill for the org -> device calibration migration.
 *
 * Must run strictly BETWEEN two migrations:
 *   1. drizzle/0028_puzzling_killmonger.sql — adds `devices` and nullable
 *      `device_id` columns to module_configs/bin_routes/feeder_configs (+
 *      their audit tables). Purely additive, safe to apply anywhere.
 *   2. *** this script ***
 *   3. drizzle/0029_lean_wolfsbane.sql — makes device_id NOT NULL, swaps the
 *      old org-scoped unique indexes for device-scoped ones, and DROPS the
 *      six old calibration columns from org_settings.
 *
 * `pnpm db:migrate` applies every pending migration in one pass. On an
 * environment that hasn't been migrated yet, do NOT just run it top to
 * bottom — 0029 will drop the six old org_settings columns before this
 * script ever gets a chance to copy their data onto `devices`, and
 * SET NOT NULL on device_id will fail outright for any org with existing
 * calibration rows. Instead:
 *
 *   1. Temporarily move 0029_lean_wolfsbane.sql (and its matching entry in
 *      drizzle/meta/_journal.json) out of the way.
 *   2. pnpm --filter @magic-vault/server db:migrate        # applies 0028 only
 *   3. pnpm --filter @magic-vault/server backfill:devices --apply
 *   4. Restore 0029_lean_wolfsbane.sql / the journal entry.
 *   5. pnpm --filter @magic-vault/server db:migrate        # applies 0029
 *
 * Written entirely in raw SQL, not the Drizzle schema — this script bridges
 * two different shapes of org_settings/module_configs/bin_routes/
 * feeder_configs (the "old" org-scoped shape and the "new" device-scoped
 * one), and the current TypeScript schema only ever describes one of those
 * at a time (whichever migration has most recently run).
 *
 * Idempotent and safe to re-run: skips orgs that already have a device, and
 * only backfills device_id on rows where it's still NULL. Also safe to run
 * at the wrong time — it checks its own preconditions first and refuses to
 * touch data if they don't hold.
 *
 * Usage (from packages/server):
 *   tsx --env-file ../../.env scripts/backfill-devices.ts            # dry run, prints a report
 *   tsx --env-file ../../.env scripts/backfill-devices.ts --apply    # writes the changes
 */
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await db.execute<{ exists: boolean }>(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = ${table} AND column_name = ${column}
    ) AS exists
  `);
  return !!result.rows[0]?.exists;
}

async function main() {
  const apply = process.argv.includes("--apply");

  const hasDeviceIdColumn = await columnExists("module_configs", "device_id");
  const hasOldColumns = await columnExists("org_settings", "module_count");

  if (!hasDeviceIdColumn) {
    console.error(
      "module_configs.device_id doesn't exist yet - apply migration 0028 " +
        "first (pnpm --filter @magic-vault/server db:migrate), then re-run this script.",
    );
    process.exit(1);
  }
  if (!hasOldColumns) {
    console.log(
      "org_settings no longer has the old calibration columns - migration " +
        "0029 has already run (or this database never had the old shape). " +
        "Nothing to backfill.",
    );
    process.exit(0);
  }

  const orgIdsResult = await db.execute<{ org_id: string }>(sql`
    SELECT org_id FROM org_settings
    UNION SELECT org_id FROM module_configs
    UNION SELECT org_id FROM bin_routes
    UNION SELECT org_id FROM feeder_configs
  `);
  const orgIds = orgIdsResult.rows.map((r) => r.org_id);

  console.log(`Found ${orgIds.length} org(s) with calibration data.\n`);

  let devicesCreated = 0;
  let devicesSkipped = 0;
  const rowsBackfilled = {
    moduleConfigs: 0,
    binRoutes: 0,
    feederConfigs: 0,
    moduleConfigAudit: 0,
    binRouteAudit: 0,
    feederConfigAudit: 0,
  };

  for (const orgId of orgIds) {
    const existing = await db.execute<{ id: number }>(sql`
      SELECT id FROM devices WHERE org_id = ${orgId} LIMIT 1
    `);
    let deviceId: number | undefined = existing.rows[0]?.id;

    if (deviceId) {
      devicesSkipped++;
    } else {
      const settings = await db.execute<{
        scan_coverage: number | null;
        scan_offset_x: number | null;
        scan_offset_y: number | null;
        capture_settle_delay_ms: number | null;
        module_count: number | null;
        channel_layout: string | null;
      }>(sql`
        SELECT scan_coverage, scan_offset_x, scan_offset_y,
               capture_settle_delay_ms, module_count, channel_layout
        FROM org_settings WHERE org_id = ${orgId} LIMIT 1
      `);
      const s = settings.rows[0];
      devicesCreated++;
      if (apply) {
        const inserted = await db.execute<{ id: number }>(sql`
          INSERT INTO devices (
            org_id, scan_coverage, scan_offset_x, scan_offset_y,
            capture_settle_delay_ms, module_count, channel_layout
          )
          VALUES (
            ${orgId}, ${s?.scan_coverage ?? null}, ${s?.scan_offset_x ?? null},
            ${s?.scan_offset_y ?? null}, ${s?.capture_settle_delay_ms ?? null},
            ${s?.module_count ?? 3}, ${s?.channel_layout ?? null}
          )
          RETURNING id
        `);
        deviceId = inserted.rows[0]?.id;
      }
    }

    if (!apply || !deviceId) continue;

    const moduleResult = await db.execute(sql`
      UPDATE module_configs SET device_id = ${deviceId}
      WHERE org_id = ${orgId} AND device_id IS NULL
    `);
    const routeResult = await db.execute(sql`
      UPDATE bin_routes SET device_id = ${deviceId}
      WHERE org_id = ${orgId} AND device_id IS NULL
    `);
    const feederResult = await db.execute(sql`
      UPDATE feeder_configs SET device_id = ${deviceId}
      WHERE org_id = ${orgId} AND device_id IS NULL
    `);
    const moduleAuditResult = await db.execute(sql`
      UPDATE module_config_audit SET device_id = ${deviceId}
      WHERE org_id = ${orgId} AND device_id IS NULL
    `);
    const routeAuditResult = await db.execute(sql`
      UPDATE bin_route_audit SET device_id = ${deviceId}
      WHERE org_id = ${orgId} AND device_id IS NULL
    `);
    const feederAuditResult = await db.execute(sql`
      UPDATE feeder_config_audit SET device_id = ${deviceId}
      WHERE org_id = ${orgId} AND device_id IS NULL
    `);

    rowsBackfilled.moduleConfigs += moduleResult.rowCount ?? 0;
    rowsBackfilled.binRoutes += routeResult.rowCount ?? 0;
    rowsBackfilled.feederConfigs += feederResult.rowCount ?? 0;
    rowsBackfilled.moduleConfigAudit += moduleAuditResult.rowCount ?? 0;
    rowsBackfilled.binRouteAudit += routeAuditResult.rowCount ?? 0;
    rowsBackfilled.feederConfigAudit += feederAuditResult.rowCount ?? 0;
  }

  console.log(
    `${apply ? "Applied" : "Dry run"}: ${devicesCreated} device(s) to create, ${devicesSkipped} org(s) already had one.`,
  );
  if (apply) {
    for (const [name, count] of Object.entries(rowsBackfilled)) {
      console.log(`  ${name}: ${count} row(s) backfilled`);
    }
  } else {
    console.log("Re-run with --apply to write these changes.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
