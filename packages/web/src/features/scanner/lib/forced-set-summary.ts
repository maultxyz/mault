import type { TFunction } from "i18next";

export function forcedSetSummary(
  forceSetCodes: readonly string[],
  t: TFunction<"scanner">,
): string {
  if (forceSetCodes.length === 0) return t("scannerControls.anySet");
  if (forceSetCodes.length === 1) return forceSetCodes[0].toUpperCase();
  return t("scannerControls.setCount", { count: forceSetCodes.length });
}
