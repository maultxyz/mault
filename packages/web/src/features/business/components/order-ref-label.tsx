import type { OrderRefLabelProps } from "@/lib/interfaces/business";
import { useTranslation } from "react-i18next";

export function OrderRefLabel({ orderRef, binNumber }: OrderRefLabelProps) {
  const { t } = useTranslation("business");
  if (orderRef == null) {
    return <span className="text-foreground/70">{t("orders.noOrder")}</span>;
  }
  return (
    <span className="whitespace-nowrap">
      {t("orders.orderRefLabel", { order: orderRef })}
      {binNumber != null && (
        <span className="ml-1.5 text-xs text-foreground/70">
          {t("orders.orderBinLabel", { bin: binNumber })}
        </span>
      )}
    </span>
  );
}
