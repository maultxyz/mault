import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { StoragePickListFormProps } from "@/lib/interfaces/storage";
import {
  storagePickListFormSchema,
  type StoragePickListFormValues,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconSearch } from "@tabler/icons-react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function StoragePickListForm({
  initialDecklist,
  onSubmit,
  onCancel,
}: StoragePickListFormProps) {
  const { t } = useTranslation("storage");
  const { t: tCommon } = useTranslation("common");
  const form = useForm<StoragePickListFormValues>({
    resolver: zodResolver(storagePickListFormSchema),
    defaultValues: { decklist: initialDecklist },
  });

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={form.handleSubmit((values) => onSubmit(values.decklist))}
    >
      <Controller
        name="decklist"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid || undefined}>
            <FieldLabel htmlFor="storage-pick-list-decklist">
              {t("pickList.decklistLabel")}
            </FieldLabel>
            <Textarea
              {...field}
              id="storage-pick-list-decklist"
              rows={12}
              autoFocus
              placeholder={t("pickList.decklistPlaceholder")}
              aria-invalid={fieldState.invalid}
              className="font-mono"
            />
            <FieldDescription>{t("pickList.decklistHint")}</FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <div className="flex justify-end gap-1.5">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon("actions.cancel")}
          </Button>
        )}
        <Button type="submit">
          <IconSearch />
          {t("pickList.findCards")}
        </Button>
      </div>
    </form>
  );
}
