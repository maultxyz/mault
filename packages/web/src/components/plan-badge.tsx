import { FooterDivider } from "@/components/status-footer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBilling } from "@/features/billing/api/use-billing";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { SETTINGS_PATHS } from "@/lib/constants/settings";

export function PlanBadge() {
  const { t } = useTranslation("billing");
  const navigate = useNavigate();
  const { billing, isLoading } = useBilling();

  if (isLoading || !billing) return null;

  const isBusiness = billing.plan === "business";
  const usagePercent = billing.dailyLimit
    ? Math.min(
        100,
        Math.round((billing.cardsScannedToday / billing.dailyLimit) * 100),
      )
    : 0;

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          onClick={() => navigate(SETTINGS_PATHS.billing)}
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <span className="text-xs text-foreground/70">
            {t("plan.label")}
          </span>
          {isBusiness ? (
            <span className="text-xs font-semibold">{t("plan.business")}</span>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-foreground/70">
                {t("plan.free")}
              </span>
              <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">
          {isBusiness
            ? t("planFooterTooltip.business")
            : t("planFooterTooltip.free", {
                used: billing.cardsScannedToday,
                limit: billing.dailyLimit,
              })}
        </TooltipContent>
      </Tooltip>
      <FooterDivider />
    </>
  );
}
