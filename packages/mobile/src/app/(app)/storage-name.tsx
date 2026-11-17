import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { createStorageLocation, renameStorageLocation } from "@/features/storage/api/storage";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { storageLocationNameFormSchema, type StorageLocationNameFormValues } from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function StorageNameScreen() {
  const { guid, name } = useLocalSearchParams<{ guid?: string; name?: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const editing = !!guid;
  const form = useForm<StorageLocationNameFormValues>({
    resolver: zodResolver(storageLocationNameFormSchema),
    defaultValues: { name: name ?? "" },
  });
  const save = useMutation({
    mutationFn: (values: StorageLocationNameFormValues) =>
      editing ? renameStorageLocation(guid, values.name.trim()) : createStorageLocation(values.name.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["storage-locations"] });
      router.back();
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PageHeader title={editing ? t("storage.rename") : t("storage.newLocation")} onBack={() => router.back()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, gap: SPACING.xl }}>
        {save.isError ? <Callout tone="destructive" title={t("storage.actionFailed")} /> : null}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t("storage.nameLabel")}
              placeholder={t("storage.namePlaceholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              returnKeyType="done"
              error={translateFormErrorMessage(t, fieldState.error?.message)}
            />
          )}
        />
        <Button
          size="lg"
          label={editing ? t("storage.save") : t("storage.create")}
          loading={save.isPending}
          onPress={form.handleSubmit((values) => save.mutate(values))}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
