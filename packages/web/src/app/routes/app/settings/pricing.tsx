import { ManagersOnlyNote } from "@/components/managers-only-note";
import { Callout } from "@/components/callout";
import { ConditionMultipliersSetting } from "@/components/condition-multipliers-setting";
import { PriceSourceToggle } from "@/components/price-source-toggle";
import { SaveBar } from "@/components/save-bar";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { SkeletonStatus } from "@/components/skeleton-status";
import { Skeleton } from "@/components/ui/skeleton";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useBusinessSettingsDraft } from "@/features/business/api/use-business-settings-draft";
import { useHasBusinessTools } from "@/features/business/api/use-has-business-tools";
import { BuylistSettings } from "@/features/business/components/buylist-settings";
import {
  BuylistSettingsSkeleton,
  SellPriceSettingsSkeleton,
} from "@/features/business/components/pricing-settings-skeletons";
import { SellPriceSettings } from "@/features/business/components/sell-price-settings";
import { useOrgSettingsDraft } from "@/features/companies/api/use-org-settings-draft";
import type { MarketPricingSectionsProps } from "@/lib/interfaces/settings";
import { CARD_CONDITIONS, PRICE_SOURCES } from "@magic-vault/shared";
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
          <SkeletonStatus className="flex gap-2">
            {PRICE_SOURCES.map((source) => (
              <Skeleton key={source} className="h-14 w-36 rounded-lg" />
            ))}
          </SkeletonStatus>
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
          <div aria-hidden="true" className="flex flex-col gap-2">
            <div className="divide-y rounded-lg border">
              {CARD_CONDITIONS.map((condition) => (
                <div key={condition} className="flex items-center justify-between gap-3 px-3 py-2">
                  <Skeleton className="h-3.5 w-28" />
                  <span className="flex items-center gap-2">
                    <Skeleton className="h-11 w-20 rounded-lg md:h-7" />
                    <Skeleton className="h-3 w-3" />
                  </span>
                </div>
              ))}
            </div>
            <Skeleton className="h-2.5 w-2/3" />
          </div>
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
        {businessDraft.isLoading ? (
          <SkeletonStatus>
            <SellPriceSettingsSkeleton />
          </SkeletonStatus>
        ) : (
          <SellPriceSettings control={businessDraft.control} disabled={businessDisabled} />
        )}
      </SettingsSection>
      <SettingsSection
        heading={t("settings.buylist.heading")}
        description={t("settings.buylist.description")}
      >
        {businessDraft.isLoading ? (
          <BuylistSettingsSkeleton />
        ) : (
          <BuylistSettings control={businessDraft.control} disabled={businessDisabled} />
        )}
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
