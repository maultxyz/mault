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
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  gameLanguagesQueryOptions,
  gamesQueryOptions,
} from "@/features/games/api/games";
import { LANGUAGE_LABELS } from "@/lib/languages";
import {
  createCollectionSchema,
  type CreateCollectionFormValues,
} from "@/schemas/collections.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconFolderPlus, IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

const EMPTY_LANGUAGES: string[] = [];

export function RequireCollectionDialog() {
  const { t } = useTranslation("collections");
  const { collections, isLoading, isMutating, createCollection } =
    useCollections();
  const { activeOrg } = useOrg();
  const { data: games = [] } = useQuery(gamesQueryOptions);
  const activeGames = games.filter((g) => g.isActive);

  const form = useForm<CreateCollectionFormValues>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: { name: "", gameGuid: "", lang: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (!form.getValues("gameGuid") && activeGames[0]) {
      form.setValue("gameGuid", activeGames[0].guid, { shouldValidate: true });
    }
  }, [activeGames, form]);

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

  const handleCreate = useCallback(
    async (values: CreateCollectionFormValues) => {
      await createCollection(values.name, values.gameGuid, values.lang);
      form.reset();
    },
    [createCollection, form],
  );

  // Dismissible only when there are no active games - otherwise its own game
  // picker is empty and submit is disabled, leaving no way out.
  const dismissible = activeGames.length === 0;
  const [dismissed, setDismissed] = useState(false);

  // Re-arm once a game becomes available mid-session, so the dialog goes
  // back to nagging (now-completable) rather than staying dismissed forever.
  useEffect(() => {
    if (activeGames.length > 0) setDismissed(false);
  }, [activeGames.length]);

  const open =
    !!activeOrg && !isLoading && collections.length === 0 && !dismissed;

  return (
    <DynamicDialog
      open={open}
      onOpenChange={(next) => {
        // The underlying Dialog only uses `dismissible` to hide the close
        // button - outside-click/Escape still fire onOpenChange(false)
        // regardless, so re-check it here to actually block dismissal.
        if (!next && dismissible) setDismissed(true);
      }}
      dismissible={dismissible}
      className="sm:max-w-md"
      title={
        <div className="flex items-center gap-2">
          <IconFolderPlus className="size-5 text-primary" />
          {t("requireDialog.title")}
        </div>
      }
      description={t("requireDialog.description")}
      footer={
        <Button
          type="submit"
          form="first-collection-form"
          disabled={
            !form.formState.isValid || isMutating || activeGames.length === 0
          }
          className="w-full"
        >
          {isMutating && <IconLoader2 className="size-4 animate-spin" />}
          {t("requireDialog.submit")}
        </Button>
      }
    >
      <form
        id="first-collection-form"
        onSubmit={form.handleSubmit(handleCreate)}
        className="flex flex-col gap-4"
      >
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="first-collection-name">
                  {t("createDialog.nameLabel")}
                </FieldLabel>
                <Input
                  {...field}
                  id="first-collection-name"
                  placeholder={t("createDialog.namePlaceholder")}
                  aria-invalid={fieldState.invalid}
                  autoFocus
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="gameGuid"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="first-collection-game">
                  {t("createDialog.gameLabel")}
                </FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(guid) => {
                    field.onChange(guid);
                    form.setValue("lang", "", { shouldValidate: true });
                  }}
                >
                  <SelectTrigger id="first-collection-game">
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="lang"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="first-collection-lang">
                  {t("createDialog.langLabel")}
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id="first-collection-lang"
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
      </form>
    </DynamicDialog>
  );
}
