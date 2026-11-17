import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  planConfigQueryOptions,
  savePricingMode,
} from "@/features/admin/api/plans";
import { billingKeys } from "@/features/billing/api/billing";
import { requestWithToasts } from "@/lib/request-with-toasts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function PricingModeSection() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const { data } = useQuery(planConfigQueryOptions);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!data) return null;

  const isLegacyPricingActive = data.isLegacyPricingActive;
  const modeKey = isLegacyPricingActive ? "legacy" : "tiered";

  const switchMode = async () => {
    setIsSaving(true);
    await requestWithToasts(() => savePricingMode(!isLegacyPricingActive), {
      successMessage: t("plans.pricingMode.saved"),
      failureMessage: t("plans.pricingMode.saveFailed"),
      onSuccess: (saved) => {
        queryClient.setQueryData(planConfigQueryOptions.queryKey, saved);
        void queryClient.invalidateQueries({ queryKey: billingKeys.root() });
        setIsConfirmOpen(false);
      },
    });
    setIsSaving(false);
  };

  return (
    <SettingsSection
      heading={t("plans.pricingMode.heading")}
      description={t(`plans.pricingMode.${modeKey}.description`)}
      action={
        <Button variant="outline" onClick={() => setIsConfirmOpen(true)}>
          {t(`plans.pricingMode.${modeKey}.switch`)}
        </Button>
      }
    >
      <div>
        <Badge variant={isLegacyPricingActive ? "warning" : "success"}>
          {t(`plans.pricingMode.${modeKey}.badge`)}
        </Badge>
      </div>
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t(`plans.pricingMode.${modeKey}.confirmTitle`)}
            </DialogTitle>
            <DialogDescription>
              {t(`plans.pricingMode.${modeKey}.confirmDescription`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
              {t("plans.pricingMode.cancel")}
            </Button>
            <Button disabled={isSaving} onClick={() => void switchMode()}>
              {t(`plans.pricingMode.${modeKey}.switch`)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsSection>
  );
}
