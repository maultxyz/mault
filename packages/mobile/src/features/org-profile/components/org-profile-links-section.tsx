import { useState } from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  ORG_PROFILE_LINK_KINDS,
  ORG_PROFILE_LINK_LABEL_MAX_LENGTH,
  ORG_PROFILE_LINK_URL_MAX_LENGTH,
  ORG_PROFILE_LINKS_MAX,
  type OrgProfileLinkKind,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { ReorderButtons } from "@/features/org-profile/components/reorder-buttons";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { OrgProfileSectionProps } from "@/lib/interfaces/org-profile";

export function OrgProfileLinksSection({ control, disabled }: OrgProfileSectionProps) {
  const { t } = useTranslation();
  const links = useFieldArray({ control, name: "links" });
  const watchedLinks = useWatch({ control, name: "links" });
  const [kindPickerIndex, setKindPickerIndex] = useState<number | null>(null);
  const pickedLink = kindPickerIndex !== null ? (watchedLinks[kindPickerIndex] ?? null) : null;
  const kindLabel = (kind: OrgProfileLinkKind) => t(`settings.orgProfile.linkKinds.${kind}`);
  const canAdd = !disabled && links.fields.length < ORG_PROFILE_LINKS_MAX;

  return (
    <SettingsSection
      title={t("settings.orgProfile.links.heading")}
      description={t("settings.orgProfile.links.description", { max: ORG_PROFILE_LINKS_MAX })}
    >
      {links.fields.length === 0 ? (
        <AppText size="xs" tone="secondary">
          {t("settings.orgProfile.links.empty")}
        </AppText>
      ) : null}
      {links.fields.map((link, index) => {
        const itemLabel = t("settings.orgProfile.links.itemLabel", { number: index + 1 });
        return (
          <Surface key={link.id} style={{ gap: SPACING.sm }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
              <AppText weight="medium" style={{ flex: 1 }}>
                {itemLabel}
              </AppText>
              <ReorderButtons
                itemLabel={itemLabel}
                isFirst={index === 0}
                isLast={index === links.fields.length - 1}
                disabled={disabled}
                onMoveUp={() => links.move(index, index - 1)}
                onMoveDown={() => links.move(index, index + 1)}
                onRemove={() => links.remove(index)}
              />
            </View>
            <Controller
              control={control}
              name={`links.${index}.kind`}
              render={({ field }) => (
                <SelectField
                  label={t("settings.orgProfile.links.kindLabel")}
                  value={kindLabel(field.value)}
                  placeholder={t("settings.orgProfile.links.kindLabel")}
                  disabled={disabled}
                  onPress={() => setKindPickerIndex(index)}
                />
              )}
            />
            <Controller
              control={control}
              name={`links.${index}.url`}
              render={({ field, fieldState }) => (
                <TextField
                  label={t("settings.orgProfile.links.urlLabel")}
                  placeholder={t("settings.orgProfile.links.urlPlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  keyboardType="url"
                  autoCapitalize="none"
                  autoComplete="off"
                  maxLength={ORG_PROFILE_LINK_URL_MAX_LENGTH}
                  editable={!disabled}
                  returnKeyType="next"
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={control}
              name={`links.${index}.label`}
              render={({ field, fieldState }) => (
                <TextField
                  label={t("settings.orgProfile.links.labelLabel")}
                  placeholder={t("settings.orgProfile.links.labelPlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  maxLength={ORG_PROFILE_LINK_LABEL_MAX_LENGTH}
                  editable={!disabled}
                  returnKeyType="done"
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
          </Surface>
        );
      })}
      {!disabled ? (
        <ListGroup>
          <ListRow
            icon="plus"
            title={t("settings.orgProfile.links.add")}
            subtitle={canAdd ? undefined : t("settings.orgProfile.links.limitReached", { max: ORG_PROFILE_LINKS_MAX })}
            disabled={!canAdd}
            onPress={() => links.append({ kind: ORG_PROFILE_LINK_KINDS[0], url: "", label: "" })}
          />
        </ListGroup>
      ) : null}
      <OptionSheet
        visible={kindPickerIndex !== null}
        title={t("settings.orgProfile.links.kindLabel")}
        options={ORG_PROFILE_LINK_KINDS.map((kind) => ({ value: kind, label: kindLabel(kind) }))}
        selected={pickedLink ? [pickedLink.kind] : []}
        onSelect={(kind) => {
          if (kindPickerIndex !== null && pickedLink) {
            links.update(kindPickerIndex, { ...pickedLink, kind: kind as OrgProfileLinkKind });
          }
          setKindPickerIndex(null);
        }}
        onClose={() => setKindPickerIndex(null)}
      />
    </SettingsSection>
  );
}
