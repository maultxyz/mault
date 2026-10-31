import { PlanNotice } from "@/components/plan-notice";
import { useTranslation } from "react-i18next";

export function BusinessUpgradeCallout() {
  const { t } = useTranslation("business");
  return (
    <PlanNotice
      message={t("upgrade.locked")}
      linkLabel={t("upgrade.link")}
      className="shrink-0"
    />
  );
}
