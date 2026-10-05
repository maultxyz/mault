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
  const dailyLimit = billing.dailyLimit;
  const used = billing.cardsScannedToday;
  const usagePercent = dailyLimit
    ? Math.min(100, Math.round((used / dailyLimit) * 100))
    : 100;

  const tooltip =
    dailyLimit == null
      ? t(
          isBusiness
            ? "planFooterTooltip.business"
            : "planFooterTooltip.freeUnlimited",
        )
      : t(
          isBusiness
            ? "planFooterTooltip.businessLimited"
            : "planFooterTooltip.free",
          {
            used,
            limit: dailyLimit,
          },
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
              isBusiness
                ? "text-xs font-semibold"
                : "text-xs text-foreground/70"
            }
          >
            {t(isBusiness ? "plan.business" : "plan.free")}
          </span>
          {dailyLimit != null && (
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <span className="text-xs tabular-nums text-foreground/70">
                {t("plan.scansToday", { used, limit: dailyLimit })}
              </span>
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{tooltip}</TooltipContent>
      </Tooltip>
      <FooterDivider />
    </>
  );
}
