export type PrintedLanguageCodeUnknownReason =
  | "noTextColumn"
  | "noAnchorLine"
  | "busyBackground"
  | "unexpectedInk";

export interface PrintedLanguageCodeBand {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PrintedLanguageCodeDetection {
  present: boolean | null;
  unknownReason: PrintedLanguageCodeUnknownReason | null;
  inkExtentRatio: number | null;
}

export interface PrintedLanguageCodeMatch {
  detected: boolean;
  cardId: string | null;
  replacedCardId: string | null;
}
