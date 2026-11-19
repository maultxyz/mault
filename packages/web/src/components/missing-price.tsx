import { MISSING_PRICE_TEXT } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function MissingPrice() {
  const { t } = useTranslation("common");
  return (
    <>
      <span aria-hidden="true">{MISSING_PRICE_TEXT}</span>
      <span className="sr-only">{t("a11y.noPrice")}</span>
    </>
  );
}
