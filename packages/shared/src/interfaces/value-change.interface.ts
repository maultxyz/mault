export interface ValueChange {
  direction: "up" | "down" | "flat";
  change: string;
  percent: string;
}

export interface CardPriceChange {
  direction: "up" | "down";
  change: string;
}
