import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { TextField } from "@/components/ui/text-field";
import { checkCollectionName, collectionsQueryOptions, renameCollection } from "@/features/collections/api/collections";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { renameCollectionFormSchema, type RenameCollectionFormValues } from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function RenameCollectionScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const options = collectionsQueryOptions(useActiveOrgId());
  const { data: collections } = useQuery(options);
  const collection = collections?.find((c) => c.guid === guid);
  const form = useForm<RenameCollectionFormValues>({
    resolver: zodResolver(renameCollectionFormSchema),
    values: { name: collection?.name ?? "" },
    resetOptions: { keepDirtyValues: true },
  });
  const name = form.watch("name");
  const debouncedName = useDebouncedValue(name.trim(), SEARCH_DEBOUNCE_MS);
  const { data: nameAvailable = true } = useQuery({
    queryKey: ["collections", "check-name", debouncedName, guid],
    queryFn: () => checkCollectionName(debouncedName, guid),
    enabled: !!debouncedName && debouncedName !== collection?.name,
  });
  const rename = useMutation({
    mutationFn: (next: string) => renameCollection(guid, next),
    onSuccess: (next) => {
      queryClient.setQueryData(options.queryKey, next);
      router.back();
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PageHeader title={t("collections.renameTitle")} subtitle={t("collections.renameDescription")} onBack={() => router.back()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, gap: SPACING.xl }}>
        {rename.isError ? <Callout tone="destructive" title={t("collections.renameFailed")} /> : null}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t("collections.nameLabel")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              returnKeyType="done"
              error={
                fieldState.error
                  ? translateFormErrorMessage(t, fieldState.error.message)
                  : !nameAvailable && debouncedName === name.trim()
                    ? t("collections.duplicateName")
                    : undefined
              }
            />
          )}
        />
        <Button
          size="lg"
          label={t("collections.save")}
          loading={rename.isPending}
          disabled={!form.formState.isDirty}
          onPress={form.handleSubmit((values) => {
            if (nameAvailable) rename.mutate(values.name.trim());
          })}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
