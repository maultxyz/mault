import type { LabelSheetTemplate } from "@/lib/interfaces/label-sheets";
import type { PriceLabelOptionsFormValues } from "@/schemas/price-labels.schema";
import type { PriceLabelCard } from "@magic-vault/shared";
import type { UseFormReturn } from "react-hook-form";

export interface PriceLabelItem {
  card: PriceLabelCard;
  labelPrice: number | null;
  hasCustomPrice: boolean;
}

export interface PriceLabelSourceOption {
  guid: string;
  name: string;
}

export interface PriceLabelOptionsFormProps {
  form: UseFormReturn<PriceLabelOptionsFormValues>;
  orgId: string;
  loadedSourceName: string | null;
}

export interface PriceLabelCardListProps {
  form: UseFormReturn<PriceLabelOptionsFormValues>;
  items: PriceLabelItem[];
  formatLabelPrice: (price: number) => string;
}

export interface PriceLabelSheetProps {
  template: LabelSheetTemplate;
  items: PriceLabelItem[];
  startPosition: number;
  formatLabelPrice: (price: number) => string;
}

export interface PriceLabelProps {
  template: LabelSheetTemplate;
  item: PriceLabelItem;
  formatLabelPrice: (price: number) => string;
}

export interface PriceLabelsViewProps {
  orgId: string;
}
