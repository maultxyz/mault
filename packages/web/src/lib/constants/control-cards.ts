import type { ScannerControlCommandActionKey } from "@magic-vault/shared";
import type {
  ControlCardArtwork,
  ControlCardFrame,
  ControlCardFrameColor,
  ControlCardRenderLayout,
  ControlCardSheetLayout,
} from "@/lib/interfaces/control-cards";
import type { ControlCardFormValues } from "@/schemas/control-cards.schema";

export const CONTROL_CARDS_PATH = "/app/control-cards";

export const CONTROL_CARDS_BACK_PATH = "/app";

export const CONTROL_CARDS_COLLECTION_PARAM = "collection";

export const CONTROL_CARDS_PRESET_PARAM = "preset";

export function controlCardsPath(prefill: {
  collectionGuid?: string;
  presetGuid?: string;
}): string {
  const params = new URLSearchParams();
  if (prefill.collectionGuid) {
    params.set(CONTROL_CARDS_COLLECTION_PARAM, prefill.collectionGuid);
  }
  if (prefill.presetGuid)
    params.set(CONTROL_CARDS_PRESET_PARAM, prefill.presetGuid);
  const query = params.toString();
  return query ? `${CONTROL_CARDS_PATH}?${query}` : CONTROL_CARDS_PATH;
}

export const CONTROL_CARD_UNCHANGED = "unchanged";

export const CONTROL_CARD_NOT_FOIL = "not-foil";

export const CONTROL_CARD_ANY_SET = "any-set";

export const CONTROL_CARD_TOGGLE_VALUES = ["unchanged", "on", "off"] as const;

export const CONTROL_CARD_TITLE_MAX_LENGTH = 40;

export const CONTROL_CARDS_PER_PAGE = 9;

export const CONTROL_CARD_PRINT_PAGE_STYLE =
  "@page { size: letter; margin: 0; } @media print { #root { display: none !important; } body { background: white !important; margin: 0 !important; } }";

export const CONTROL_CARD_SHEET_LAYOUT: ControlCardSheetLayout = {
  pageWidth: 215.9,
  pageHeight: 279.4,
  columns: 3,
  rows: 3,
  tileWidth: 65,
  tileHeight: 90,
  bleed: 1,
  cutLineWidth: 0.27,
  cutLineColor: "#000000",
  logo: {
    originX: 8.4,
    originY: 40,
    markSize: 7,
    wordmark: "Mault",
    wordmarkFontSize: 5.4,
    wordmarkGap: 0.6,
  },
};

export const CONTROL_CARD_STYLES = ["illustrated", "plain"] as const;

export const CONTROL_CARD_DEFAULT_VALUES: ControlCardFormValues = {
  style: "illustrated",
  title: "",
  collectionGuid: CONTROL_CARD_UNCHANGED,
  presetGuid: CONTROL_CARD_UNCHANGED,
  forcedFoilType: CONTROL_CARD_UNCHANGED,
  forcedSetCode: CONTROL_CARD_UNCHANGED,
  condition: CONTROL_CARD_UNCHANGED,
  autoFeed: CONTROL_CARD_UNCHANGED,
  allowDuplicates: CONTROL_CARD_UNCHANGED,
  pauseScanner: false,
};

const CONTROL_CARD_ART_DIRECTORY = "/control-cards";

export const CONTROL_CARD_ARTWORKS: ControlCardArtwork[] = [
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/angelic-duplicates.webp`,
    command: { allowDuplicates: true },
  },
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/duplicate-blocker.webp`,
    command: { allowDuplicates: false },
  },
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/auto-feed-the-swarm.webp`,
    command: { autoFeed: true },
  },
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/autofeed-blocker.webp`,
    command: { autoFeed: false },
  },
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/near-mint-jet.webp`,
    command: { condition: "NM" },
  },
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/lightly-played-ruins.webp`,
    command: { condition: "LP" },
  },
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/moderately-played.webp`,
    command: { condition: "MP" },
  },
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/heavily-played-goblin.webp`,
    command: { condition: "HP" },
  },
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/damaged.webp`,
    command: { condition: "DMG" },
  },
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/not-foil.webp`,
    command: { forcedFoilType: null },
  },
  {
    imagePath: `${CONTROL_CARD_ART_DIRECTORY}/traditional-foil.webp`,
    command: { forcedFoilType: "Traditional" },
  },
];

export const CONTROL_CARD_BLANK_FRAME_PATHS: Record<
  ControlCardFrameColor,
  string
> = {
  blue: `${CONTROL_CARD_ART_DIRECTORY}/blank-blue.webp`,
  red: `${CONTROL_CARD_ART_DIRECTORY}/blank-red.webp`,
  green: `${CONTROL_CARD_ART_DIRECTORY}/blank-green.webp`,
  white: `${CONTROL_CARD_ART_DIRECTORY}/blank-white.webp`,
  black: `${CONTROL_CARD_ART_DIRECTORY}/blank-black.webp`,
};

export const CONTROL_CARD_FRAMES_BY_ACTION: Record<
  ScannerControlCommandActionKey,
  ControlCardFrame
> = {
  collection: { color: "blue", typeLine: "sorcery" },
  preset: { color: "green", typeLine: "enchantment" },
  foil: { color: "red", typeLine: "instant" },
  notFoil: { color: "blue", typeLine: "instant" },
  set: { color: "white", typeLine: "artifact" },
  anySet: { color: "white", typeLine: "artifact" },
  condition: { color: "red", typeLine: "creature" },
  autoFeedOn: { color: "black", typeLine: "enchantment" },
  autoFeedOff: { color: "green", typeLine: "creature" },
  duplicatesOn: { color: "white", typeLine: "creature" },
  duplicatesOff: { color: "white", typeLine: "artifact" },
  pause: { color: "black", typeLine: "instant" },
};

export const CONTROL_CARD_RENDER_LAYOUT: ControlCardRenderLayout = {
  trimWidth: 1005,
  trimHeight: 1407,
  bleed: 16,
  artworkBleedColor: "#000000",
  paperColor: "#ffffff",
  inkColor: "#111111",
  cornerMark: { length: 104, width: 5, color: "#3ddc3d" },
  qrErrorCorrectionLevel: "M",
  qrMarginModules: 1,
  frame: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    qrPlate: {
      centerX: 504,
      centerY: 469,
      size: 500,
      padding: 18,
      radius: 24,
      borderColor: "rgba(0, 0, 0, 0.55)",
      borderWidth: 3,
    },
    name: { left: 88, centerY: 110, maxWidth: 830, fontSize: 46, isBold: true, align: "left" },
    typeLine: { left: 88, centerY: 833, maxWidth: 760, fontSize: 40, isBold: true, align: "left" },
    rules: {
      left: 100,
      top: 910,
      width: 805,
      height: 370,
      maxFontSize: 44,
      minFontSize: 24,
      fontSizeStep: 2,
      lineHeight: 1.22,
      paragraphGap: 0.45,
      align: "left",
    },
  },
  plain: {
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    title: { left: 60, centerY: 115, maxWidth: 885, fontSize: 60, isBold: true, align: "center" },
    qrLeft: 122,
    qrTop: 190,
    qrSize: 760,
    actions: {
      left: 60,
      top: 985,
      width: 885,
      height: 360,
      maxFontSize: 44,
      minFontSize: 26,
      fontSizeStep: 2,
      lineHeight: 1.3,
      paragraphGap: 0.15,
      align: "center",
    },
  },
  outputMimeType: "image/jpeg",
  outputQuality: 0.92,
};
