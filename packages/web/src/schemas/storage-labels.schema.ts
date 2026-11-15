import { z } from "zod";
import {
  labelSheetOptionsShape,
  refineLabelSheetStartPosition,
} from "@/schemas/label-sheets.schema";

export const storageLabelOptionsSchema = z
  .object({
    locationGuids: z.array(z.string()),
    ...labelSheetOptionsShape,
  })
  .superRefine(refineLabelSheetStartPosition);

export type StorageLabelOptionsFormValues = z.infer<typeof storageLabelOptionsSchema>;
