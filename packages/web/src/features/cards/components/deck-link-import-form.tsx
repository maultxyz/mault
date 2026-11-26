import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useDeckLinkImport } from "@/features/cards/api/use-deck-link-import";
import type { DeckLinkImportFormProps } from "@/lib/interfaces/cards";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  deckLinkImportRequestSchema,
  type DeckLinkImportRequest,
} from "@magic-vault/shared";
import { IconAlertTriangle, IconLink, IconLoader2 } from "@tabler/icons-react";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function DeckLinkImportForm({
  initialDeckLink,
  disabled = false,
  onDeckLoaded,
}: DeckLinkImportFormProps) {
  const { t } = useTranslation("cards");
  const inputId = useId();
  const { loadDeck, isLoading, failure } = useDeckLinkImport(onDeckLoaded);
  const form = useForm<DeckLinkImportRequest>({
    resolver: zodResolver(deckLinkImportRequestSchema),
    defaultValues: { url: initialDeckLink ?? "" },
  });

  useEffect(() => {
    if (!initialDeckLink) return;
    form.setValue("url", initialDeckLink);
    loadDeck(initialDeckLink);
  }, [initialDeckLink, form, loadDeck]);

  return (
    <form
      onSubmit={form.handleSubmit(({ url }) => loadDeck(url))}
      className="flex flex-col gap-2"
    >
      <Field data-invalid={!!form.formState.errors.url}>
        <FieldLabel htmlFor={inputId}>{t("importCsv.deckLink.label")}</FieldLabel>
        <div className="flex gap-1.5">
          <Input
            id={inputId}
            type="url"
            inputMode="url"
            placeholder={t("importCsv.deckLink.placeholder")}
            disabled={disabled || isLoading}
            {...form.register("url")}
          />
          <Button type="submit" variant="outline" disabled={disabled || isLoading}>
            {isLoading ? <IconLoader2 className="animate-spin" /> : <IconLink />}
            {t("importCsv.deckLink.load")}
          </Button>
        </div>
        <FieldError errors={[form.formState.errors.url]} />
      </Field>
      {isLoading && (
        <p role="status" className="sr-only">
          {t("importCsv.deckLink.loading")}
        </p>
      )}
      {failure && (
        <Callout variant="error" icon={IconAlertTriangle}>
          <span role="alert">{t(`importCsv.deckLink.failure.${failure}`)}</span>
        </Callout>
      )}
    </form>
  );
}
