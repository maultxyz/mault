/**
 * Re-vectorizes every card already in the database - unlike the normal sync
 * job (lib/sync-job/worker.ts), this never calls a source's fetchCards() to
 * walk its entire remote catalog looking for new/removed cards. It only
 * visits rows that already exist in `cards`, doing one fetchOne() lookup per
 * row for a fresh image URL, then re-vectorizing and overwriting that row -
 * via the same syncOneCard() the "Sync Card By ID" admin panel uses for a
 * single card, just looped over what's already in the DB instead of one ID
 * typed in by hand.
 *
 * Use this after a change to how cards are vectorized (model precision, crop
 * regions, etc.) that needs every existing row recomputed, without paying
 * for a full re-crawl of every game's source catalog.
 *
 * Safe to Ctrl+C: stops handing out new cards to in-flight workers and lets
 * whatever's already in-flight finish, then prints a summary and exits.
 * Re-running afterward just redoes the remaining/all rows - overwriting an
 * already-resynced row is harmless, not corrupting.
 *
 * Usage (from packages/server):
 *   tsx --env-file ../../.env scripts/resync-all.ts
 */
import { db } from "../src/db";
import { cardImageVectors } from "../src/db/schema";
import { SYNC_SOURCES } from "../src/lib/sync-job";
import { syncOneCard } from "../src/routes/admin/shared";

const CONCURRENCY = parseInt(
  process.env.RESYNC_CONCURRENCY ?? process.env.VECTORIZE_CONCURRENCY ?? "5",
);
const IMAGE_FETCH_DELAY_MS = parseInt(
  process.env.SYNC_IMAGE_FETCH_DELAY_MS ?? "200",
);
const PROGRESS_EVERY = 25;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let fetchGate: Promise<void> = Promise.resolve();
function throttleFetch(): Promise<void> {
  if (IMAGE_FETCH_DELAY_MS <= 0) return Promise.resolve();
  const previous = fetchGate;
  const thisTurn = previous.then(
    () => new Promise<void>((resolve) => setTimeout(resolve, IMAGE_FETCH_DELAY_MS)),
  );
  fetchGate = thisTurn;
  return thisTurn;
}

interface ExistingCard {
  cardId: string;
  gameKey: string;
  lang: string;
}

let interrupted = false;
process.on("SIGINT", () => {
  if (interrupted) process.exit(1); // second Ctrl+C: bail immediately
  interrupted = true;
  console.log(
    "\n[resync-all] Interrupted - letting in-flight cards finish, then stopping...",
  );
});

async function main() {
  console.log("[resync-all] Loading existing cards from DB...");
  const existing: ExistingCard[] = await db
    .select({
      cardId: cardImageVectors.cardId,
      gameKey: cardImageVectors.gameKey,
      lang: cardImageVectors.lang,
    })
    .from(cardImageVectors);

  const missingSource = new Set(
    existing.map((c) => c.gameKey).filter((k) => !SYNC_SOURCES[k]),
  );
  if (missingSource.size > 0) {
    console.log(
      `[resync-all] Skipping ${missingSource.size} game key(s) with no sync source: ${[...missingSource].join(", ")}`,
    );
  }
  const jobs = existing.filter((c) => SYNC_SOURCES[c.gameKey]);

  console.log(
    `[resync-all] ${jobs.length} existing card(s) to re-vectorize (${CONCURRENCY} in parallel).`,
  );

  let processed = 0;
  let errors = 0;
  const errorsByGame: Record<string, number> = {};
  const totalByGame: Record<string, number> = {};
  for (const job of jobs) {
    totalByGame[job.gameKey] = (totalByGame[job.gameKey] ?? 0) + 1;
  }

  let nextIndex = 0;
  async function worker(): Promise<void> {
    for (;;) {
      if (interrupted) return;
      const index = nextIndex++;
      if (index >= jobs.length) return;
      const job = jobs[index];

      await throttleFetch();
      const result = await syncOneCard(job.gameKey, job.cardId, job.lang);
      if (result.success) {
        processed++;
      } else {
        errors++;
        errorsByGame[job.gameKey] = (errorsByGame[job.gameKey] ?? 0) + 1;
        console.log(
          `[resync-all] Error: ${job.gameKey}/${job.lang}/${job.cardId}: ${result.message}`,
        );
      }

      const done = processed + errors;
      if (done % PROGRESS_EVERY === 0 || done === jobs.length) {
        console.log(
          `[resync-all] ${done}/${jobs.length} (processed=${processed}, errors=${errors})`,
        );
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker),
  );

  console.log("\n[resync-all] Summary:");
  for (const gameKey of Object.keys(totalByGame).sort()) {
    const total = totalByGame[gameKey];
    const gameErrors = errorsByGame[gameKey] ?? 0;
    console.log(
      `  ${gameKey}: ${total - gameErrors}/${total} resynced, ${gameErrors} error(s)`,
    );
  }
  console.log(
    `[resync-all] Total: processed=${processed}, errors=${errors}${interrupted ? " (stopped early)" : ""}`,
  );

  process.exit(interrupted ? 1 : 0);
}

main().catch((err) => {
  console.error("[resync-all] Fatal error:", err);
  process.exit(1);
});
