import type { PriceSource } from "@magic-vault/shared";

export interface PrimaryColorPickerProps {
  value: string | null;
  savedValue: string | null;
  onChange: (primaryColor: string | null) => void;
}

export interface ScannerLayoutToggleProps {
  value: "horizontal" | "vertical";
  onChange: (scannerLayout: "horizontal" | "vertical") => void;
}

export interface PriceSourceToggleProps {
  value: PriceSource;
  onChange: (priceSource: PriceSource) => void;
}

export interface OcrToggleProps {
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export interface CorrectionAutoCloseSettingProps {
  value: number | null;
  disabled?: boolean;
  onChange: (seconds: number | null) => void;
}
