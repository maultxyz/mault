import { useBilling } from "@/features/billing/api/use-billing";
import { PLAN_GATED_PATHS } from "@/lib/constants/nav";
import type { PlanLock } from "@/lib/interfaces/nav";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

export function usePlanLockedPath() {
  const { t } = useTranslation("common");
  const { billing } = useBilling();

  const planLockFor = useCallback(
    (path: string): PlanLock | undefined => {
      const gate = PLAN_GATED_PATHS.find((gated) =>
        path.startsWith(gated.pathPrefix),
      );
      if (!gate || billing?.[gate.feature] !== false) return undefined;
      const hasExistingData =
        !!gate.readOnlyWhenCountKey &&
        (billing[gate.readOnlyWhenCountKey] ?? 0) > 0;
      return { tag: t("nav.upgradeYourPlan"), isDisabled: !hasExistingData };
    },
    [billing, t],
  );

  return { planLockFor };
}
