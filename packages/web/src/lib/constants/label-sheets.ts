import type {
  LabelSheetTemplate,
  LabelSheetTemplateId,
} from "@/lib/interfaces/label-sheets";

const INCH = 25.4;

export const LABEL_SHEET_TEMPLATE_IDS = ["avery-5160", "avery-5163", "avery-5164"] as const;

const LETTER_PAGE = { pageWidth: 8.5 * INCH, pageHeight: 11 * INCH };

export const LABEL_SHEET_TEMPLATES: Record<LabelSheetTemplateId, LabelSheetTemplate> = {
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

export const LABEL_SHEET_DEFAULT_TEMPLATE_ID: LabelSheetTemplateId = "avery-5160";

export const LABEL_SHEET_PRINT_PAGE_STYLE =
  "@page { size: letter; margin: 0; } @media print { #root { display: none !important; } body { background: white !important; margin: 0 !important; } }";

export const LABEL_SHEET_AVERAGE_CHARACTER_WIDTH_RATIO = 0.55;

export const LABEL_BRAND_GAP_RATIO = 0.3;

export const LABEL_BRAND_MARK_HEIGHT_RATIO = 0.8;
