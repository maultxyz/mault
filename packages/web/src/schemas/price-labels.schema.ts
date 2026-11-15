import {
  formValidationMessage,
  PRICE_LABEL_CUSTOM_PRICE_MAX,
  PRICE_LABEL_MARKUP_PERCENT_MAX,
  PRICE_LABEL_MARKUP_PERCENT_MIN,
  PRICE_LABEL_ROUNDING_MODES,
  PRICE_LABEL_SOURCES,
} from "@magic-vault/shared";
import { z } from "zod";
import {
  labelSheetOptionsShape,
  refineLabelSheetStartPosition,
} from "@/schemas/label-sheets.schema";

export const priceLabelOptionsSchema = z
  .object({
    source: z.enum(PRICE_LABEL_SOURCES),
    sourceGuid: z.string(),
    deselectedScanIds: z.array(z.string()),
    customPrices: z.record(
      z.string(),
      z
        .number(formValidationMessage("valueRequired"))
        .min(0, formValidationMessage("atLeast", { min: 0 }))
        .max(
          PRICE_LABEL_CUSTOM_PRICE_MAX,
          formValidationMessage("atMost", { max: PRICE_LABEL_CUSTOM_PRICE_MAX }),
        ),
    ),
    markupPercent: z
      .number(formValidationMessage("valueRequired"))
      .min(
        PRICE_LABEL_MARKUP_PERCENT_MIN,
        formValidationMessage("atLeast", { min: PRICE_LABEL_MARKUP_PERCENT_MIN }),
      )
      .max(
        PRICE_LABEL_MARKUP_PERCENT_MAX,
        formValidationMessage("atMost", { max: PRICE_LABEL_MARKUP_PERCENT_MAX }),
      ),
    rounding: z.enum(PRICE_LABEL_ROUNDING_MODES),
    ...labelSheetOptionsShape,
  })
  .superRefine(refineLabelSheetStartPosition);

export type PriceLabelOptionsFormValues = z.infer<typeof priceLabelOptionsSchema>;
