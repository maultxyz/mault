import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import { MobilePageHeader } from "@/components/mobile-page-header";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { ApiKeysManager } from "@/features/account/components/api-keys-manager";
import { ChangeEmailForm } from "@/features/account/components/change-email-form";
import { ChangePasswordForm } from "@/features/account/components/change-password-form";
import { SessionsList } from "@/features/account/components/sessions-list";
import { UpdateNameForm } from "@/features/account/components/update-name-form";
import { useOnboarding } from "@/features/onboarding/api/use-onboarding";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useAuthSession } from "@/lib/auth";
import { useTranslation } from "react-i18next";
import { AUTH_PROVIDER } from "@/lib/constants/auth";

function LocalAccountSummary() {
  const { t } = useTranslation("account");
  const { data } = useAuthSession();

  return (
    <SettingsSection heading={t("profile.heading")}>
      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-foreground/70">{t("email.heading")}</dt>
          <dd className="font-medium">{data?.user?.email}</dd>
        </div>
        {data?.user?.name && (
          <div className="flex justify-between gap-4">
            <dt className="text-foreground/70">{t("profile.heading")}</dt>
            <dd className="font-medium">{data.user.name}</dd>
          </div>
        )}
      </dl>
    </SettingsSection>
  );
}

export default function AccountPage() {
  const { t } = useTranslation("account");
  const { startTour } = useOnboarding();
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {isMobile && (
        <MobilePageHeader title={t("title")} subtitle={t("subtitle")} />
      )}
      <div
        className={cn(
          "min-h-0 flex-1 w-full overflow-y-auto",
          MOBILE_NAV_SCROLL_PADDING_CLASS,
        )}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-3 md:p-6">
          {!isMobile && (
            <div>
              <h1 className="font-heading text-lg font-semibold">
                {t("title")}
              </h1>
              <p className="text-sm text-foreground/70">{t("subtitle")}</p>
            </div>
          )}

          <SettingsSections>
            {AUTH_PROVIDER === "local" ? (
              <>
                <LocalAccountSummary />
                <SettingsSection heading={t("apiKeys.heading")}>
                  <ApiKeysManager />
                </SettingsSection>
              </>
            ) : (
              <>
                <SettingsSection heading={t("profile.heading")}>
                  <UpdateNameForm />
                </SettingsSection>
                <SettingsSection heading={t("email.heading")}>
                  <ChangeEmailForm />
                </SettingsSection>
                <SettingsSection heading={t("password.heading")}>
                  <ChangePasswordForm />
                </SettingsSection>
                <SettingsSection heading={t("sessions.heading")}>
                  <SessionsList />
                </SettingsSection>
              </>
            )}

            {!isMobile && (
              <SettingsSection
                heading={t("tour.heading")}
                description={t("tour.description")}
                action={
                  <Button variant="outline" onClick={startTour}>
                    {t("tour.restartButton")}
                  </Button>
                }
              />
            )}
          </SettingsSections>
        </div>
      </div>
    </div>
  );
}
