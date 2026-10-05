import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function StorageUpgradeNote() {
  const { t } = useTranslation("storage");
  return (
    <>
      {t("upgrade.businessOnly")}{" "}
      <Link
        to={SETTINGS_PATHS.billing}
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        {t("upgrade.link")}
      </Link>
    </>
  );
}
