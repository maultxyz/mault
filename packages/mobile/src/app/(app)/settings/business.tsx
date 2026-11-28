import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { useBusinessSettingsDraft } from "@/features/business/api/use-business-settings-draft";
import { BusinessPermissionsSettings } from "@/features/business/components/business-permissions-settings";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { useActiveOrgId } from "@/hooks/use-org";

export default function BusinessSettingsScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const draft = useBusinessSettingsDraft();
  const disabled = draft.isSaving || !draft.canManage;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["business", "settings", orgId] });

  return (
    <SettingsPage
      title={t("settings.sections.business.title")}
      isLoading={draft.isLoading}
      isLoadError={draft.isLoadError}
      isRetryingLoad={draft.isRetryingLoad}
      onRetryLoad={draft.retryLoad}
      onRefresh={refresh}
      isDirty={draft.isDirty}
      isSaving={draft.isSaving}
      saveError={draft.saveError}
      onSave={draft.save}
      onDiscard={draft.discard}
    >
      <AppText size="sm" tone="secondary">
        {t("settings.business.description")}
      </AppText>
      {!draft.canManage ? <Callout tone="info" title={t("settings.business.managersOnly")} /> : null}
      <BusinessPermissionsSettings control={draft.control} disabled={disabled} />
    </SettingsPage>
  );
}
