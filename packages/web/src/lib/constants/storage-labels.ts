import { LABEL_SHEET_DEFAULT_TEMPLATE_ID } from "@/lib/constants/label-sheets";
import type {
  BatchDividerSheetLayout,
  StorageLabelSheetKind,
} from "@/lib/interfaces/storage-labels";

export const STORAGE_LABEL_SHEET_KINDS = ["labels", "batchDividers"] as const;

export const STORAGE_LABEL_DEFAULT_VALUES = {
  sheetKind: "labels" as StorageLabelSheetKind,
  locationGuids: [] as string[],
  customDividerText: "",
  showsDividerLocationName: true,
  templateId: LABEL_SHEET_DEFAULT_TEMPLATE_ID,
  startPosition: 1,
};

export const STORAGE_LABEL_QR_QUIET_ZONE_MODULES = 1;

export const STORAGE_LABEL_NAME_MAX_FONT_SIZE = 7;

export const STORAGE_LABEL_QR_HEIGHT_PER_NAME_FONT_SIZE = 3.8;

export const STORAGE_LABEL_NAME_LINE_HEIGHT = 1.15;

export const STORAGE_LABEL_NAME_MAX_LINES = 2;

export const STORAGE_LABEL_DETAIL_FONT_RATIO = 0.6;

export const STORAGE_LABEL_TEXT_GAP = 3;


export const BATCH_DIVIDER_SHEET_LAYOUT: BatchDividerSheetLayout = {
  pageWidth: 215.9,
  pageHeight: 279.4,
  columns: 3,
  rows: 2,
  tileWidth: 65,
  tileHeight: 110,
  bleed: 1,
  tabHeight: 20,
  padding: 3,
  titleMaxFontSize: 6,
  detailFontSize: 3.2,
  lineGap: 1.6,
  cutLineWidth: 0.27,
  cutLineColor: "#000000",
  cardTopLineColor: "#9ca3af",
  cardTopLineDash: "1.5 1",
};

export const BATCH_DIVIDERS_PER_PAGE =
  BATCH_DIVIDER_SHEET_LAYOUT.columns * BATCH_DIVIDER_SHEET_LAYOUT.rows;

export const BATCH_DIVIDERS_MAX = 300;
