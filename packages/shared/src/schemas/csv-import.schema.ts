import { z } from "zod";
import {
  CSV_IMPORT_TYPES,
  CSV_IMPORT_NAME_MAX_LENGTH,
} from "../constants/csv-import.constant";
import type { CsvImportField } from "../interfaces/csv-import.interface";

const CSV_IMPORT_FIELD_KEYS = [
  "orderRef",
  "customerName",
  "customerContact",
  "shippingAddress",
  "orderNote",
  "carrier",
  "trackingNumber",
  "labelUrl",
  "shippedDate",
  "lineNote",
  "storageLocation",
  "name",
  "setCode",
  "setName",
  "collectorNumber",
  "condition",
  "foil",
  "quantity",
  "unitPrice",
  "language",
] as const satisfies readonly CsvImportField[];

export const csvImportMappingSchema = z.object({
  type: z.enum(CSV_IMPORT_TYPES),
  columns: z.partialRecord(
    z.enum(CSV_IMPORT_FIELD_KEYS),
    z.number().int().min(0),
  ),
  composition: z.enum(["reference", "master-detail", "single"]),
  singleOrderName: z.string().trim().max(CSV_IMPORT_NAME_MAX_LENGTH).nullable(),
  sourceHeaders: z.array(z.string()).nullable().optional(),
});

export const importTemplateInputSchema = z.object({
  name: z.string().trim().min(1).max(CSV_IMPORT_NAME_MAX_LENGTH),
  type: z.enum(CSV_IMPORT_TYPES),
  mapping: csvImportMappingSchema,
});
