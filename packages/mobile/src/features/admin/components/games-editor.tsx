import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Game } from "@magic-vault/shared";
import { router, useNavigation, usePreventRemove } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, FormProvider, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { SaveBar } from "@/components/ui/save-bar";
import { Screen } from "@/components/ui/screen";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { syncSourcesQueryOptions } from "@/features/admin/api/cards-sync";
import { createGame, deleteGame, gameKeyAvailabilityQueryOptions, updateGame } from "@/features/admin/api/games-admin";
import {
  emptyGameFieldDefinition,
  gameEditorFormSchema,
  toFieldRenames,
  toGameEditorFormValues,
  toGameInput,
} from "@/features/admin/api/games-form";
import { CardsTypedConfirmPanel } from "@/features/admin/components/cards-typed-confirm-panel";
import { GamesFieldDefinitionCard } from "@/features/admin/components/games-field-definition-card";
import { gamesQueryOptions } from "@/features/games/api/games";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { GAME_EDITOR_VALIDATION_KEYS } from "@/lib/constants/admin-cards";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/collections";
import { SPACING } from "@/lib/constants/theme";
import type { GameEditorFormValues, GamesEditorExit, GamesEditorProps } from "@/lib/interfaces/admin-cards";

export function GamesEditor({ game }: GamesEditorProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const savedValues = useMemo(() => toGameEditorFormValues(game), [game]);
  const form = useForm<GameEditorFormValues>({
    resolver: zodResolver(gameEditorFormSchema),
    defaultValues: savedValues,
    values: game ? savedValues : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  const {
    control,
    reset,
    setError,
    clearErrors,
    handleSubmit,
    formState: { errors, isDirty },
  } = form;
  const fieldDefinitions = useFieldArray({ control, name: "fieldDefinitions" });
  const sources = useQuery(syncSourcesQueryOptions);
  const [keySheetOpen, setKeySheetOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [exit, setExit] = useState<GamesEditorExit | null>(null);

  const keyValue = useWatch({ control, name: "key" });
  const debouncedKey = useDebouncedValue(keyValue, SEARCH_DEBOUNCE_MS);
  const keyAvailability = useQuery(gameKeyAvailabilityQueryOptions(debouncedKey, !game));

  useEffect(() => {
    if (game || !debouncedKey) return;
    if (keyAvailability.data && !keyAvailability.data.available) {
      setError("key", { type: "taken", message: GAME_EDITOR_VALIDATION_KEYS.keyTaken });
    } else if (errors.key?.type === "taken") {
      clearErrors("key");
    }
  }, [game, debouncedKey, keyAvailability.data, errors.key?.type, setError, clearErrors]);

  const upsertCachedGame = (saved: Game) =>
    queryClient.setQueryData(gamesQueryOptions.queryKey, (games = []) =>
      games.some((cached) => cached.guid === saved.guid)
        ? games.map((cached) => (cached.guid === saved.guid ? saved : cached))
        : [...games, saved],
    );

  const save = useMutation({
    mutationFn: (values: GameEditorFormValues) =>
      game
        ? updateGame(game.guid, { ...toGameInput(values), fieldRenames: toFieldRenames(values.fieldDefinitions) })
        : createGame(toGameInput(values)),
    onSuccess: (saved) => {
      upsertCachedGame(saved);
      if (game) {
        void queryClient.invalidateQueries({ queryKey: ["collections"] });
        void queryClient.invalidateQueries({ queryKey: ["bin-sets"] });
      }
      AccessibilityInfo.announceForAccessibility(
        t(game ? "admin.cards.games.updateSuccess" : "admin.cards.games.createSuccess", { name: saved.name }),
      );
      reset(toGameEditorFormValues(saved));
      if (!game) setExit({ kind: "replace", gameGuid: saved.guid });
    },
  });

  const remove = useMutation({
    mutationFn: () => (game ? deleteGame(game.guid) : Promise.resolve()),
    onSuccess: () => {
      if (!game) return;
      queryClient.setQueryData(gamesQueryOptions.queryKey, (games = []) => games.filter((cached) => cached.guid !== game.guid));
      void queryClient.invalidateQueries({ queryKey: ["collections"] });
      AccessibilityInfo.announceForAccessibility(t("admin.cards.games.deleteSuccess"));
      setExit({ kind: "back" });
    },
  });

  useEffect(() => {
    if (!exit) return;
    if (exit.kind === "replace") router.replace(`/admin/games/${exit.gameGuid}`);
    else router.back();
  }, [exit]);

  const discard = () => reset(savedValues);

  usePreventRemove(isDirty && !save.isPending && !exit, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("admin.cards.gameForm.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      {
        text: t("common.discard"),
        style: "destructive",
        onPress: () => {
          discard();
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const sourceLabel = (gameKey: string) => sources.data?.find((source) => source.gameKey === gameKey)?.label ?? gameKey;
  const fieldListError = errors.fieldDefinitions?.root?.message ?? errors.fieldDefinitions?.message;
  const translateError = (message: string | undefined) => (message ? t(message) : undefined);

  return (
    <View style={{ flex: 1 }}>
      <Screen
        header={
          <PageHeader
            title={game ? t("admin.cards.gameForm.editTitle", { name: game.name }) : t("admin.cards.gameForm.newTitle")}
            subtitle={t("admin.sections.cards.title")}
            onBack={() => router.back()}
          />
        }
      >
        {save.isError ? (
          <Callout
            tone="destructive"
            title={t(game ? "admin.cards.games.updateFailed" : "admin.cards.games.createFailed")}
            description={save.error.message}
          />
        ) : null}

        <Surface style={{ gap: SPACING.md }}>
          <View>
            <AppText heading weight="semibold" accessibilityRole="header">
              {t("admin.cards.gameForm.generalHeading")}
            </AppText>
            <AppText size="xs" tone="secondary">
              {t("admin.cards.gameForm.generalDescription")}
            </AppText>
          </View>
          <View style={{ gap: SPACING.xs }}>
            <SelectField
              label={t("admin.cards.gameForm.keyLabel")}
              value={keyValue ? sourceLabel(keyValue) : null}
              placeholder={t("admin.cards.gameForm.keyPlaceholder")}
              disabled={!!game}
              onPress={() => setKeySheetOpen(true)}
            />
            {errors.key ? (
              <AppText size="xs" tone="destructive" accessibilityRole="alert">
                {translateError(errors.key.message)}
              </AppText>
            ) : null}
          </View>
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                label={t("admin.cards.gameForm.nameLabel")}
                placeholder={t("admin.cards.gameForm.namePlaceholder")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={translateError(fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={control}
            name="apiDocsUrl"
            render={({ field, fieldState }) => (
              <TextField
                label={t("admin.cards.gameForm.apiDocsUrlLabel")}
                placeholder={t("admin.cards.gameForm.apiDocsUrlPlaceholder")}
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
            name="isActive"
            render={({ field }) => (
              <SwitchRow
                title={t("admin.cards.games.active")}
                description={t("admin.cards.gameForm.activeDescription")}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
        </Surface>

        <Surface style={{ gap: SPACING.md }}>
          <View>
            <AppText heading weight="semibold" accessibilityRole="header">
              {t("admin.cards.gameForm.physicalHeading")}
            </AppText>
            <AppText size="xs" tone="secondary">
              {t("admin.cards.gameForm.physicalDescription")}
            </AppText>
          </View>
          <Controller
            control={control}
            name="cardThicknessText"
            render={({ field, fieldState }) => (
              <View style={{ gap: SPACING.xs }}>
                <TextField
                  label={t("admin.cards.gameForm.cardThicknessLabel")}
                  placeholder={t("admin.cards.gameForm.cardThicknessPlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  keyboardType="decimal-pad"
                  error={translateError(fieldState.error?.message)}
                />
                <AppText size="xs" tone="secondary">
                  {t("admin.cards.gameForm.cardThicknessDescription")}
                </AppText>
              </View>
            )}
          />
        </Surface>

        <View style={{ gap: SPACING.md }}>
          <View>
            <AppText heading weight="semibold" accessibilityRole="header">
              {t("admin.cards.fields.heading")}
            </AppText>
            <AppText size="xs" tone="secondary">
              {t("admin.cards.fields.description")}
            </AppText>
          </View>
          {fieldListError ? <Callout tone="destructive" title={translateError(fieldListError) ?? ""} /> : null}
          {fieldDefinitions.fields.length === 0 ? (
            <EmptyState icon="rules" title={t("admin.cards.fields.empty")} />
          ) : (
            <FormProvider {...form}>
              {fieldDefinitions.fields.map((row, index) => (
                <GamesFieldDefinitionCard key={row.id} index={index} onRemove={() => fieldDefinitions.remove(index)} />
              ))}
            </FormProvider>
          )}
          <Button
            variant="secondary"
            icon="plus"
            label={t("admin.cards.fields.addField")}
            onPress={() => fieldDefinitions.append(emptyGameFieldDefinition(), { shouldFocus: false })}
          />
        </View>

        {game ? (
          confirmingDelete ? (
            <View style={{ gap: SPACING.md }}>
              {remove.isError ? (
                <Callout tone="destructive" title={t("admin.cards.games.deleteFailed")} description={remove.error.message} />
              ) : null}
              <CardsTypedConfirmPanel
                title={t("admin.cards.games.deleteTitle")}
                description={t("admin.cards.games.deleteDescription", { name: game.name })}
                expectedText={game.name}
                confirmLabel={t("admin.cards.games.deleteButton")}
                isConfirming={remove.isPending}
                onConfirm={() => remove.mutate()}
                onCancel={() => {
                  remove.reset();
                  setConfirmingDelete(false);
                }}
              />
            </View>
          ) : (
            <Button variant="destructive" icon="trash" label={t("admin.cards.games.deleteButton")} onPress={() => setConfirmingDelete(true)} />
          )
        ) : null}
      </Screen>
      <SaveBar visible={isDirty || !game} saving={save.isPending} onSave={handleSubmit((values) => save.mutate(values))} onDiscard={discard} />
      <OptionSheet
        visible={keySheetOpen}
        title={t("admin.cards.gameForm.keyLabel")}
        options={(sources.data ?? []).map((source) => ({ value: source.gameKey, label: source.label }))}
        selected={keyValue ? [keyValue] : []}
        onSelect={(value) => {
          setKeySheetOpen(false);
          form.setValue("key", value, { shouldDirty: true, shouldValidate: true });
        }}
        onClose={() => setKeySheetOpen(false)}
      />
    </View>
  );
}
