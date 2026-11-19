import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { storagePickListFormSchema, type StoragePickListFormValues } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";
import type { StoragePickListFormProps } from "@/lib/interfaces/storage";

export function StoragePickListForm({ initialDecklist, onSubmit, onCancel }: StoragePickListFormProps) {
  const { t } = useTranslation();
  const form = useForm<StoragePickListFormValues>({
    resolver: zodResolver(storagePickListFormSchema),
    defaultValues: { decklist: initialDecklist },
  });
  return (
    <View style={{ gap: SPACING.md }}>
      <Controller
        control={form.control}
        name="decklist"
        render={({ field, fieldState }) => (
          <TextField
            label={t("storage.pickList.decklistLabel")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder={t("storage.pickList.decklistPlaceholder")}
            autoCapitalize="words"
            multiline
            error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
          />
        )}
      />
      <AppText size="xs" tone="secondary">
        {t("storage.pickList.decklistHint")}
      </AppText>
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        {onCancel ? <Button style={{ flex: 1 }} variant="secondary" label={t("storage.cancel")} onPress={onCancel} /> : null}
        <Button
          style={{ flex: 1 }}
          icon="search"
          label={t("storage.pickList.findCards")}
          onPress={form.handleSubmit((values) => onSubmit(values.decklist))}
        />
      </View>
    </View>
  );
}
