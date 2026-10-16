import type { CardCondition } from "../interfaces/card-condition.interface";

export const CONDITION_EXPORT_LABELS: Record<CardCondition, string> = {
  NM: "Near Mint",
  LP: "Lightly Played",
  MP: "Moderately Played",
  HP: "Heavily Played",
  DMG: "Damaged",
};
