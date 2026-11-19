import { z } from "zod";
import { CARD_CONDITIONS } from "../constants/card-condition.constant";
import { CARD_LANGUAGES } from "../constants/card-language.constant";
import {
  COLLECTION_CSV_IMPORT_MAX_ROWS,
  COLLECTION_CSV_IMPORT_QUANTITY_MAX,
  COLLECTION_CSV_IMPORT_TEXT_MAX_LENGTH,
} from "../constants/collection-csv-import.constant";
import type { CardCondition } from "../interfaces/card-condition.interface";

const importText = z.string().trim().max(COLLECTION_CSV_IMPORT_TEXT_MAX_LENGTH);

export const collectionCsvImportRowSchema = z.object({
  lineNumber: z.number().int().min(1),
  name: importText.min(1),
  setCode: importText.nullable(),
  setName: importText.nullable(),
  collectorNumber: importText.nullable(),
  catalogId: importText.nullable(),
  quantity: z.number().int().min(1).max(COLLECTION_CSV_IMPORT_QUANTITY_MAX),
  isFoil: z.boolean().nullable(),
  condition: z.enum(CARD_CONDITIONS as [CardCondition, ...CardCondition[]]).nullable(),
  language: z.enum(CARD_LANGUAGES).nullable(),
});

export const collectionCsvImportRequestSchema = z.object({
  rows: z.array(collectionCsvImportRowSchema).min(1).max(COLLECTION_CSV_IMPORT_MAX_ROWS),
});
