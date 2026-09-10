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
import { checkCollectionName } from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  gameLanguagesQueryOptions,
  gamesQueryOptions,
} from "@/features/games/api/games";
import { EMPTY_LANGUAGES, LANGUAGE_LABELS } from "@/lib/constants/languages";
import {
  createCollectionSchema,
  type CreateCollectionFormValues,
} from "@/schemas/collections.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactElement } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

interface CreateCollectionDialogProps {
  trigger: (ctx: { disabled: boolean; noGames: boolean }) => ReactElement;
}

export function CreateCollectionDialog({ trigger }: CreateCollectionDialogProps) {
  const { t } = useTranslation("collections");
  const { isMutating, createCollection } = useCollections();
  const { data: games = [] } = useQuery(gamesQueryOptions);
  const activeGames = games.filter((g) => g.isActive);
  const [open, setOpen] = useState(false);

  const form = useForm<CreateCollectionFormValues>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: { name: "", gameGuid: "", lang: "" },
    mode: "onChange",
  });

  const [nameEdited, setNameEdited] = useState(false);

  const selectedGameGuid = form.watch("gameGuid");
  const { data: rawGameLanguages = EMPTY_LANGUAGES } = useQuery(
    gameLanguagesQueryOptions(selectedGameGuid || undefined),
  );
  const gameLanguages = useMemo(
    () => (rawGameLanguages.length > 0 ? rawGameLanguages : ["en"]),
    [rawGameLanguages],
  );

  useEffect(() => {
    if (gameLanguages.length === 1) {
      form.setValue("lang", gameLanguages[0], { shouldValidate: true });
    }
  }, [gameLanguages, form]);

  const nameValue = form.watch("name");
  const { data: nameCheck } = useQuery({
    queryKey: ["collections", "check-name", nameValue],
    queryFn: () => checkCollectionName(nameValue),
    enabled: open && !!nameValue?.trim(),
    staleTime: 0,
  });

  useEffect(() => {
    if (!open || !nameValue?.trim()) return;
    if (nameCheck?.success && nameCheck.data && !nameCheck.data.available) {
      form.setError("name", {
        type: "taken",
        message: t("createDialog.duplicateName"),
      });
    } else {
      form.clearErrors("name");
    }
  }, [open, nameValue, nameCheck, form, t]);

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        const firstGame = activeGames[0];
        form.reset({
          name: firstGame?.name ?? "",
          gameGuid: firstGame?.guid ?? "",
          lang: "",
        });
        setNameEdited(false);
      } else {
        form.reset();
      }
    },
    [form, activeGames],
  );

  const handleCreate = useCallback(
    async (values: CreateCollectionFormValues) => {
      await createCollection(values.name, values.gameGuid, values.lang);
      form.reset();
      setOpen(false);
    },
    [createCollection, form],
  );

  return (
    <DynamicDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={t("createDialog.title")}
      description={t("createDialog.description")}
      trigger={trigger({
        disabled: isMutating || activeGames.length === 0,
        noGames: activeGames.length === 0,
      })}
      footer={
        <>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("createDialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="create-collection-form"
            disabled={!form.formState.isValid || isMutating}
          >
            {isMutating && <IconLoader2 className="size-4 animate-spin" />}
            {t("createDialog.create")}
          </Button>
        </>
      }
      footerClassName="flex-col-reverse md:flex-row"
    >
      <form
        id="create-collection-form"
        onSubmit={form.handleSubmit(handleCreate)}
        className="flex flex-col gap-4"
      >
        <Controller
          name="gameGuid"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="collection-game">
                {t("createDialog.gameLabel")}
              </FieldLabel>
              <Select
                value={field.value}
                onValueChange={(guid) => {
                  field.onChange(guid);
                  form.setValue("lang", "", { shouldValidate: true });
                  if (!nameEdited) {
                    const game = activeGames.find((g) => g.guid === guid);
                    form.setValue("name", game?.name ?? "", {
                      shouldValidate: true,
                    });
                  }
                }}
              >
                <SelectTrigger id="collection-game" autoFocus>
                  <SelectValue placeholder={t("createDialog.gamePlaceholder")}>
                    {activeGames.find((g) => g.guid === field.value)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {activeGames.map((game) => (
                    <SelectItem key={game.guid} value={game.guid}>
                      {game.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="collection-name">
                {t("createDialog.nameLabel")}
              </FieldLabel>
              <Input
                {...field}
                id="collection-name"
                placeholder={t("createDialog.namePlaceholder")}
                aria-invalid={fieldState.invalid}
                onChange={(e) => {
                  field.onChange(e);
                  setNameEdited(true);
                }}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="lang"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="collection-lang">
                {t("createDialog.langLabel")}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="collection-lang"
                  disabled={gameLanguages.length <= 1}
                >
                  <SelectValue placeholder={t("createDialog.langPlaceholder")}>
                    {LANGUAGE_LABELS[field.value] ?? field.value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {gameLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang] ?? lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </form>
    </DynamicDialog>
  );
}
