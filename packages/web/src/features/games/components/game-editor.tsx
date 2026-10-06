import { SaveBar } from "@/components/save-bar";
import {
  SettingsSection,
  SettingsSections,
} from "@/components/settings-section";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { checkGameKey } from "@/features/games/api/games";
import { useSaveGame } from "@/features/games/api/use-save-game";
import { toGameFormValues } from "@/features/games/lib/game-form";
import { listSyncSources } from "@/lib/api/admin";
import { GAME_FORM_ID, GAMES_ADMIN_PATH } from "@/lib/constants/games";
import type { GameEditorProps } from "@/lib/interfaces/games";
import {
  createGameFormSchema,
  type GameFormValues,
} from "@/schemas/games.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowLeft } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { GameFieldDefinitionsEditor } from "./game-field-definitions-editor";

export function GameEditor({ game }: GameEditorProps) {
  const { t } = useTranslation("games");
  const navigate = useNavigate();
  const saveGame = useSaveGame(game);
  const savedValues = useMemo(() => toGameFormValues(game), [game]);
  const form = useForm<GameFormValues>({
    resolver: zodResolver(createGameFormSchema(t)),
    defaultValues: savedValues,
    values: game ? savedValues : undefined,
    resetOptions: { keepDirtyValues: true },
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors, isDirty, isSubmitting },
  } = form;

  const { data: sources = [] } = useQuery({
    queryKey: ["admin", "syncSources"],
    queryFn: () => listSyncSources().then((r) => r.data ?? []),
    staleTime: Infinity,
  });

  const keyValue = useWatch({ control, name: "key" });
  const { data: keyCheck } = useQuery({
    queryKey: ["games", "check-key", keyValue],
    queryFn: () => checkGameKey(keyValue),
    enabled: !game && !!keyValue,
    staleTime: 0,
  });

  useEffect(() => {
    if (game || !keyValue) return;
    if (keyCheck?.success && keyCheck.data && !keyCheck.data.available) {
      setError("key", {
        type: "taken",
        message: t("gameForm.validation.keyTaken"),
      });
    } else {
      clearErrors("key");
    }
  }, [game, keyValue, keyCheck, setError, clearErrors, t]);

  async function handleFormSubmit(values: GameFormValues) {
    let saved;
    try {
      saved = await saveGame.mutateAsync(values);
    } catch {
      return;
    }
    if (!saved) return;
    if (game) {
      reset(toGameFormValues(saved));
    } else {
      navigate(`${GAMES_ADMIN_PATH}/${saved.guid}`, { replace: true });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          nativeButton={false}
          render={<Link to={GAMES_ADMIN_PATH} />}
        >
          <IconArrowLeft />
          {t("gameForm.back")}
        </Button>
        <h1 className="font-heading text-lg font-semibold">
          {game
            ? t("gameForm.editTitle", { name: game.name })
            : t("gameForm.newTitle")}
        </h1>
      </div>

      <FormProvider {...form}>
        <form id={GAME_FORM_ID} onSubmit={handleSubmit(handleFormSubmit)}>
          <SettingsSections>
            <SettingsSection
              heading={t("gameForm.general.heading")}
              description={t("gameForm.general.description")}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.key}>
                  <FieldLabel>{t("gameForm.keyLabel")}</FieldLabel>
                  <Controller
                    control={control}
                    name="key"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!!game}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t("gameForm.keyPlaceholder")}
                          >
                            {field.value
                              ? (sources.find((s) => s.gameKey === field.value)
                                  ?.label ?? field.value)
                              : undefined}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {sources.map((s) => (
                            <SelectItem key={s.gameKey} value={s.gameKey}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError errors={[errors.key]} />
                </Field>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="game-name">
                    {t("gameForm.nameLabel")}
                  </FieldLabel>
                  <Input
                    id="game-name"
                    placeholder={t("gameForm.namePlaceholder")}
                    {...register("name")}
                  />
                  <FieldError errors={[errors.name]} />
                </Field>
                <Field
                  data-invalid={!!errors.apiDocsUrl}
                  className="sm:col-span-2"
                >
                  <FieldLabel htmlFor="game-api-docs-url">
                    {t("gameForm.apiDocsUrlLabel")}
                  </FieldLabel>
                  <Input
                    id="game-api-docs-url"
                    type="url"
                    placeholder={t("gameForm.apiDocsUrlPlaceholder")}
                    {...register("apiDocsUrl")}
                  />
                  <FieldError errors={[errors.apiDocsUrl]} />
                </Field>
                <Field orientation="horizontal">
                  <Controller
                    control={control}
                    name="isActive"
                    render={({ field }) => (
                      <Switch
                        id="game-active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <FieldLabel htmlFor="game-active">{t("active")}</FieldLabel>
                </Field>
              </div>
            </SettingsSection>

            <SettingsSection
              heading={t("gameForm.physical.heading")}
              description={t("gameForm.physical.description")}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.cardThickness}>
                  <FieldLabel htmlFor="game-card-thickness">
                    {t("gameForm.cardThicknessLabel")}
                  </FieldLabel>
                  <Controller
                    control={control}
                    name="cardThickness"
                    render={({ field }) => (
                      <Input
                        id="game-card-thickness"
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder={t("gameForm.cardThicknessPlaceholder")}
                        className="max-w-32"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          field.onChange(raw === "" ? null : Number(raw));
                        }}
                      />
                    )}
                  />
                  <FieldDescription>
                    {t("gameForm.cardThicknessDescription")}
                  </FieldDescription>
                  <FieldError errors={[errors.cardThickness]} />
                </Field>
                <Field data-invalid={!!errors.foilTypesText}>
                  <FieldLabel htmlFor="game-foil-types">
                    {t("gameForm.foilTypesLabel")}
                  </FieldLabel>
                  <Input
                    id="game-foil-types"
                    placeholder={t("gameForm.foilTypesPlaceholder")}
                    {...register("foilTypesText")}
                  />
                  <FieldDescription>
                    {t("gameForm.foilTypesDescription")}
                  </FieldDescription>
                  <FieldError errors={[errors.foilTypesText]} />
                </Field>
              </div>
            </SettingsSection>

            <GameFieldDefinitionsEditor />
          </SettingsSections>
        </form>
      </FormProvider>

      <SaveBar
        show={isDirty}
        formId={GAME_FORM_ID}
        isSaving={isSubmitting}
        onDiscard={() => reset()}
      />
      <UnsavedChangesGuard
        isDirty={isDirty && !isSubmitting}
        onDiscard={() => reset()}
      />
    </div>
  );
}
