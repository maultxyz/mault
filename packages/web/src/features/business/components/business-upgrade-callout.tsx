import { Callout } from "@/components/callout";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function BusinessUpgradeCallout() {
  const { t } = useTranslation("business");
  return (
    <Callout variant="info" className="shrink-0">
      {t("upgrade.locked")}{" "}
      <Link
        to={SETTINGS_PATHS.billing}
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        {t("upgrade.link")}
      </Link>
    </Callout>
  );
}
