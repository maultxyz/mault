import { PanelBackButton } from "@/components/panel-back-button";
import { ORDERS_PATH } from "@/lib/constants/business";
import { useTranslation } from "react-i18next";

export function BusinessOverviewBackButton() {
  const { t } = useTranslation("business");
  return <PanelBackButton to={ORDERS_PATH} label={t("overview.back")} />;
}
