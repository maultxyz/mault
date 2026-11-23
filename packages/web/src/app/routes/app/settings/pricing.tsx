import { ManagersOnlyNote } from "@/components/managers-only-note";
import { Callout } from "@/components/callout";
import { ConditionMultipliersSetting } from "@/components/condition-multipliers-setting";
import { PriceSourceToggle } from "@/components/price-source-toggle";
import { SaveBar } from "@/components/save-bar";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { Skeleton } from "@/components/ui/skeleton";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useBusinessSettingsDraft } from "@/features/business/api/use-business-settings-draft";
import { useHasBusinessTools } from "@/features/business/api/use-has-business-tools";
import { BuylistSettings } from "@/features/business/components/buylist-settings";
import { SellPriceSettings } from "@/features/business/components/sell-price-settings";
import { useOrgSettingsDraft } from "@/features/companies/api/use-org-settings-draft";
import type { MarketPricingSectionsProps } from "@/lib/interfaces/settings";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

function MarketPricingSections({ draft }: MarketPricingSectionsProps) {
  const { t } = useTranslation("settings");
  const disabled = draft.isLoading || draft.isSaving;

  return (
    <>
      <SettingsSection
        heading={t("pricing.heading")}
        description={t("pricing.description")}
      >
        {!draft.isLoading && !draft.canManageOrgSettings && <ManagersOnlyNote />}
        {draft.isLoading ? (
          <div className="flex gap-2">
            <Skeleton className="h-14 w-36 rounded-lg" />
            <Skeleton className="h-14 w-36 rounded-lg" />
          </div>
        ) : (
          <Controller
            control={draft.control}
            name="priceSource"
            render={({ field }) => (
              <PriceSourceToggle
                value={field.value}
                disabled={!draft.canManageOrgSettings}
                onChange={field.onChange}
              />
            )}
          />
        )}
      </SettingsSection>
      <SettingsSection
        heading={t("conditionPricing.heading")}
        description={t("conditionPricing.description")}
      >
        {draft.isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <Controller
            control={draft.control}
            name="conditionMultipliers"
            render={({ field, fieldState }) => (
              <ConditionMultipliersSetting
                value={field.value}
                disabled={disabled || !draft.canManageOrgSettings}
                errors={[fieldState.error]}
                onChange={field.onChange}
              />
            )}
          />
        )}
      </SettingsSection>
    </>
  );
}

function PricingSettingsWithBusiness() {
  const { t } = useTranslation("business");
  const orgDraft = useOrgSettingsDraft();
  const businessDraft = useBusinessSettingsDraft();
  const businessDisabled =
    businessDraft.isLoading || businessDraft.isSaving || !businessDraft.canManage;
  const isDirty = orgDraft.isDirty || businessDraft.isDirty;
  const save = () => {
    if (orgDraft.isDirty) orgDraft.save();
    if (businessDraft.isDirty) businessDraft.save();
  };
  const discard = () => {
    orgDraft.discard();
    businessDraft.discard();
  };

  return (
    <SettingsSections>
      <MarketPricingSections draft={orgDraft} />
      {!businessDraft.isLoading && !businessDraft.canManage && (
        <Callout variant="info">{t("settings.managersOnly")}</Callout>
      )}
      <SettingsSection
        heading={t("settings.sell.heading")}
        description={t("settings.sell.description")}
      >
        <SellPriceSettings control={businessDraft.control} disabled={businessDisabled} />
      </SettingsSection>
      <SettingsSection
        heading={t("settings.buylist.heading")}
        description={t("settings.buylist.description")}
      >
        <BuylistSettings control={businessDraft.control} disabled={businessDisabled} />
      </SettingsSection>
      <SaveBar
        show={isDirty}
        isSaving={orgDraft.isSaving || businessDraft.isSaving}
        onSave={save}
        onDiscard={discard}
      />
      <UnsavedChangesGuard isDirty={isDirty} onDiscard={discard} />
    </SettingsSections>
  );
}

function PricingSettings() {
  const draft = useOrgSettingsDraft();

  return (
    <SettingsSections>
      <MarketPricingSections draft={draft} />
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

export default function SettingsPricingPage() {
  const hasBusinessTools = useHasBusinessTools();
  return hasBusinessTools ? <PricingSettingsWithBusiness /> : <PricingSettings />;
}
