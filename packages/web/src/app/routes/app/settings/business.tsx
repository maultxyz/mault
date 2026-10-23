import { Callout } from "@/components/callout";
import { SaveBar } from "@/components/save-bar";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useBusinessSettingsDraft } from "@/features/business/api/use-business-settings-draft";
import { BusinessPermissionsSettings } from "@/features/business/components/business-permissions-settings";
import { BuylistSettings } from "@/features/business/components/buylist-settings";
import { useTranslation } from "react-i18next";

export default function SettingsBusinessPage() {
  const { t } = useTranslation("business");
  const draft = useBusinessSettingsDraft();
  const disabled = draft.isLoading || draft.isSaving || !draft.canManage;

  return (
    <SettingsSections>
      {!draft.isLoading && !draft.canManage && (
        <Callout variant="info">{t("settings.managersOnly")}</Callout>
      )}
      <SettingsSection
        heading={t("settings.buylist.heading")}
        description={t("settings.buylist.description")}
      >
        <BuylistSettings control={draft.control} disabled={disabled} />
      </SettingsSection>
      <SettingsSection
        heading={t("settings.permissions.heading")}
        description={t("settings.permissions.description")}
      >
        <BusinessPermissionsSettings
          control={draft.control}
          disabled={disabled}
        />
      </SettingsSection>
      <SaveBar
        show={draft.isDirty}
        isSaving={draft.isSaving}
        onSave={draft.save}
        onDiscard={draft.discard}
      />
      <UnsavedChangesGuard isDirty={draft.isDirty} onDiscard={draft.discard} />
    </SettingsSections>
  );
}
