export interface ValueChange {
  direction: "up" | "down" | "flat";
  change: string;
  percent: string;
}

export interface CardPriceChangeSinceScan {
  direction: "up" | "down";
  change: string;
}
