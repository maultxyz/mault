import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { SelectField } from "@/components/ui/select-field";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { checkCollectionName, collectionsQueryOptions, updateCollection } from "@/features/collections/api/collections";
import { gameLanguagesQueryOptions } from "@/features/games/api/games";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { editCollectionFormSchema, type EditCollectionFormValues } from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function EditCollectionScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const options = collectionsQueryOptions(useActiveOrgId());
  const { data: collections } = useQuery(options);
  const collection = collections?.find((c) => c.guid === guid);
  const [languageSheetOpen, setLanguageSheetOpen] = useState(false);
  const form = useForm<EditCollectionFormValues>({
    resolver: zodResolver(editCollectionFormSchema),
    values: {
      name: collection?.name ?? "",
      lang: collection?.lang ?? "",
      matchAllLanguages: collection?.matchAllLanguages ?? false,
    },
    resetOptions: { keepDirtyValues: true },
  });
  const name = form.watch("name");
  const lang = form.watch("lang");
  const { data: syncedLanguages = [] } = useQuery(gameLanguagesQueryOptions(collection?.game?.guid ?? null));
  const languages = useMemo(() => {
    const available = new Set(syncedLanguages);
    if (collection?.lang) available.add(collection.lang);
    return [...available].sort();
  }, [syncedLanguages, collection?.lang]);
  const debouncedName = useDebouncedValue(name.trim(), SEARCH_DEBOUNCE_MS);
  const { data: nameAvailable = true } = useQuery({
    queryKey: ["collections", "check-name", debouncedName, guid],
    queryFn: () => checkCollectionName(debouncedName, guid),
    enabled: !!debouncedName && debouncedName !== collection?.name,
  });
  const save = useMutation({
    mutationFn: (values: EditCollectionFormValues) => updateCollection(guid, values),
    onSuccess: (next) => {
      queryClient.setQueryData(options.queryKey, next);
      router.back();
    },
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PageHeader title={t("collections.editTitle")} subtitle={t("collections.editDescription")} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SCREEN_GUTTER, paddingBottom: SPACING.xxl, gap: SPACING.xl }}>
        {save.isError ? <Callout tone="destructive" title={t("collections.editFailed")} /> : null}
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
        <SelectField
          label={t("collections.langLabel")}
          value={lang ? (LANGUAGE_LABELS[lang] ?? lang) : null}
          placeholder={t("collections.langPlaceholder")}
          disabled={languages.length <= 1}
          onPress={() => setLanguageSheetOpen(true)}
        />
        <Controller
          control={form.control}
          name="matchAllLanguages"
          render={({ field }) => (
            <View style={{ gap: SPACING.xs }}>
              <Pill label={t("collections.experimental")} />
              <SwitchRow
                title={t("collections.matchAllLanguagesLabel")}
                description={t("collections.matchAllLanguagesDescription")}
                value={field.value}
                disabled={languages.length <= 1}
                onValueChange={field.onChange}
              />
            </View>
          )}
        />
        <Button
          size="lg"
          label={t("collections.save")}
          loading={save.isPending}
          disabled={!form.formState.isDirty}
          onPress={form.handleSubmit((values) => {
            if (nameAvailable) save.mutate({ ...values, name: values.name.trim() });
          })}
        />
      </ScrollView>
      <OptionSheet
        visible={languageSheetOpen}
        title={t("collections.langLabel")}
        options={languages.map((code) => ({ value: code, label: LANGUAGE_LABELS[code] ?? code }))}
        selected={[lang]}
        onSelect={(value) => {
          setLanguageSheetOpen(false);
          form.setValue("lang", value, { shouldValidate: true, shouldDirty: true });
        }}
        onClose={() => setLanguageSheetOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
