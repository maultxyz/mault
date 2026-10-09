import { OCR_REGIONS_BY_GAME_KEY } from "@magic-vault/shared";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "../../db";
import { cardImageVectors } from "../../db/schema";
import { ADAPTERS_BY_GAME_KEY } from "../card-search/resolve";
import {
  OCR_CALIBRATION_FETCH_DELAY_MS,
  OCR_CALIBRATION_FIELDS,
} from "../constants/ocr-calibration";
import type {
  OcrCalibrationOptions,
  OcrCalibrationReport,
  OcrCardObservations,
} from "../interfaces/ocr-calibration";
import { ocrPageLines } from "../ocr";
import { SYNC_SOURCES } from "../sync-job/sources";
import { calibrateField, proposeRegions } from "./cluster";
import {
  calibrationPages,
  fetchCalibrationImage,
  pagePixels,
  sourceImageUrl,
  tightenLines,
} from "./image";
import { observeCard } from "./match";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function calibratableGameKeys(lang: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ gameKey: cardImageVectors.gameKey })
    .from(cardImageVectors)
    .where(
      and(eq(cardImageVectors.lang, lang), isNotNull(cardImageVectors.data)),
    );
  return rows
    .map(({ gameKey }) => gameKey)
    .filter((gameKey) => ADAPTERS_BY_GAME_KEY[gameKey] && SYNC_SOURCES[gameKey])
    .sort();
}

export async function runOcrCalibration(
  options: OcrCalibrationOptions,
  log: (message: string) => void,
): Promise<OcrCalibrationReport> {
  const adapter = ADAPTERS_BY_GAME_KEY[options.gameKey];
  const source = SYNC_SOURCES[options.gameKey];
  if (!adapter || !source) {
    throw new Error(`No adapter or sync source for game "${options.gameKey}"`);
  }

  const rows = await db
    .select({ cardId: cardImageVectors.cardId, data: cardImageVectors.data })
    .from(cardImageVectors)
    .where(
      and(
        eq(cardImageVectors.gameKey, options.gameKey),
        eq(cardImageVectors.lang, options.lang),
        isNotNull(cardImageVectors.data),
      ),
    )
    .orderBy(sql`random()`)
    .limit(options.sample);
  log(`Sampled ${rows.length} stored card(s).`);

  const observations: OcrCardObservations[] = [];
  for (const [index, row] of rows.entries()) {
    const card = adapter.normalizeStored(row.data, row.cardId, options.lang);
    const url = card?.image ? sourceImageUrl(card.image.normal) : null;
    if (!card || !url) {
      log(`[${index + 1}/${rows.length}] ${row.cardId}: no image, skipped`);
      continue;
    }
    try {
      await delay(OCR_CALIBRATION_FETCH_DELAY_MS);
      const image = await fetchCalibrationImage(url, source.fetchHeaders);
      const pages = await calibrationPages(image);
      const pixels = await pagePixels(pages[0]);
      const lines = tightenLines(
        (await Promise.all(pages.map((page) => ocrPageLines(page)))).flat(),
        pixels,
      );
      const observed = observeCard(lines, {
        name: card.name,
        setCode: card.set,
        collectorNumber: card.collectorNumber,
      });
      observations.push(observed);
      const fields = OCR_CALIBRATION_FIELDS.filter((field) => observed[field]);
      log(
        `[${index + 1}/${rows.length}] ${card.name} (${card.set} ${card.collectorNumber}): ${fields.join(", ") || "nothing found"}`,
      );
    } catch (err) {
      log(
        `[${index + 1}/${rows.length}] ${card.name}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const fields = OCR_CALIBRATION_FIELDS.map((field) =>
    calibrateField(
      field,
      observations.flatMap((observed) => {
        const observation = observed[field];
        return observation ? [observation] : [];
      }),
    ),
  );

  return {
    gameKey: options.gameKey,
    lang: options.lang,
    sampled: rows.length,
    read: observations.length,
    fields,
    proposed: fields.flatMap(proposeRegions),
    current: OCR_REGIONS_BY_GAME_KEY[options.gameKey] ?? [],
  };
}
