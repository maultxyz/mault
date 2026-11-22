import {
  OCR_REGIONS_BY_GAME_KEY,
  pickUnmatchedRetryMatch,
  type OcrRegionTrace,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import sharp from "sharp";
import {
  attachMatchedCards,
  findCardMatches,
  findCardMatchesByOcr,
} from "../routes/card/shared";
import {
  ADMIN_OCR_IMAGE_HEIGHT,
  ADMIN_OCR_IMAGE_WIDTH,
} from "./constants/admin-unmatched";
import type { AdminScanRow } from "./interfaces/admin-unmatched";
import type { CardTextMatchResult } from "./interfaces/card-search";
import { loadScanImage } from "./scan-images";

export function ocrRegionsForStoredScan(row: Pick<AdminScanRow, "gameKey">) {
  return row.gameKey ? (OCR_REGIONS_BY_GAME_KEY[row.gameKey] ?? []) : [];
}

export async function readStoredScanText(
  row: AdminScanRow,
  trace?: OcrRegionTrace[],
): Promise<CardTextMatchResult | null> {
  const regions = ocrRegionsForStoredScan(row);
  if (!row.gameKey || !row.embedding || regions.length === 0) return null;
  const photo = await loadScanImage(row);
  if (!photo) return null;

  const image = await sharp(photo)
    .resize(ADMIN_OCR_IMAGE_WIDTH, ADMIN_OCR_IMAGE_HEIGHT, { fit: "fill" })
    .png()
    .toBuffer();
  return attachMatchedCards(
    await findCardMatchesByOcr(
      image,
      regions,
      {
        gameKey: row.gameKey,
        lang: row.lang,
        matchAllLanguages: row.matchAllLanguages,
        embeddings: { embedding: row.embedding },
      },
      trace,
    ),
    row.gameKey,
    row.lang,
  );
}

export async function rematchStoredScanWithText(
  row: AdminScanRow,
): Promise<PlayingCardWithDistance | null> {
  if (!row.embedding || !row.gameKey) return null;
  const imageResult = await attachMatchedCards(
    await findCardMatches({
      gameKey: row.gameKey,
      lang: row.lang,
      matchAllLanguages: row.matchAllLanguages,
      embeddings: { embedding: row.embedding },
    }),
    row.gameKey,
    row.lang,
  );
  const textResult = await readStoredScanText(row);
  const pick = pickUnmatchedRetryMatch(imageResult, textResult);
  const leader =
    pick === "text"
      ? textResult?.data?.[0]
      : pick === "image"
        ? imageResult.data?.[0]
        : null;
  if (!leader?.card) return null;
  return {
    ...leader.card,
    distance: leader.distance,
    confidence: leader.confidence,
  };
}
