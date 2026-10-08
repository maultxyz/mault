import {
  BIN_HEIGHT_PRESETS,
  CUSTOM_BIN_SIZE_KEY,
  type BinSizeOption,
} from "@magic-vault/shared";

export function binSizeOptionFor(height: number | undefined): BinSizeOption {
  if (height == null) return BIN_HEIGHT_PRESETS[0].key;
  return (
    BIN_HEIGHT_PRESETS.find((preset) => preset.height === height)?.key ??
    CUSTOM_BIN_SIZE_KEY
  );
}
