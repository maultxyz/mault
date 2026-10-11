import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { BillingSettings } from "@/features/billing/components/billing-settings";
import { SETTINGS_PATHS } from "@/lib/constants/settings";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { AUTH_PROVIDER } from "@/lib/constants/auth";

export default function SettingsBillingPage() {
  const { t } = useTranslation("settings");

  if (AUTH_PROVIDER === "local") {
    return <Navigate to={SETTINGS_PATHS.general} replace />;
  }

  return (
    <SettingsSections>
      <SettingsSection heading={t("billing.heading")}>
        <BillingSettings />
      </SettingsSection>
    </SettingsSections>
  );
}
