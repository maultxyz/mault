import "../src/lib/console-timestamps";
import { pool } from "../src/db";
import {
  getStatus,
  isSyncWorkerRunning,
  startSync,
  subscribeSSE,
  SYNC_SOURCES,
} from "../src/lib/sync-job";

const STATUS_POLL_MS = 2000;

const log = (msg: string) => console.log(`[sync-card-catalogs] ${msg}`);

function listArgument(name: string): string[] | undefined {
  const values = process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(`--${name}=`.length)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values && values.length > 0 ? values : undefined;
}

const forceResync = process.argv.includes("--force");
const requestedGameKeys = listArgument("games");
const requestedLanguages = listArgument("languages");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSyncWorkerToStop(): Promise<void> {
  while (isSyncWorkerRunning()) await sleep(STATUS_POLL_MS);
}

async function main(): Promise<number> {
  const unknownGameKeys = (requestedGameKeys ?? []).filter(
    (gameKey) => !SYNC_SOURCES[gameKey],
  );
  if (unknownGameKeys.length > 0) {
    log(`Unknown game keys: ${unknownGameKeys.join(", ")}`);
    return 1;
  }

  const catalogs = Object.values(SYNC_SOURCES)
    .filter(
      (source) =>
        !requestedGameKeys || requestedGameKeys.includes(source.gameKey),
    )
    .flatMap((source) =>
      source.languages
        .filter((lang) => !requestedLanguages || requestedLanguages.includes(lang))
        .map((lang) => ({ gameKey: source.gameKey, lang })),
    );
  if (catalogs.length === 0) {
    log("No catalog matches the requested games and languages.");
    return 1;
  }

  subscribeSSE((event, data) => {
    if (event === "log") log(`  ${(data as { line: string }).line}`);
  });

  const completed: string[] = [];
  const failed: string[] = [];
  for (const { gameKey, lang } of catalogs) {
    const label = `${gameKey} (${lang})`;
    log(`Starting ${forceResync ? "force resync" : "sync"} of ${label}`);
    startSync(undefined, gameKey, lang, forceResync);
    await waitForSyncWorkerToStop();
    const status = getStatus();
    log(
      `${label}: ${status.status}, ${status.processed}/${status.total} processed, ${status.skipped} skipped, ${status.errors} errors`,
    );
    (status.status === "completed" ? completed : failed).push(label);
  }

  log(`Completed: ${completed.join(", ") || "none"}`);
  log(`Failed: ${failed.join(", ") || "none"}`);
  return failed.length > 0 ? 1 : 0;
}

main()
  .catch((err) => {
    console.error("[sync-card-catalogs] Fatal error:", err);
    return 1;
  })
  .then(async (exitCode) => {
    await pool.end().catch(() => undefined);
    process.exit(exitCode);
  });
