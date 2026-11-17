import { Progress } from "@/components/ui/progress";
import { FooterDivider } from "@/components/status-footer";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBilling } from "@/features/billing/api/use-billing";
import { billingPlanNameKey } from "@/features/billing/lib/billing-plan-name";
import { dailyScanLimitResetCountdown } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { SETTINGS_PATHS } from "@/lib/constants/settings";

function DailyScanLimitResetCountdown() {
  const { t } = useTranslation("billing");
  const { hours, minutes } = dailyScanLimitResetCountdown(new Date());
  return (
    <span className="block">
      {hours > 0
        ? t("planFooterTooltip.resetsInHours", { hours, minutes })
        : t("planFooterTooltip.resetsInMinutes", { minutes })}
    </span>
  );
}

export function PlanBadge() {
  const { t } = useTranslation("billing");
  const navigate = useNavigate();
  const { billing, isLoading } = useBilling();

  if (isLoading || !billing || billing.dailyLimit == null) return null;

  const isPaid = billing.plan !== "free";
  const planName = t(`plan.${billingPlanNameKey(billing)}`);
  const dailyLimit = billing.dailyLimit;
  const used = billing.cardsScannedToday;
  const usagePercent = Math.min(100, Math.round((used / dailyLimit) * 100));
  const tooltip = t(
    isPaid ? "planFooterTooltip.paidLimited" : "planFooterTooltip.free",
    { plan: planName, used, limit: dailyLimit },
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          onClick={() => navigate(SETTINGS_PATHS.billing)}
          className="flex items-center gap-1.5 cursor-pointer"
        >
          <span className="text-xs text-foreground/70">{t("plan.label")}</span>
          <span
            className={
              isPaid
                ? "text-xs font-semibold"
                : "text-xs text-foreground/70"
            }
          >
            {planName}
          </span>
          <div className="flex items-center gap-1.5">
            <Progress decorative value={usagePercent} className="w-14" />
            <span className="text-xs tabular-nums text-foreground/70">
              {t("plan.scansToday", { used, limit: dailyLimit })}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className="block">{tooltip}</span>
          {!isPaid && <DailyScanLimitResetCountdown />}
        </TooltipContent>
      </Tooltip>
      <FooterDivider />
    </>
  );
}
