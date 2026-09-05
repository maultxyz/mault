import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { listSyncSources } from "@/lib/api/admin";
import { createGameFormSchema, type GameFormValues } from "@/schemas/games.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldMeta, Game } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { DEFAULT_OPERATORS_BY_TYPE } from "../constants/field-operators";
import { GameFieldDefinitionsEditor } from "./game-field-definitions-editor";

function toFormValues(game?: Game | null): GameFormValues {
  if (!game) {
    return {
      key: "",
      name: "",
      apiDocsUrl: "",
      isActive: true,
      fieldDefinitions: [],
    };
  }
  return {
    key: game.key,
    name: game.name,
    apiDocsUrl: game.apiDocsUrl ?? "",
    isActive: game.isActive,
    fieldDefinitions: game.fieldDefinitions.map((f) => ({
      field: f.field,
      label: f.label,
      type: f.type,
      path: f.path,
      optionsText: f.options?.map((o) => o.value).join(", ") ?? "",
    })),
  };
}

export function toFieldDefinitions(
  values: GameFormValues["fieldDefinitions"],
): FieldMeta[] {
  return values.map((f) => {
    const options = f.optionsText
      ?.split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .map((v) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1),
      }));

    return {
      field: f.field.trim(),
      label: f.label.trim(),
      type: f.type,
      path: f.path.trim(),
      operators: DEFAULT_OPERATORS_BY_TYPE[f.type],
      ...(options?.length ? { options } : {}),
    };
  });
}

interface GameFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game?: Game | null;
  onSubmit: (values: GameFormValues) => Promise<void>;
}

export function GameFormDialog({
  open,
  onOpenChange,
  game,
  onSubmit,
}: GameFormDialogProps) {
  const { t } = useTranslation("games");
  const gameFormSchema = createGameFormSchema(t);
  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: toFormValues(game),
  });
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  const { data: sources = [] } = useQuery({
    queryKey: ["admin", "syncSources"],
    queryFn: () => listSyncSources().then((r) => r.data ?? []),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (open) reset(toFormValues(game));
  }, [open, game, reset]);

  async function handleFormSubmit(values: GameFormValues) {
    await onSubmit(values);
    onOpenChange(false);
  }

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-5xl max-h-[60vh] overflow-hidden"
      title={
        game
          ? t("gameFormDialog.editTitle", { name: game.name })
          : t("gameFormDialog.addTitle")
      }
      description={t("gameFormDialog.description")}
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("gameFormDialog.cancel")}
          </Button>
          <Button type="submit" form="game-form" disabled={isSubmitting}>
            {isSubmitting
              ? t("gameFormDialog.saving")
              : game
                ? t("gameFormDialog.saveChanges")
                : t("gameFormDialog.createGame")}
          </Button>
        </>
      }
    >
      <FormProvider {...form}>
        <form
          id="game-form"
          onSubmit={handleSubmit(handleFormSubmit)}
          className="flex flex-col gap-4 flex-1 overflow-hidden"
        >
          <div className="grid grid-cols-2 gap-3">
            <Field data-invalid={!!errors.key}>
              <FieldLabel>{t("gameFormDialog.keyLabel")}</FieldLabel>
              <Controller
                control={control}
                name="key"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!!game}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("gameFormDialog.keyPlaceholder")}>
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
              <FieldLabel>{t("gameFormDialog.nameLabel")}</FieldLabel>
              <Input
                placeholder={t("gameFormDialog.namePlaceholder")}
                {...register("name")}
              />
              <FieldError errors={[errors.name]} />
            </Field>
          </div>

          <Field data-invalid={!!errors.apiDocsUrl}>
            <FieldLabel>{t("gameFormDialog.apiDocsUrlLabel")}</FieldLabel>
            <Input
              type="url"
              placeholder={t("gameFormDialog.apiDocsUrlPlaceholder")}
              {...register("apiDocsUrl")}
            />
            <FieldError errors={[errors.apiDocsUrl]} />
          </Field>

          <Field orientation="horizontal">
            <FieldLabel>{t("gameFormDialog.activeLabel")}</FieldLabel>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </Field>
          <GameFieldDefinitionsEditor />
        </form>
      </FormProvider>
    </DynamicDialog>
  );
}
