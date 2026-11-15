import type {
  StorageLabelTemplate,
  StorageLabelTemplateId,
} from "@/lib/interfaces/storage-labels";

const INCH = 25.4;

export const STORAGE_LABEL_TEMPLATE_IDS = ["avery-5160", "avery-5163", "avery-5164"] as const;

const LETTER_PAGE = { pageWidth: 8.5 * INCH, pageHeight: 11 * INCH };

export const STORAGE_LABEL_TEMPLATES: Record<StorageLabelTemplateId, StorageLabelTemplate> = {
  "avery-5160": {
    id: "avery-5160",
    ...LETTER_PAGE,
    columns: 3,
    rows: 10,
    labelWidth: 2.625 * INCH,
    labelHeight: 1 * INCH,
    marginLeft: 0.1875 * INCH,
    marginTop: 0.5 * INCH,
    horizontalPitch: 2.75 * INCH,
    verticalPitch: 1 * INCH,
    contentPadding: 2,
  },
  "avery-5163": {
    id: "avery-5163",
    ...LETTER_PAGE,
    columns: 2,
    rows: 5,
    labelWidth: 4 * INCH,
    labelHeight: 2 * INCH,
    marginLeft: 0.15625 * INCH,
    marginTop: 0.5 * INCH,
    horizontalPitch: 4.1875 * INCH,
    verticalPitch: 2 * INCH,
    contentPadding: 4,
  },
  "avery-5164": {
    id: "avery-5164",
    ...LETTER_PAGE,
    columns: 2,
    rows: 3,
    labelWidth: 4 * INCH,
    labelHeight: (10 / 3) * INCH,
    marginLeft: 0.15625 * INCH,
    marginTop: 0.5 * INCH,
    horizontalPitch: 4.1875 * INCH,
    verticalPitch: (10 / 3) * INCH,
    contentPadding: 6,
  },
};

export const STORAGE_LABEL_DEFAULT_VALUES = {
  locationGuids: [] as string[],
  templateId: "avery-5160" as StorageLabelTemplateId,
  startPosition: 1,
};

export const STORAGE_LABEL_PRINT_PAGE_STYLE =
  "@page { size: letter; margin: 0; } @media print { #root { display: none !important; } body { background: white !important; margin: 0 !important; } }";

export const STORAGE_LABEL_QR_QUIET_ZONE_MODULES = 1;

export const STORAGE_LABEL_NAME_MAX_FONT_SIZE = 7;

export const STORAGE_LABEL_NAME_LINE_HEIGHT = 1.15;

export const STORAGE_LABEL_NAME_MAX_LINES = 2;

export const STORAGE_LABEL_DETAIL_FONT_RATIO = 0.6;

export const STORAGE_LABEL_TEXT_GAP = 3;
