import { formatCompactNumber } from "@magic-vault/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { CompactFigure } from "@/lib/interfaces/i18n";

export function useCompactCount(): (value: number) => CompactFigure {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  return useCallback(
    (value: number) => ({
      value: formatCompactNumber(value, locale),
      exactValue: new Intl.NumberFormat(locale).format(value),
    }),
    [locale],
  );
}
