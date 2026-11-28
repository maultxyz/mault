import { z } from "zod";
import { POS_EXPORT_FORMATS } from "../constants/pos-export.constant";
import {
  PRICE_LABEL_CARDS_MAX,
  PRICE_LABEL_CUSTOM_PRICE_MAX,
  PRICE_LABEL_SOURCES,
} from "../constants/price-labels.constant";

export const posExportRequestSchema = z.object({
  source: z.enum(PRICE_LABEL_SOURCES),
  sourceGuid: z.string(),
  format: z.enum(POS_EXPORT_FORMATS),
  deselectedScanIds: z.array(z.string()).max(PRICE_LABEL_CARDS_MAX),
  customPrices: z.record(z.string(), z.number().min(0).max(PRICE_LABEL_CUSTOM_PRICE_MAX)),
});

export type PosExportRequest = z.infer<typeof posExportRequestSchema>;
