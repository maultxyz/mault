import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { SwitchRow } from "@/components/ui/switch-row";
import { useOrgProfileDraft } from "@/features/org-profile/api/use-org-profile-draft";
import { OrgProfileDetailsSection } from "@/features/org-profile/components/org-profile-details-section";
import { OrgProfileLinkSection } from "@/features/org-profile/components/org-profile-link-section";
import { OrgProfileLinksSection } from "@/features/org-profile/components/org-profile-links-section";
import { OrgProfileShopCatalogsSection } from "@/features/org-profile/components/org-profile-shop-catalogs-section";
import { OrgProfileShowcaseSection } from "@/features/org-profile/components/org-profile-showcase-section";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { SettingsSection } from "@/features/settings/components/settings-section";

export default function ProfilePageSettingsScreen() {
  const { t } = useTranslation();
  const draft = useOrgProfileDraft();
  const disabled = draft.isSaving || !draft.canEdit;

  return (
    <SettingsPage
      title={t("settings.sections.profilePage.title")}
      isLoading={draft.isLoading}
      isLoadError={draft.isLoadError}
      isRetryingLoad={draft.isRetryingLoad}
      onRetryLoad={draft.retryLoad}
      onRefresh={draft.refresh}
      isDirty={draft.isDirty}
      isSaveBarVisible={draft.canEdit && draft.isDirty}
      isSaving={draft.isSaving}
      saveError={draft.saveError}
      onSave={draft.save}
      onDiscard={draft.discard}
    >
      <AppText size="sm" tone="secondary">
        {t("settings.orgProfile.description")}
      </AppText>
      {!draft.canEdit ? <Callout tone="info" title={t("settings.orgProfile.managersOnly")} /> : null}
      <SettingsSection title={t("settings.orgProfile.published.heading")}>
        <Controller
          control={draft.control}
          name="isPublished"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.orgProfile.published.toggle")}
              description={t("settings.orgProfile.published.description")}
              value={field.value}
              disabled={disabled}
              onValueChange={field.onChange}
            />
          )}
        />
      </SettingsSection>
      <OrgProfileLinkSection control={draft.control} disabled={disabled} savedProfile={draft.savedProfile} />
      <OrgProfileDetailsSection control={draft.control} disabled={disabled} />
      <OrgProfileLinksSection control={draft.control} disabled={disabled} />
      <OrgProfileShopCatalogsSection
        control={draft.control}
        disabled={disabled}
        choices={draft.settings?.shopCatalogChoices ?? []}
      />
      <OrgProfileShowcaseSection
        control={draft.control}
        disabled={disabled}
        cardsById={draft.showcaseCardsById}
        onAddCards={draft.openShowcasePicker}
      />
      <SettingsSection title={t("settings.orgProfile.prices.heading")}>
        <Controller
          control={draft.control}
          name="showsPrices"
          render={({ field }) => (
            <SwitchRow
              title={t("settings.orgProfile.prices.toggle")}
              description={t("settings.orgProfile.prices.description")}
              value={field.value}
              disabled={disabled}
              onValueChange={field.onChange}
            />
          )}
        />
      </SettingsSection>
    </SettingsPage>
  );
}
