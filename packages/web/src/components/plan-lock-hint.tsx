import { SETTINGS_PATHS } from "@/lib/constants/settings";
import type { PlanLockHintProps } from "@/lib/interfaces/billing";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function PlanLockHint({ message }: PlanLockHintProps) {
  const { t } = useTranslation("common");

  return (
    <p className="pl-1 text-xs text-foreground/70">
      {message}{" "}
      <Link
        to={SETTINGS_PATHS.billing}
        className="font-medium text-foreground underline-offset-4 hover:underline"
      >
        {t("planLock.link")}
      </Link>
    </p>
  );
}
