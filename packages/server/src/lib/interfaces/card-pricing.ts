import type { SellPriceConfig } from "@magic-vault/shared";

export interface SellPriceSqlContext {
  config: SellPriceConfig;
  currency: string;
}
