import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import type { WebhookDialogProps } from "@/lib/interfaces/integrations";
import {
  webhookSchema,
  type WebhookFormValues,
} from "@/schemas/webhook.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { WEBHOOK_EVENTS } from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function WebhookDialog({
  open,
  onOpenChange,
  endpoint,
  isSaving,
  onSubmit,
}: WebhookDialogProps) {
  const { t } = useTranslation("integrations");
  const form = useForm<WebhookFormValues>({
    resolver: zodResolver(webhookSchema),
    defaultValues: { url: "", description: "", events: [...WEBHOOK_EVENTS] },
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (!open) return;
    form.reset({
      url: endpoint?.url ?? "",
      description: endpoint?.description ?? "",
      events: endpoint?.events ?? [...WEBHOOK_EVENTS],
    });
  }, [open, endpoint, form]);

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={endpoint ? t("webhooks.editTitle") : t("webhooks.addTitle")}
      description={t("webhooks.dialogDescription")}
      footer={
        <Button
          type="submit"
          form="webhook-form"
          disabled={isSaving}
          className="w-full"
        >
          {isSaving && <IconLoader2 className="animate-spin" />}
          {endpoint ? t("webhooks.save") : t("webhooks.add")}
        </Button>
      }
    >
      <form
        id="webhook-form"
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((values) =>
          onSubmit({
            url: values.url,
            description: values.description || null,
            events: values.events,
          }),
        )}
      >
        <Field data-invalid={!!errors.url}>
          <FieldLabel htmlFor="webhook-url">{t("webhooks.urlLabel")}</FieldLabel>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://shop.example.com/mault-webhook"
            autoFocus
            {...form.register("url")}
          />
          <FieldError
            errors={[errors.url && { message: t("webhooks.invalidUrl") }]}
          />
        </Field>
        <Field data-invalid={!!errors.description}>
          <FieldLabel htmlFor="webhook-description">
            {t("webhooks.descriptionLabel")}
          </FieldLabel>
          <Input
            id="webhook-description"
            placeholder={t("webhooks.descriptionPlaceholder")}
            {...form.register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>
        <Field data-invalid={!!errors.events}>
          <FieldLabel>{t("webhooks.eventsLabel")}</FieldLabel>
          <Controller
            control={form.control}
            name="events"
            render={({ field }) => (
              <div className="divide-y rounded-lg border">
                {WEBHOOK_EVENTS.map((event) => {
                  const id = `webhook-event-${event}`;
                  return (
                    <div
                      key={event}
                      className="flex items-start gap-3 px-3 py-2.5"
                    >
                      <Checkbox
                        id={id}
                        checked={field.value.includes(event)}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            WEBHOOK_EVENTS.filter((e) =>
                              e === event ? checked : field.value.includes(e),
                            ),
                          )
                        }
                        className="mt-0.5"
                      />
                      <label htmlFor={id} className="flex min-w-0 flex-col">
                        <code className="text-sm font-medium">{event}</code>
                        <span className="text-xs text-foreground/70">
                          {t(`webhooks.events.${event}`)}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}
          />
          <FieldError
            errors={[
              errors.events && { message: t("webhooks.eventsRequired") },
            ]}
          />
        </Field>
      </form>
    </DynamicDialog>
  );
}
