import { z } from "zod";
import { STORAGE_LABEL_SHEET_KINDS } from "@/lib/constants/storage-labels";
import {
  labelSheetOptionsShape,
  refineLabelSheetStartPosition,
} from "@/schemas/label-sheets.schema";

export const storageLabelOptionsSchema = z
  .object({
    sheetKind: z.enum(STORAGE_LABEL_SHEET_KINDS),
    locationGuids: z.array(z.string()),
    customDividerText: z.string(),
    showsDividerLocationName: z.boolean(),
    ...labelSheetOptionsShape,
  })
  .superRefine(refineLabelSheetStartPosition);

export type StorageLabelOptionsFormValues = z.infer<typeof storageLabelOptionsSchema>;
