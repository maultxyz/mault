import { Callout } from "@/components/callout";
import { useTranslation } from "react-i18next";

export function ManagersOnlyNote() {
  const { t } = useTranslation("common");
  return <Callout variant="info">{t("managersOnlySetting")}</Callout>;
}
