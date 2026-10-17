import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import { SelectField } from "@/components/ui/select-field";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { checkCollectionName, collectionsQueryOptions, createCollection } from "@/features/collections/api/collections";
import { createCollectionSchema } from "@/features/collections/lib/collection-schemas";
import { gameLanguagesQueryOptions, gamesQueryOptions } from "@/features/games/api/games";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { CreateCollectionValues } from "@/lib/interfaces/forms";

export default function NewCollectionScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const [sheet, setSheet] = useState<"game" | "lang" | null>(null);
  const [nameEdited, setNameEdited] = useState(false);
  const { data: games = [] } = useQuery(gamesQueryOptions);
  const activeGames = useMemo(() => games.filter((g) => g.isActive), [games]);
  const form = useForm<CreateCollectionValues>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: { name: "", gameGuid: "", lang: "", matchAllLanguages: false },
  });
  const gameGuid = form.watch("gameGuid");
  const lang = form.watch("lang");
  const name = form.watch("name");
  const { data: languages = [] } = useQuery(gameLanguagesQueryOptions(gameGuid || null));
  const debouncedName = useDebouncedValue(name.trim(), SEARCH_DEBOUNCE_MS);
  const { data: nameAvailable = true } = useQuery({
    queryKey: ["collections", "check-name", debouncedName],
    queryFn: () => checkCollectionName(debouncedName),
    enabled: !!debouncedName,
  });

  useEffect(() => {
    if (activeGames.length > 0 && !form.getValues("gameGuid")) {
      form.setValue("gameGuid", activeGames[0].guid);
      form.setValue("name", activeGames[0].name);
    }
  }, [activeGames, form]);

  useEffect(() => {
    if (languages.length === 1) form.setValue("lang", languages[0], { shouldValidate: true });
  }, [languages, form]);

  const create = useMutation({
    mutationFn: createCollection,
    onSuccess: (next) => {
      queryClient.setQueryData(collectionsQueryOptions(orgId).queryKey, next);
      void queryClient.invalidateQueries({ queryKey: ["org-overview"] });
      router.back();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    if (!nameAvailable) return;
    create.mutate({ ...values, name: values.name.trim() });
  });

  const errors = form.formState.errors;
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <PageHeader title={t("collections.new")} subtitle={t("collections.createDescription")} onBack={() => router.back()} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, paddingBottom: SPACING.xxl, gap: SPACING.xl }}>
        {create.isError ? <Callout tone="destructive" title={t("collections.createFailed")} /> : null}
        <View style={{ gap: SPACING.xs }}>
          <SelectField
            label={t("collections.gameLabel")}
            value={activeGames.find((g) => g.guid === gameGuid)?.name ?? null}
            placeholder={t("collections.gamePlaceholder")}
            onPress={() => setSheet("game")}
          />
          {errors.gameGuid ? (
            <AppText size="xs" style={{ color: colors.destructive }}>
              {t("collections.validation.game")}
            </AppText>
          ) : null}
        </View>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t("collections.nameLabel")}
              placeholder={t("collections.namePlaceholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={(text) => {
                setNameEdited(true);
                field.onChange(text);
              }}
              error={
                fieldState.error
                  ? t("collections.validation.name")
                  : !nameAvailable && debouncedName === name.trim()
                    ? t("collections.duplicateName")
                    : undefined
              }
            />
          )}
        />
        <View style={{ gap: SPACING.xs }}>
          <SelectField
            label={t("collections.langLabel")}
            value={lang ? (LANGUAGE_LABELS[lang] ?? lang) : null}
            placeholder={t("collections.langPlaceholder")}
            disabled={languages.length <= 1}
            onPress={() => setSheet("lang")}
          />
          {errors.lang ? (
            <AppText size="xs" style={{ color: colors.destructive }}>
              {t("collections.validation.lang")}
            </AppText>
          ) : null}
        </View>
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
        <Button size="lg" label={t("collections.create")} loading={create.isPending} onPress={onSubmit} />
      </ScrollView>
      <OptionSheet
        visible={sheet === "game"}
        title={t("collections.gameLabel")}
        options={activeGames.map((g) => ({ value: g.guid, label: g.name }))}
        selected={[gameGuid]}
        onSelect={(value) => {
          setSheet(null);
          form.setValue("gameGuid", value, { shouldValidate: true });
          form.setValue("lang", "");
          form.setValue("matchAllLanguages", false);
          if (!nameEdited) form.setValue("name", activeGames.find((g) => g.guid === value)?.name ?? "");
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "lang"}
        title={t("collections.langLabel")}
        options={languages.map((code) => ({ value: code, label: LANGUAGE_LABELS[code] ?? code }))}
        selected={[lang]}
        onSelect={(value) => {
          setSheet(null);
          form.setValue("lang", value, { shouldValidate: true });
        }}
        onClose={() => setSheet(null)}
      />
    </KeyboardAvoidingView>
  );
}
