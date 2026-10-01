import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PriceSourceToggle } from "@/components/price-source-toggle";
import { PrimaryColorPicker } from "@/components/primary-color-picker";
import { ScannerLayoutToggle } from "@/components/scanner-layout-toggle";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { SessionWrappedToggle } from "@/components/session-wrapped-toggle";
import { OcrToggle } from "@/features/scanner/components/ocr-toggle";
import { BillingSettings } from "@/features/billing/components/billing-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { LocalAuditLog } from "@/features/companies/components/local-audit-log";
import { LocalOrgInvites } from "@/features/companies/components/local-org-invites";
import { LocalOrgSettings } from "@/features/companies/components/local-org-settings";
import { OrgSettings } from "@/features/companies/components/org-settings";
import { Button } from "@/components/ui/button";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "@/lib/toast";

export default function SettingsPage() {
  const { t } = useTranslation("settings");
  const { t: tBilling } = useTranslation("billing");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const billingResult = searchParams.get("billing");
    if (!billingResult) return;
    if (billingResult === "success") {
      toast.success(tBilling("checkoutSuccess"));
      void queryClient.invalidateQueries({
        queryKey: ["billing", activeOrg?.id],
      });
    }
    setSearchParams(
      (prev) => {
        prev.delete("billing");
        return prev;
      },
      { replace: true },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="overflow-y-auto h-full w-full">
      <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-6">
        <div>
          <h1 className="text-lg font-semibold font-heading">{t("title")}</h1>
          <p className="text-sm text-foreground/70">{t("subtitle")}</p>
        </div>
        <SettingsSections>
          {AUTH_PROVIDER !== "local" && (
            <SettingsSection heading={t("organizations.heading")}>
              <OrgSettings />
            </SettingsSection>
          )}
          {AUTH_PROVIDER !== "local" && (
            <SettingsSection heading={t("billing.heading")}>
              <BillingSettings />
            </SettingsSection>
          )}
          {AUTH_PROVIDER === "local" && (
            <SettingsSection heading={t("invites.heading")}>
              <LocalOrgInvites />
            </SettingsSection>
          )}
          {AUTH_PROVIDER === "local" && <LocalOrgSettings />}
          {AUTH_PROVIDER === "local" && (
            <SettingsSection heading={t("auditLog.heading")}>
              <LocalAuditLog />
            </SettingsSection>
          )}
          <SettingsSection
            heading={t("appearance.heading")}
            description={t("appearance.description")}
          >
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">
                {t("appearance.primaryColor")}
              </p>
              <PrimaryColorPicker />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">
                {t("appearance.scannerLayout")}
              </p>
              <ScannerLayoutToggle />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">{t("appearance.language")}</p>
              <LanguageSwitcher />
            </div>
          </SettingsSection>
          <SettingsSection
            heading={t("pricing.heading")}
            description={t("pricing.description")}
          >
            <PriceSourceToggle />
          </SettingsSection>
          <SettingsSection
            heading={t("sessionWrapped.heading")}
            description={t("sessionWrapped.description")}
          >
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">{t("sessionWrapped.toggleLabel")}</span>
              <SessionWrappedToggle />
            </label>
          </SettingsSection>
          <SettingsSection
            heading={t("ocr.heading")}
            badge={<Badge variant="outline">{t("ocr.badge")}</Badge>}
            description={t("ocr.description")}
          >
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm">{t("ocr.toggleLabel")}</span>
              <OcrToggle />
            </label>
          </SettingsSection>
          <SettingsSection
            heading={t("integrations.heading")}
            description={t("integrations.description")}
            action={
              <Button variant="outline" render={<Link to="/app/integrations" />}>
                {t("integrations.open")}
              </Button>
            }
          />
        </SettingsSections>
      </div>
    </div>
  );
}
