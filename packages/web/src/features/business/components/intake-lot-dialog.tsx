import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createIntakeLot } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  gameLanguagesQueryOptions,
  gamesQueryOptions,
} from "@/features/games/api/games";
import { EMPTY_LANGUAGES, LANGUAGE_LABELS } from "@/lib/constants/languages";
import type { IntakeLotDialogProps } from "@/lib/interfaces/business";
import {
  intakeLotSchema,
  type IntakeLotFormValues,
} from "@/schemas/business.schema";
import { INTAKE_COLLECTION_MODES } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function IntakeLotDialog({
  open,
  onOpenChange,
  onCreated,
}: IntakeLotDialogProps) {
  const { t } = useTranslation("business");
  const { collections, activeCollection } = useCollections();
  const { data: games = [] } = useQuery(gamesQueryOptions);
  const activeGames = useMemo(() => games.filter((g) => g.isActive), [games]);
  const run = useBusinessAction();
  const form = useForm<IntakeLotFormValues>({
    resolver: zodResolver(intakeLotSchema),
    defaultValues: {
      collectionMode: "new",
      collectionGuid: "",
      gameGuid: "",
      lang: "",
      customerName: "",
      customerContact: "",
      notes: "",
    },
    mode: "onChange",
  });

  const [collectionMode, gameGuid] = useWatch({
    control: form.control,
    name: ["collectionMode", "gameGuid"],
  });
  const { data: rawLanguages = EMPTY_LANGUAGES } = useQuery(
    gameLanguagesQueryOptions(gameGuid || undefined),
  );
  const languages = useMemo(
    () => (rawLanguages.length > 0 ? rawLanguages : ["en"]),
    [rawLanguages],
  );

  useEffect(() => {
    if (!open) return;
    const defaultGame =
      activeGames.find((g) => g.guid === activeCollection?.game?.guid) ??
      activeGames[0];
    form.reset({
      collectionMode: "new",
      collectionGuid: activeCollection?.guid ?? collections[0]?.guid ?? "",
      gameGuid: defaultGame?.guid ?? "",
      lang:
        defaultGame && defaultGame.guid === activeCollection?.game?.guid
          ? activeCollection.lang
          : "",
      customerName: "",
      customerContact: "",
      notes: "",
    });
  }, [open, activeCollection, collections, activeGames, form]);

  useEffect(() => {
    const current = form.getValues("lang");
    if (!languages.includes(current)) {
      form.setValue(
        "lang",
        languages.includes("en") ? "en" : languages[0],
        { shouldValidate: true },
      );
    }
  }, [languages, form]);

  const submit = async (values: IntakeLotFormValues) => {
    const isNew = values.collectionMode === "new";
    const result = await run(
      () =>
        createIntakeLot({
          collectionGuid: isNew ? null : values.collectionGuid,
          newCollection: isNew
            ? { gameGuid: values.gameGuid, lang: values.lang }
            : null,
          customerName: values.customerName,
          customerContact: values.customerContact || null,
          notes: values.notes || null,
        }),
      t("intake.created"),
    );
    if (result?.data) {
      onOpenChange(false);
      onCreated(result.data.guid);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("intake.newTitle")}</DialogTitle>
          <DialogDescription>{t("intake.newDescription")}</DialogDescription>
        </DialogHeader>
        <form
          id="intake-lot-form"
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit(submit)}
        >
          <Controller
            name="customerName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="intake-customer">
                  {t("intake.customerName")}
                </FieldLabel>
                <Input {...field} id="intake-customer" autoFocus aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="customerContact"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="intake-contact">
                  {t("intake.customerContact")}
                </FieldLabel>
                <Input
                  {...field}
                  id="intake-contact"
                  placeholder={t("intake.customerContactPlaceholder")}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="collectionMode"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("intake.collection")}</FieldLabel>
                <ResponsiveSegmented
                  label={t("intake.collection")}
                  items={INTAKE_COLLECTION_MODES.map((mode) => ({
                    key: mode,
                    label: t(`intake.collectionModes.${mode}`),
                  }))}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    void form.trigger();
                  }}
                />
                <p className="text-xs text-foreground/70">
                  {t(`intake.collectionModeHints.${field.value}`)}
                </p>
              </Field>
            )}
          />
          {collectionMode === "new" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Controller
                name="gameGuid"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="intake-game">{t("intake.game")}</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <SelectTrigger id="intake-game">
                        <SelectValue>
                          {activeGames.find((g) => g.guid === field.value)?.name ??
                            t("intake.chooseGame")}
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
                name="lang"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="intake-lang">{t("intake.language")}</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <SelectTrigger id="intake-lang" disabled={languages.length <= 1}>
                        <SelectValue>
                          {LANGUAGE_LABELS[field.value] ?? field.value}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
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
            </div>
          ) : (
            <Controller
              name="collectionGuid"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <Select
                    value={field.value}
                    onValueChange={(value) => field.onChange(value ?? "")}
                  >
                    <SelectTrigger aria-label={t("intake.collection")}>
                      <SelectValue>
                        {collections.find((c) => c.guid === field.value)?.name ??
                          t("intake.chooseCollection")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((collection) => (
                        <SelectItem key={collection.guid} value={collection.guid}>
                          {collection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
          <Controller
            name="notes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="intake-notes">{t("intake.notes")}</FieldLabel>
                <Textarea {...field} id="intake-notes" rows={3} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            form="intake-lot-form"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("intake.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
