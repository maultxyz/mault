import { PRICE_LABELS_PATH } from "@/lib/constants/business";
import { LABEL_SHEET_DEFAULT_TEMPLATE_ID } from "@/lib/constants/label-sheets";
import type { PageRequest } from "@/lib/interfaces/pagination";
import type { PriceLabelOptionsFormValues } from "@/schemas/price-labels.schema";
import type { PriceLabelSource } from "@magic-vault/shared";

export const PRICE_LABEL_SOURCE_PARAM = "source";

export const PRICE_LABEL_SOURCE_GUID_PARAM = "guid";

export const priceLabelsPath = (source: PriceLabelSource, sourceGuid: string) =>
  `${PRICE_LABELS_PATH}?${new URLSearchParams({
    [PRICE_LABEL_SOURCE_PARAM]: source,
    [PRICE_LABEL_SOURCE_GUID_PARAM]: sourceGuid,
  })}`;

export const PRICE_LABEL_DEFAULT_VALUES: PriceLabelOptionsFormValues = {
  source: "collection",
  sourceGuid: "",
  deselectedScanIds: [],
  customPrices: {},
  markupPercent: 0,
  rounding: "none",
  templateId: LABEL_SHEET_DEFAULT_TEMPLATE_ID,
  startPosition: 1,
};

export const PRICE_LABEL_INTAKE_LOTS_PAGE: PageRequest = { page: 1, selected: null };

export const PRICE_LABEL_NAME_FONT_SIZE_PER_LABEL_HEIGHT = 0.18;

export const PRICE_LABEL_NAME_MAX_FONT_SIZE = 8;

export const PRICE_LABEL_NAME_MAX_LINES = 2;

export const PRICE_LABEL_LINE_HEIGHT = 1.15;

export const PRICE_LABEL_DETAIL_FONT_RATIO = 0.72;

export const PRICE_LABEL_PRICE_LINE_HEIGHT = 1;

export const PRICE_LABEL_PRICE_FONT_SIZE_PER_LABEL_HEIGHT = 0.3;

export const PRICE_LABEL_PRICE_MAX_FONT_SIZE = 14;

export const PRICE_LABEL_PRICE_COLUMN_RATIO = 0.36;

export const PRICE_LABEL_TEXT_GAP = 2;
