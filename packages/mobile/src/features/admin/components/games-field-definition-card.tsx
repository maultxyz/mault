import { GAME_FIELD_TYPES, GAME_FIELD_TYPES_WITH_OPTIONS } from "@magic-vault/shared";
import { useState } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { TextField } from "@/components/ui/text-field";
import { SPACING } from "@/lib/constants/theme";
import type { GameEditorFormValues, GamesFieldDefinitionCardProps } from "@/lib/interfaces/admin-cards";

export function GamesFieldDefinitionCard({ index, onRemove }: GamesFieldDefinitionCardProps) {
  const { t } = useTranslation();
  const { control } = useFormContext<GameEditorFormValues>();
  const [isTypeSheetOpen, setIsTypeSheetOpen] = useState(false);
  const fieldType = useWatch({ control, name: `fieldDefinitions.${index}.type` });
  const fieldLabel = useWatch({ control, name: `fieldDefinitions.${index}.label` });
  const translateError = (message: string | undefined) => (message ? t(message) : undefined);
  const displayName = fieldLabel.trim() || t("admin.cards.fields.untitled", { position: index + 1 });

  return (
    <Surface style={{ gap: SPACING.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SPACING.sm }}>
        <AppText weight="semibold" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
          {displayName}
        </AppText>
        <IconButton icon="trash" accessibilityLabel={t("admin.cards.fields.removeLabel", { name: displayName })} onPress={onRemove} />
      </View>
      <Controller
        control={control}
        name={`fieldDefinitions.${index}.field`}
        render={({ field, fieldState }) => (
          <TextField
            label={t("admin.cards.fields.keyLabel")}
            placeholder={t("admin.cards.fields.keyPlaceholder")}
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            autoCapitalize="none"
            autoComplete="off"
            error={translateError(fieldState.error?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name={`fieldDefinitions.${index}.label`}
        render={({ field, fieldState }) => (
          <TextField
            label={t("admin.cards.fields.labelLabel")}
            placeholder={t("admin.cards.fields.labelPlaceholder")}
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            error={translateError(fieldState.error?.message)}
          />
        )}
      />
      <Controller
        control={control}
        name={`fieldDefinitions.${index}.type`}
        render={({ field }) => (
          <>
            <SelectField
              label={t("admin.cards.fields.typeLabel")}
              value={t(`admin.cards.fieldTypes.${field.value}`)}
              placeholder={t("admin.cards.fields.typeLabel")}
              onPress={() => setIsTypeSheetOpen(true)}
            />
            <OptionSheet
              visible={isTypeSheetOpen}
              title={t("admin.cards.fields.typeLabel")}
              options={GAME_FIELD_TYPES.map((value) => ({ value, label: t(`admin.cards.fieldTypes.${value}`) }))}
              selected={[field.value]}
              onSelect={(value) => {
                field.onChange(value);
                setIsTypeSheetOpen(false);
              }}
              onClose={() => setIsTypeSheetOpen(false)}
            />
          </>
        )}
      />
      <Controller
        control={control}
        name={`fieldDefinitions.${index}.path`}
        render={({ field, fieldState }) => (
          <TextField
            label={t("admin.cards.fields.pathLabel")}
            placeholder={t("admin.cards.fields.pathPlaceholder")}
            value={field.value}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            autoCapitalize="none"
            autoComplete="off"
            error={translateError(fieldState.error?.message)}
          />
        )}
      />
      {GAME_FIELD_TYPES_WITH_OPTIONS.includes(fieldType) ? (
        <Controller
          control={control}
          name={`fieldDefinitions.${index}.optionsText`}
          render={({ field }) => (
            <TextField
              label={t("admin.cards.fields.optionsLabel")}
              placeholder={t("admin.cards.fields.optionsPlaceholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              autoCapitalize="none"
            />
          )}
        />
      ) : null}
    </Surface>
  );
}
