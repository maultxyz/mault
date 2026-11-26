import { Callout } from "@/components/callout";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SaveBar } from "@/components/save-bar";
import { SettingsSections } from "@/components/settings-section";
import { SettingsSectionsSkeleton } from "@/components/settings-section-skeleton";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useOrgProfileDraft } from "@/features/org-profile/api/use-org-profile-draft";
import { OrgProfileDetailsSection } from "@/features/org-profile/components/org-profile-details-section";
import { OrgProfileLinkSection } from "@/features/org-profile/components/org-profile-link-section";
import { OrgProfileLinksSection } from "@/features/org-profile/components/org-profile-links-section";
import { OrgProfileShopCatalogsSection } from "@/features/org-profile/components/org-profile-shop-catalogs-section";
import { OrgProfileShowcaseSection } from "@/features/org-profile/components/org-profile-showcase-section";
import { OrgProfileSwitchSection } from "@/features/org-profile/components/org-profile-switch-section";
import { ORG_PROFILE_SETTINGS_SKELETON_SECTIONS } from "@/lib/constants/org-profile";
import { useTranslation } from "react-i18next";

export default function SettingsProfilePage() {
  const { t } = useTranslation("org-profile");
  const draft = useOrgProfileDraft();

  if (draft.isError) {
    return (
      <LoadErrorCallout message={t("errors.loadFailed")} onRetry={() => void draft.refetch()} />
    );
  }

  if (draft.isLoading || !draft.settings) {
    return <SettingsSectionsSkeleton sections={ORG_PROFILE_SETTINGS_SKELETON_SECTIONS} />;
  }

  const disabled = draft.isSaving || !draft.canEdit;
  const editor = { form: draft.form, control: draft.control, disabled };

  return (
    <SettingsSections>
      {!draft.canEdit && <Callout variant="info">{t("managersOnly")}</Callout>}
      <OrgProfileSwitchSection
        control={draft.control}
        disabled={disabled}
        name="isPublished"
        heading={t("published.heading")}
        label={t("published.label")}
        description={t("published.description")}
      />
      <OrgProfileLinkSection
        {...editor}
        savedHandle={draft.profile?.handle ?? null}
        isSavedPublished={draft.profile?.isPublished ?? false}
        shortUrl={draft.profile?.shortUrl ?? null}
      />
      <OrgProfileDetailsSection {...editor} />
      <OrgProfileLinksSection {...editor} />
      <OrgProfileShopCatalogsSection {...editor} choices={draft.settings.shopCatalogChoices} />
      <OrgProfileShowcaseSection
        {...editor}
        cardsById={draft.cardsById}
        onCardsPicked={draft.addPickedCards}
      />
      <OrgProfileSwitchSection
        control={draft.control}
        disabled={disabled}
        name="showsPrices"
        heading={t("prices.heading")}
        label={t("prices.label")}
        description={t("prices.description")}
      />
      {draft.canEdit && (
        <SaveBar
          show={draft.isDirty}
          isSaving={draft.isSaving}
          onSave={draft.save}
          onDiscard={draft.discard}
        />
      )}
      <UnsavedChangesGuard isDirty={draft.canEdit && draft.isDirty} onDiscard={draft.discard} />
    </SettingsSections>
  );
}
