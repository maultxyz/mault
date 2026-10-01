import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { LocalAuditLog } from "@/features/companies/components/local-audit-log";
import { LocalOrgInvites } from "@/features/companies/components/local-org-invites";
import { LocalOrgSettings } from "@/features/companies/components/local-org-settings";
import { OrgSettings } from "@/features/companies/components/org-settings";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { useTranslation } from "react-i18next";

export default function SettingsOrganizationPage() {
  const { t } = useTranslation("settings");

  if (AUTH_PROVIDER !== "local") {
    return (
      <SettingsSections>
        <SettingsSection heading={t("organizations.heading")}>
          <OrgSettings />
        </SettingsSection>
      </SettingsSections>
    );
  }

  return (
    <SettingsSections>
      <SettingsSection heading={t("invites.heading")}>
        <LocalOrgInvites />
      </SettingsSection>
      <LocalOrgSettings />
      <SettingsSection heading={t("auditLog.heading")}>
        <LocalAuditLog />
      </SettingsSection>
    </SettingsSections>
  );
}
