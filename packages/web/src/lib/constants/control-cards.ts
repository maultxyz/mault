import type { QRCodeToDataURLOptions } from "qrcode";
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
  if (prefill.presetGuid) params.set(CONTROL_CARDS_PRESET_PARAM, prefill.presetGuid);
  const query = params.toString();
  return query ? `${CONTROL_CARDS_PATH}?${query}` : CONTROL_CARDS_PATH;
}

export const CONTROL_CARD_UNCHANGED = "unchanged";

export const CONTROL_CARD_NOT_FOIL = "not-foil";

export const CONTROL_CARD_ANY_SET = "any-set";

export const CONTROL_CARD_TOGGLE_VALUES = ["unchanged", "on", "off"] as const;

export const CONTROL_CARD_TITLE_MAX_LENGTH = 40;

export const CONTROL_CARDS_PER_PAGE = 9;

export const CONTROL_CARD_PRINT_PAGE_STYLE = "@page { margin: 6mm; }";

export const CONTROL_CARD_QR_OPTIONS: QRCodeToDataURLOptions = {
  errorCorrectionLevel: "M",
  margin: 1,
  width: 600,
};

export const CONTROL_CARD_DEFAULT_VALUES: ControlCardFormValues = {
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
