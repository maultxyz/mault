import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { CARD_CONDITIONS, CONDITION_MULTIPLIER_MAX, PRICE_SOURCE_FIELDS, PRICE_SOURCES } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Callout } from "@/components/ui/callout";
import { Input } from "@/components/ui/input";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { useBusinessSettingsDraft } from "@/features/business/api/use-business-settings-draft";
import { BuylistSettings } from "@/features/business/components/buylist-settings";
import { SellPriceSettings } from "@/features/business/components/sell-price-settings";
import { useOrgSettingsDraft } from "@/features/settings/api/use-org-settings-draft";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { CONDITION_MULTIPLIER_INPUT_WIDTH } from "@/lib/constants/settings";
import { SPACING } from "@/lib/constants/theme";

export default function PricingSettingsScreen() {
  const { t } = useTranslation();
  const draft = useOrgSettingsDraft();
  const businessDraft = useBusinessSettingsDraft();
  const isSaving = draft.isSaving || businessDraft.isSaving;
  const disabled = draft.isLoading || isSaving || !draft.canManageOrgSettings;
  const businessDisabled = isSaving || !businessDraft.canManage;
  return (
    <SettingsPage
      title={t("settings.sections.pricing.title")}
      isLoading={draft.isLoading || businessDraft.isLoading}
      isLoadError={draft.isLoadError || businessDraft.isLoadError}
      isRetryingLoad={draft.isRetryingLoad || businessDraft.isRetryingLoad}
      onRetryLoad={() => {
        if (draft.isLoadError) draft.retryLoad();
        if (businessDraft.isLoadError) businessDraft.retryLoad();
      }}
      isDirty={draft.isDirty || businessDraft.isDirty}
      isSaving={isSaving}
      saveError={draft.saveError || businessDraft.saveError}
      onSave={() => {
        if (draft.isDirty) draft.save();
        if (businessDraft.isDirty) businessDraft.save();
      }}
      onDiscard={() => {
        draft.discard();
        businessDraft.discard();
      }}
    >
      <SettingsSection title={t("settings.pricing.heading")} description={t("settings.pricing.description")}>
        {!draft.isLoading && !draft.canManageOrgSettings ? (
          <Callout tone="info" title={t("settings.business.managersOnly")} />
        ) : null}
        <Controller
          control={draft.control}
          name="priceSource"
          render={({ field }) => (
            <ListGroup>
              {PRICE_SOURCES.map((source) => (
                <ListRow
                  key={source}
                  title={t(`settings.pricing.sources.${source}`)}
                  value={PRICE_SOURCE_FIELDS[source].currency}
                  selected={field.value === source}
                  disabled={disabled}
                  onPress={() => field.onChange(source)}
                />
              ))}
            </ListGroup>
          )}
        />
      </SettingsSection>
      <SettingsSection title={t("settings.conditionPricing.heading")} description={t("settings.conditionPricing.description")}>
        <Controller
          control={draft.control}
          name="conditionMultipliers"
          render={({ field }) => (
            <ListGroup>
              {CARD_CONDITIONS.map((condition) => (
                <ListRow
                  key={condition}
                  title={t(`settings.conditions.${condition}`)}
                  rightIsInteractive
                  right={
                    <View style={{ width: CONDITION_MULTIPLIER_INPUT_WIDTH, flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
                      <Input
                        accessibilityLabel={t(`settings.conditions.${condition}`)}
                        keyboardType="number-pad"
                        maxLength={3}
                        editable={!disabled && condition !== "NM"}
                        value={String(field.value[condition])}
                        onChangeText={(text) => {
                          const value = Math.min(CONDITION_MULTIPLIER_MAX, Number(text.replace(/\D/g, "") || 0));
                          field.onChange({ ...field.value, [condition]: value });
                        }}
                      />
                      <AppText tone="secondary">{t("settings.percentSuffix")}</AppText>
                    </View>
                  }
                />
              ))}
            </ListGroup>
          )}
        />
        <AppText size="xs" tone="secondary">
          {t("settings.conditionPricing.baseNote")}
        </AppText>
      </SettingsSection>
      {businessDraft.hasBusinessTools ? (
        <>
          {!businessDraft.canManage ? <Callout tone="info" title={t("settings.pricing.businessManagersOnly")} /> : null}
          <SellPriceSettings control={businessDraft.control} disabled={businessDisabled} />
          <BuylistSettings control={businessDraft.control} disabled={businessDisabled} />
        </>
      ) : null}
    </SettingsPage>
  );
}
