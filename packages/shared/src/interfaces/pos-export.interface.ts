import type { POS_EXPORT_FORMATS } from "../constants/pos-export.constant";
import type { CardCondition } from "./card-condition.interface";

export type PosExportFormat = (typeof POS_EXPORT_FORMATS)[number];

export interface CardSkuInput {
  gameKey: string;
  cardId: string;
  setCode: string;
  collectorNumber: string;
  language: string;
  isFoil: boolean;
  foilType: string | null;
  stamp: string | null;
  condition: CardCondition;
}

export interface PosExportCopy {
  sku: string;
  gameName: string;
  name: string;
  setName: string;
  setCode: string;
  collectorNumber: string;
  condition: CardCondition;
  isFoil: boolean;
  foilType: string | null;
  language: string;
  price: number | null;
  imageUrl: string | null;
}

export interface PosExportPricedCopy {
  sku: string;
  price: number | null;
}

export type PosExportGrouped<Copy extends PosExportPricedCopy> = Copy & {
  quantity: number;
  hasMixedPrices: boolean;
};

export type PosExportItem = PosExportGrouped<PosExportCopy>;

export interface PosExportContext {
  currency: string;
}
