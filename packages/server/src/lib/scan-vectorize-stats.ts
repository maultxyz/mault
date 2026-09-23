import { sql } from "drizzle-orm";
import { db } from "../db";
import { scanVectorizeStats } from "../db/schema";

export type ScanVectorizeSource = "server" | "web";

export async function recordScanVectorizeSource(
  source: ScanVectorizeSource,
): Promise<void> {
  await db
    .insert(scanVectorizeStats)
    .values({ source, count: 1 })
    .onConflictDoUpdate({
      target: scanVectorizeStats.source,
      set: {
        count: sql`${scanVectorizeStats.count} + 1`,
        updatedAt: new Date(),
      },
    });
}

export async function getScanVectorizeStats(): Promise<
  Record<ScanVectorizeSource, number>
> {
  const rows = await db.select().from(scanVectorizeStats);
  const stats: Record<ScanVectorizeSource, number> = { server: 0, web: 0 };
  for (const row of rows) {
    if (row.source === "server" || row.source === "web") {
      stats[row.source] = row.count;
    }
  }
  return stats;
}
