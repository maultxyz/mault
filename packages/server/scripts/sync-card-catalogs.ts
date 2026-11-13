import "../src/lib/console-timestamps";
import { appendFile, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pool } from "../src/db";
import {
  buildCatalogSyncReport,
  postCatalogSyncReport,
} from "../src/lib/catalog-sync-report";
import { CATALOG_SYNC_REPORT_ERROR_SAMPLE_LIMIT } from "../src/lib/constants/sync";
import type { CatalogSyncResult } from "../src/lib/interfaces/catalog-sync-report";
import {
  cancelSync,
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

function valueArgument(name: string): string | undefined {
  return process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(`--${name}=`.length)
    .trim() || undefined;
}

const forceResync = process.argv.includes("--force");
const listsCatalogsOnly = process.argv.includes("--list-catalogs");
const requestedGameKeys = listArgument("games");
const requestedLanguages = listArgument("languages");
const resultsFilePath = valueArgument("results-file");
const reportFromResultsDirectory = valueArgument("report-from-results");
const stopAfterMinutes = Number(valueArgument("stop-after-minutes") ?? "0");
const stopsAtTimeLimit = Number.isFinite(stopAfterMinutes) && stopAfterMinutes > 0;
const scriptStartedAt = Date.now();
const TIME_LIMIT_MESSAGE =
  "Stopped at the time limit; the next run continues where this one left off.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeLimitReached(): boolean {
  return (
    stopsAtTimeLimit &&
    Date.now() - scriptStartedAt >= stopAfterMinutes * 60_000
  );
}

async function waitForSyncWorkerToStopOrTimeLimit(): Promise<boolean> {
  let stoppedAtTimeLimit = false;
  while (isSyncWorkerRunning()) {
    if (!stoppedAtTimeLimit && timeLimitReached()) {
      log(`Reached the ${stopAfterMinutes} minute limit, stopping the sync.`);
      stoppedAtTimeLimit = true;
      cancelSync();
    }
    await sleep(STATUS_POLL_MS);
  }
  return stoppedAtTimeLimit;
}

async function writeCatalogsOutput(
  catalogs: { gameKey: string; lang: string }[],
): Promise<void> {
  const line = `catalogs=${JSON.stringify(catalogs)}\n`;
  const outputPath = process.env.GITHUB_OUTPUT;
  if (outputPath) await appendFile(outputPath, line);
  else process.stdout.write(line);
}

async function readResultsDirectory(
  directory: string,
): Promise<CatalogSyncResult[]> {
  const entries = await readdir(directory, { recursive: true });
  const resultFiles = entries.filter((entry) => entry.endsWith(".json"));
  const results: CatalogSyncResult[] = [];
  for (const file of resultFiles) {
    const parsed = JSON.parse(
      await readFile(path.join(directory, file), "utf8"),
    ) as CatalogSyncResult[];
    results.push(...parsed);
  }
  return results;
}

function missingCatalogResult(catalog: {
  gameKey: string;
  lang: string;
}): CatalogSyncResult {
  return {
    ...catalog,
    succeeded: false,
    totalCards: 0,
    newCards: 0,
    updatedCards: 0,
    newCardNames: [],
    cardErrors: 0,
    cardErrorSamples: [],
    fatalError: "The sync job ended without reporting a result.",
    durationMs: 0,
  };
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

  if (listsCatalogsOnly) {
    await writeCatalogsOutput(catalogs);
    return 0;
  }

  if (reportFromResultsDirectory) {
    const reported = await readResultsDirectory(reportFromResultsDirectory);
    const reportedKeys = new Set(
      reported.map((result) => `${result.gameKey}:${result.lang}`),
    );
    const results = [
      ...reported,
      ...catalogs
        .filter((catalog) => !reportedKeys.has(`${catalog.gameKey}:${catalog.lang}`))
        .map(missingCatalogResult),
    ];
    await reportToDiscord(results);
    return 0;
  }

  let cardErrorSamples: string[] = [];
  subscribeSSE((event, data) => {
    if (event !== "log") return;
    const line = (data as { line: string }).line;
    log(`  ${line}`);
    if (
      line.startsWith("Error") &&
      cardErrorSamples.length < CATALOG_SYNC_REPORT_ERROR_SAMPLE_LIMIT
    ) {
      cardErrorSamples.push(line);
    }
  });

  const results: CatalogSyncResult[] = [];
  for (const { gameKey, lang } of catalogs) {
    const label = `${gameKey} (${lang})`;
    if (timeLimitReached()) {
      results.push({
        ...missingCatalogResult({ gameKey, lang }),
        fatalError: TIME_LIMIT_MESSAGE,
      });
      continue;
    }
    log(`Starting ${forceResync ? "force resync" : "sync"} of ${label}`);
    cardErrorSamples = [];
    const startedAt = Date.now();
    let startError: string | null = null;
    let stoppedAtTimeLimit = false;
    try {
      startSync(undefined, gameKey, lang, forceResync);
      stoppedAtTimeLimit = await waitForSyncWorkerToStopOrTimeLimit();
    } catch (err) {
      startError = err instanceof Error ? err.message : String(err);
    }
    const status = getStatus();
    const succeeded = startError === null && status.status === "completed";
    log(
      `${label}: ${succeeded ? status.status : "failed"}, ${status.processed}/${status.total} processed, ${status.skipped} skipped, ${status.errors} errors`,
    );
    if (!succeeded) {
      console.log(
        `::warning::Catalog sync failed for ${label}: ${stoppedAtTimeLimit ? TIME_LIMIT_MESSAGE : (startError ?? status.fatalError ?? "unknown error")}`,
      );
    }
    results.push({
      gameKey,
      lang,
      succeeded,
      totalCards: status.total,
      newCards: status.newCards ?? 0,
      updatedCards: status.updatedCards ?? 0,
      newCardNames: status.newCardNames ?? [],
      cardErrors: status.errors,
      cardErrorSamples,
      fatalError: succeeded
        ? null
        : stoppedAtTimeLimit
          ? TIME_LIMIT_MESSAGE
          : (startError ?? status.fatalError ?? `ended with status ${status.status}`),
      durationMs: Date.now() - startedAt,
    });
  }

  const failedLabels = results
    .filter((result) => !result.succeeded)
    .map((result) => `${result.gameKey} (${result.lang})`);
  const completedLabels = results
    .filter((result) => result.succeeded)
    .map((result) => `${result.gameKey} (${result.lang})`);
  log(`Completed: ${completedLabels.join(", ") || "none"}`);
  log(`Failed: ${failedLabels.join(", ") || "none"}`);

  if (resultsFilePath) {
    await writeFile(resultsFilePath, JSON.stringify(results));
    log(`Wrote results to ${resultsFilePath}.`);
  } else {
    await reportToDiscord(results);
  }
  return 0;
}

async function reportToDiscord(results: CatalogSyncResult[]): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    log("DISCORD_WEBHOOK_URL isn't set, skipping the Discord report.");
    return;
  }
  const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
  const runUrl =
    GITHUB_SERVER_URL && GITHUB_REPOSITORY && GITHUB_RUN_ID
      ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`
      : undefined;
  try {
    await postCatalogSyncReport(
      webhookUrl,
      buildCatalogSyncReport(results, {
        runUrl,
        forceResync,
        timestamp: new Date().toISOString(),
      }),
    );
    log("Posted the sync report to Discord.");
  } catch (err) {
    console.log(
      `::warning::Discord report failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
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
