import { Callout } from "@/components/callout";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import type { PlanNoticeProps } from "@/lib/interfaces/billing";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function PlanNotice({
  message,
  linkLabel,
  onLinkClick,
  className,
}: PlanNoticeProps) {
  const { t } = useTranslation("common");

  return (
    <Callout variant="info" className={className}>
      {message}{" "}
      <Link
        to={SETTINGS_PATHS.billing}
        onClick={onLinkClick}
        className="font-medium text-foreground underline underline-offset-4"
      >
        {linkLabel ?? t("planLock.link")}
      </Link>
    </Callout>
  );
}
