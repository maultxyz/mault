import { FooterDivider } from "@/components/status-footer";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBilling } from "@/features/billing/api/use-billing";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function PlanBadge() {
  const { t } = useTranslation("billing");
  const navigate = useNavigate();
  const { billing, isLoading } = useBilling();

  if (isLoading || !billing) return null;

  const isBusiness = billing.plan === "business";

  return (
    <>
      <Tooltip>
        <TooltipTrigger
          onClick={() => navigate("/app/settings")}
          className="cursor-pointer"
        >
          <Badge variant={isBusiness ? "success" : "secondary"}>
            {t(isBusiness ? "plan.business" : "plan.free")}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isBusiness
            ? t("plan.business")
            : t("usage", {
                used: billing.cardsScannedToday,
                limit: billing.dailyLimit,
              })}
        </TooltipContent>
      </Tooltip>
      <FooterDivider />
    </>
  );
}
