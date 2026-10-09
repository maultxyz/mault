import { OCR_REGIONS_BY_GAME_KEY, type OcrRegion } from "@magic-vault/shared";
import { writeFile } from "node:fs/promises";
import {
  OCR_CALIBRATION_ALL_GAMES,
  OCR_CALIBRATION_DEFAULT_LANG,
  OCR_CALIBRATION_DEFAULT_SAMPLE,
} from "../src/lib/constants/ocr-calibration";
import {
  calibratableGameKeys,
  runOcrCalibration,
} from "../src/lib/ocr-calibration";
import {
  describeRegionSource,
  formatAllRegions,
  formatCalibrationReport,
  formatRegionsSnippet,
  mergeWithCurrent,
} from "../src/lib/ocr-calibration/report";
import type {
  OcrCalibrationAllReport,
  OcrCalibrationOptions,
  OcrCalibrationReport,
} from "../src/lib/interfaces/ocr-calibration";

function parseArgs(argv: string[]): OcrCalibrationOptions {
  const flags = new Map<string, string>();
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      flags.set(arg.slice(2), argv[i + 1] ?? "");
      i++;
    } else {
      positional.push(arg);
    }
  }
  const gameKey = positional[0];
  if (!gameKey) {
    throw new Error(
      `Usage: calibrate:ocr-regions <gameKey|${OCR_CALIBRATION_ALL_GAMES}> [--sample N] [--lang en] [--out report.json]`,
    );
  }
  const sample = Number(flags.get("sample") ?? OCR_CALIBRATION_DEFAULT_SAMPLE);
  if (!Number.isInteger(sample) || sample <= 0) {
    throw new Error("--sample must be a positive integer");
  }
  return {
    gameKey,
    lang: flags.get("lang") || OCR_CALIBRATION_DEFAULT_LANG,
    sample,
    out: flags.get("out") || null,
  };
}

async function writeOut(out: string | null, data: unknown) {
  if (!out) return;
  await writeFile(out, JSON.stringify(data, null, 2));
  console.log(`\nWrote ${out}`);
}

async function calibrateOne(options: OcrCalibrationOptions) {
  const report = await runOcrCalibration(options, (message) =>
    console.log(message),
  );
  console.log("");
  console.log(formatCalibrationReport(report));
  console.log("");
  console.log(formatRegionsSnippet(report.gameKey, mergeWithCurrent(report)));
  await writeOut(options.out, report);
}

async function calibrateAll(options: OcrCalibrationOptions) {
  const gameKeys = await calibratableGameKeys(options.lang);
  console.log(
    `Calibrating ${gameKeys.length} game(s) with stored ${options.lang} cards: ${gameKeys.join(", ") || "none"}`,
  );

  const reports: OcrCalibrationReport[] = [];
  for (const gameKey of gameKeys) {
    console.log(`\n=== ${gameKey} ===`);
    try {
      reports.push(
        await runOcrCalibration({ ...options, gameKey }, (message) =>
          console.log(message),
        ),
      );
    } catch (err) {
      console.error(
        `${gameKey}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log("");
  for (const report of reports) {
    console.log(formatCalibrationReport(report));
    console.log("");
  }

  const reportsByGameKey = new Map(
    reports.map((report) => [report.gameKey, report]),
  );
  const allGameKeys = [
    ...new Set([...Object.keys(OCR_REGIONS_BY_GAME_KEY), ...reportsByGameKey.keys()]),
  ];
  const regions: Record<string, OcrRegion[]> = Object.fromEntries(
    allGameKeys.flatMap((gameKey) => {
      const report = reportsByGameKey.get(gameKey);
      const merged = report
        ? mergeWithCurrent(report)
        : OCR_REGIONS_BY_GAME_KEY[gameKey];
      return merged.length > 0 ? [[gameKey, merged]] : [];
    }),
  );

  for (const gameKey of allGameKeys) {
    console.log(describeRegionSource(gameKey, reportsByGameKey.get(gameKey)));
  }
  console.log("");
  console.log(formatAllRegions(regions));

  const all: OcrCalibrationAllReport = { lang: options.lang, reports, regions };
  await writeOut(options.out, all);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.gameKey === OCR_CALIBRATION_ALL_GAMES) {
    await calibrateAll(options);
  } else {
    await calibrateOne(options);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
