import { zodResolver } from "@hookform/resolvers/zod";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  formatDecklist,
  parseCollectionCsv,
  storagePickListFormSchema,
  type StoragePickListFormValues,
} from "@magic-vault/shared";
import { Callout } from "@/components/ui/callout";
import { COLLECTION_CSV_IMPORT_MIME_TYPES } from "@/lib/constants/collections";
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
  const [importFailed, setImportFailed] = useState(false);
  const importFile = async () => {
    setImportFailed(false);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: COLLECTION_CSV_IMPORT_MIME_TYPES, copyToCacheDirectory: true });
      const asset = picked.canceled ? null : picked.assets[0];
      if (!asset) return;
      const parsed = parseCollectionCsv(await new File(asset.uri).text());
      if (!parsed.hasNameColumn || parsed.rows.length === 0) {
        setImportFailed(true);
        return;
      }
      form.setValue(
        "decklist",
        formatDecklist(
          parsed.rows.map((row) => ({
            name: row.name,
            quantity: row.quantity,
            setCode: row.setCode,
            collectorNumber: row.collectorNumber,
          })),
        ),
        { shouldDirty: true, shouldValidate: true },
      );
    } catch {
      setImportFailed(true);
    }
  };
  return (
    <View style={{ gap: SPACING.md }}>
      <Button variant="secondary" icon="upload" label={t("storage.pickList.importFile")} onPress={() => void importFile()} />
      {importFailed ? <Callout tone="destructive" title={t("storage.pickList.importFailed")} /> : null}
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
