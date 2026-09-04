import { LanguageSwitcher } from "@/components/language-switcher";
import { PrimaryColorPicker } from "@/components/primary-color-picker";
import { ScannerLayoutToggle } from "@/components/scanner-layout-toggle";
import { BillingSettings } from "@/features/billing/components/billing-settings";
import { DiscordBotSettings } from "@/features/companies/components/discord-bot-settings";
import { LocalAuditLog } from "@/features/companies/components/local-audit-log";
import { LocalOrgInvites } from "@/features/companies/components/local-org-invites";
import { OrgSettings } from "@/features/companies/components/org-settings";
import { GameCoverageList } from "@/features/games/components/game-coverage-list";
import { DiscordNotificationSettings } from "@/features/notifications/components/discord-notification-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

export default function SettingsPage() {
  const { t } = useTranslation("settings");
  const { t: tGames } = useTranslation("games");
  const { t: tBilling } = useTranslation("billing");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const billingResult = searchParams.get("billing");
    if (!billingResult) return;
    if (billingResult === "success") {
      toast.success(tBilling("checkoutSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["billing", activeOrg?.id] });
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
      <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-4 ">
        <div>
          <h1 className="text-lg font-semibold font-heading">{t("title")}</h1>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        {AUTH_PROVIDER !== "local" && (
          <div className="rounded-lg border p-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold font-heading">
              {t("organizations.heading")}
            </h2>
            <OrgSettings />
          </div>
        )}
        {AUTH_PROVIDER !== "local" && (
          <div className="rounded-lg border p-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold font-heading">
              {t("billing.heading")}
            </h2>
            <BillingSettings />
          </div>
        )}
        {AUTH_PROVIDER === "local" && (
          <div className="rounded-lg border p-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold font-heading">
              {t("invites.heading")}
            </h2>
            <LocalOrgInvites />
          </div>
        )}
        {AUTH_PROVIDER === "local" && (
          <div className="rounded-lg border p-4 flex flex-col gap-4">
            <h2 className="text-sm font-semibold font-heading">
              {t("auditLog.heading")}
            </h2>
            <LocalAuditLog />
          </div>
        )}
        <div className="rounded-lg border p-4 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold font-heading">
              {t("appearance.heading")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("appearance.description")}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium">
              {t("appearance.primaryColor")}
            </p>
            <PrimaryColorPicker />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium">
              {t("appearance.scannerLayout")}
            </p>
            <ScannerLayoutToggle />
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium">{t("appearance.language")}</p>
            <LanguageSwitcher />
          </div>
        </div>
        <div className="rounded-lg border p-4 flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold font-heading">
              {tGames("gameCoverage.heading")}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {tGames("gameCoverage.description")}
            </p>
          </div>
          <GameCoverageList />
        </div>
        <div className="rounded-lg border p-4 flex flex-col gap-4">
          <DiscordBotSettings />
        </div>
        <div className="rounded-lg border p-4 flex flex-col gap-4">
          <h2 className="text-sm font-semibold font-heading">
            {t("notifications.heading")}
          </h2>
          <DiscordNotificationSettings />
        </div>
      </div>
    </div>
  );
}
