import { LANGUAGE_LABELS } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  INTAKE_COLLECTION_MODES,
  intakeLotSchema,
  type IntakeCollectionMode,
  type IntakeLotFormValues,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import { createIntakeLot } from "@/features/business/api/business";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { gameLanguagesQueryOptions, gamesQueryOptions } from "@/features/games/api/games";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { BUSINESS_INTAKE_QUERY_KEY, INTAKE_LOT_DEFAULT_VALUES } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function NewIntakeLotScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const orgId = useActiveOrgId();
  const [sheet, setSheet] = useState<"game" | "lang" | "collection" | null>(null);
  const { data: games = [] } = useQuery(gamesQueryOptions);
  const { data: collections = [] } = useQuery(collectionsQueryOptions(orgId));
  const activeGames = useMemo(() => games.filter((game) => game.isActive), [games]);
  const form = useForm<IntakeLotFormValues>({
    resolver: zodResolver(intakeLotSchema),
    defaultValues: INTAKE_LOT_DEFAULT_VALUES,
  });
  const collectionMode = form.watch("collectionMode");
  const gameGuid = form.watch("gameGuid");
  const lang = form.watch("lang");
  const collectionGuid = form.watch("collectionGuid");
  const { data: languages = [] } = useQuery(gameLanguagesQueryOptions(gameGuid || null));
  const errors = form.formState.errors;

  useEffect(() => {
    if (activeGames.length > 0 && !form.getValues("gameGuid")) form.setValue("gameGuid", activeGames[0].guid);
  }, [activeGames, form]);

  useEffect(() => {
    if (collections.length > 0 && !form.getValues("collectionGuid")) form.setValue("collectionGuid", collections[0].guid);
  }, [collections, form]);

  useEffect(() => {
    const current = form.getValues("lang");
    if (languages.length > 0 && !languages.includes(current)) {
      form.setValue("lang", languages.includes("en") ? "en" : languages[0], { shouldValidate: true });
    }
  }, [languages, form]);

  const create = useMutation({
    mutationFn: (values: IntakeLotFormValues) => {
      const isNew = values.collectionMode === "new";
      return createIntakeLot({
        collectionGuid: isNew ? null : values.collectionGuid,
        newCollection: isNew ? { gameGuid: values.gameGuid, lang: values.lang } : null,
        customerName: values.customerName,
        customerContact: values.customerContact || null,
        notes: values.notes || null,
      });
    },
    onSuccess: ({ guid }) => {
      void queryClient.invalidateQueries({ queryKey: BUSINESS_INTAKE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      router.back();
      router.push({ pathname: "/business/intake/[guid]", params: { guid } });
    },
  });

  const fieldError = (message: string | undefined) =>
    message ? (
      <AppText size="xs" tone="destructive" accessibilityLiveRegion="polite">
        {translateFormErrorMessage(t, message)}
      </AppText>
    ) : null;

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("business.intake.new")} subtitle={t("business.intake.newDescription")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("business.intake.create")}
            loading={create.isPending}
            onPress={form.handleSubmit((values) => create.mutate(values))}
          />
        }
      >
        {create.isError ? (
          <Callout
            tone="destructive"
            title={t("business.intake.createFailed")}
            description={create.error instanceof Error ? create.error.message : undefined}
          />
        ) : null}
        <Controller
          control={form.control}
          name="customerName"
          render={({ field, fieldState }) => (
            <TextField
              label={t("business.intake.customerName")}
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
            />
          )}
        />
        <Controller
          control={form.control}
          name="customerContact"
          render={({ field, fieldState }) => (
            <TextField
              label={t("business.intake.customerContact")}
              placeholder={t("business.intake.customerContactPlaceholder")}
              autoCapitalize="none"
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
            />
          )}
        />
        <View style={{ gap: SPACING.xs }}>
          <AppText size="sm" weight="medium">
            {t("business.intake.collectionMode")}
          </AppText>
          <SegmentedControl<IntakeCollectionMode>
            value={collectionMode}
            onChange={(value) => form.setValue("collectionMode", value, { shouldValidate: true })}
            options={INTAKE_COLLECTION_MODES.map((value) => ({
              value,
              label: t(`business.intake.collectionModes.${value}`),
            }))}
          />
        </View>
        {collectionMode === "new" ? (
          <>
            <View style={{ gap: SPACING.xs }}>
              <SelectField
                label={t("business.intake.game")}
                value={activeGames.find((game) => game.guid === gameGuid)?.name ?? null}
                placeholder={t("business.intake.gamePlaceholder")}
                onPress={() => setSheet("game")}
              />
              {fieldError(errors.gameGuid?.message)}
            </View>
            <View style={{ gap: SPACING.xs }}>
              <SelectField
                label={t("business.intake.language")}
                value={lang ? (LANGUAGE_LABELS[lang] ?? lang) : null}
                placeholder={t("business.intake.languagePlaceholder")}
                disabled={languages.length <= 1}
                onPress={() => setSheet("lang")}
              />
              {fieldError(errors.lang?.message)}
            </View>
          </>
        ) : (
          <View style={{ gap: SPACING.xs }}>
            <SelectField
              label={t("business.intake.collection")}
              value={collections.find((collection) => collection.guid === collectionGuid)?.name ?? null}
              placeholder={t("business.intake.collectionPlaceholder")}
              onPress={() => setSheet("collection")}
            />
            {fieldError(errors.collectionGuid?.message)}
          </View>
        )}
        <Controller
          control={form.control}
          name="notes"
          render={({ field, fieldState }) => (
            <TextField
              label={t("business.intake.notes")}
              multiline
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              error={fieldState.error ? translateFormErrorMessage(t, fieldState.error.message) : undefined}
            />
          )}
        />
      </PinnedActionsLayout>
      <OptionSheet
        visible={sheet === "game"}
        title={t("business.intake.game")}
        options={activeGames.map((game) => ({ value: game.guid, label: game.name }))}
        selected={[gameGuid]}
        onSelect={(value) => {
          setSheet(null);
          form.setValue("gameGuid", value, { shouldValidate: true });
          form.setValue("lang", "");
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "lang"}
        title={t("business.intake.language")}
        options={languages.map((code) => ({ value: code, label: LANGUAGE_LABELS[code] ?? code }))}
        selected={[lang]}
        onSelect={(value) => {
          setSheet(null);
          form.setValue("lang", value, { shouldValidate: true });
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === "collection"}
        title={t("business.intake.collection")}
        options={collections.map((collection) => ({ value: collection.guid, label: collection.name }))}
        selected={[collectionGuid]}
        onSelect={(value) => {
          setSheet(null);
          form.setValue("collectionGuid", value, { shouldValidate: true });
        }}
        onClose={() => setSheet(null)}
      />
    </View>
  );
}
