import type { CardCondition } from "@magic-vault/shared";

export interface TcgplayerSkuTarget {
  productId: number;
  variants: string[];
  condition: CardCondition;
  languageCode: string;
}
