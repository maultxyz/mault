import { Badge } from "@/components/ui/badge";
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
import { checkCollectionName } from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import { gameLanguagesQueryOptions } from "@/features/games/api/games";
import { EMPTY_LANGUAGES, LANGUAGE_LABELS } from "@/lib/constants/languages";
import type { EditCollectionDialogProps } from "@/lib/interfaces/collections";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  editCollectionFormSchema,
  type EditCollectionFormValues,
} from "@magic-vault/shared";

export function EditCollectionDialog({
  collection,
  onClose,
}: EditCollectionDialogProps) {
  const { t } = useTranslation("collections");
  const { isMutating, updateCollection } = useCollections();
  const form = useForm<EditCollectionFormValues>({
    resolver: zodResolver(editCollectionFormSchema),
    defaultValues: { name: "", lang: "", matchAllLanguages: false },
    mode: "onChange",
  });

  useEffect(() => {
    if (!collection) return;
    form.reset({
      name: collection.name,
      lang: collection.lang,
      matchAllLanguages: collection.matchAllLanguages,
    });
  }, [collection, form]);

  const { data: syncedLanguages = EMPTY_LANGUAGES } = useQuery(
    gameLanguagesQueryOptions(collection?.game?.guid),
  );
  const gameLanguages = useMemo(() => {
    const languages = new Set(syncedLanguages);
    if (collection?.lang) languages.add(collection.lang);
    return [...languages].sort();
  }, [syncedLanguages, collection?.lang]);

  const nameValue = form.watch("name");
  const { data: nameCheck } = useQuery({
    queryKey: ["collections", "check-name", nameValue, collection?.guid],
    queryFn: () => checkCollectionName(nameValue, collection?.guid),
    enabled: !!collection && !!nameValue?.trim(),
    staleTime: 0,
  });

  useEffect(() => {
    if (!collection || !nameValue?.trim()) return;
    if (nameCheck?.success && nameCheck.data && !nameCheck.data.available) {
      form.setError("name", {
        type: "taken",
        message: t("createDialog.duplicateName"),
      });
    } else {
      form.clearErrors("name");
    }
  }, [collection, nameValue, nameCheck, form, t]);

  const handleSubmit = useCallback(
    async (values: EditCollectionFormValues) => {
      if (!collection) return;
      await updateCollection(collection.guid, {
        ...values,
        name: values.name.trim(),
      });
      onClose();
    },
    [collection, updateCollection, onClose],
  );

  return (
    <DynamicDialog
      open={!!collection}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("editDialog.title")}
      description={t("editDialog.description")}
      trigger={<span />}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            {t("createDialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="edit-collection-form"
            disabled={
              !form.formState.isValid || !form.formState.isDirty || isMutating
            }
          >
            {isMutating && <IconLoader2 className="size-4 animate-spin" />}
            {t("editDialog.submit")}
          </Button>
        </>
      }
      footerClassName="flex-col-reverse md:flex-row"
    >
      <form
        id="edit-collection-form"
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="edit-collection-name">
                {t("createDialog.nameLabel")}
              </FieldLabel>
              <Input
                {...field}
                id="edit-collection-name"
                aria-invalid={fieldState.invalid}
                autoFocus
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
              <FieldLabel htmlFor="edit-collection-lang">
                {t("createDialog.langLabel")}
              </FieldLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="edit-collection-lang"
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
        <Controller
          name="matchAllLanguages"
          control={form.control}
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <label className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-medium">
                  {t("createDialog.matchAllLanguagesLabel")}
                  <Badge variant="outline">
                    {t("createDialog.experimental")}
                  </Badge>
                </span>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={gameLanguages.length <= 1}
                />
              </label>
              <p className="text-2xs text-foreground/70">
                {t("createDialog.matchAllLanguagesDescription")}
              </p>
            </div>
          )}
        />
      </form>
    </DynamicDialog>
  );
}
