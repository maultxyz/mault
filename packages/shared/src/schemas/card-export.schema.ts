import { z } from "zod";
import { allExportAdapters } from "../card-export";
import { BULK_SCAN_IDS_MAX } from "../constants/collection-cards.constant";

const exportFormatSchema = z
  .string()
  .refine((format) => allExportAdapters.some((adapter) => adapter.key === format));

export const storageLocationCsvExportRequestSchema = z.object({
  format: exportFormatSchema,
  combineDuplicates: z.boolean(),
  scanIds: z.array(z.string()).max(BULK_SCAN_IDS_MAX).optional(),
});

export const collectionCsvExportRequestSchema = storageLocationCsvExportRequestSchema.extend({
  scanIds: z.array(z.string()).max(BULK_SCAN_IDS_MAX),
});

export type StorageLocationCsvExportRequest = z.infer<typeof storageLocationCsvExportRequestSchema>;
export type CollectionCsvExportRequest = z.infer<typeof collectionCsvExportRequestSchema>;
