import { MISSING_PRICE_TEXT } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import type { MissingPriceProps } from "@/lib/interfaces/missing-price";

export function MissingPrice({ label }: MissingPriceProps) {
  const { t } = useTranslation("common");
  return (
    <>
      <span aria-hidden="true">{MISSING_PRICE_TEXT}</span>
      <span className="sr-only">{label ?? t("a11y.noPrice")}</span>
    </>
  );
}
