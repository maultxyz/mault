import { CardListFileButton } from "@/components/card-list-file-button";
import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Textarea } from "@/components/ui/textarea";
import { createOrder } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import type { OrderImportDialogProps } from "@/lib/interfaces/business";
import type { CardListFile } from "@/lib/interfaces/card-list-import";
import {
  orderImportSchema,
  type OrderImportFormValues,
} from "@/schemas/business.schema";
import { parseOrderImport } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function OrderImportDialog({
  open,
  onOpenChange,
  onCreated,
}: OrderImportDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const form = useForm<OrderImportFormValues>({
    resolver: zodResolver(orderImportSchema),
    defaultValues: { name: "", text: "" },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) form.reset({ name: "", text: "" });
  }, [open, form]);

  const text = useWatch({ control: form.control, name: "text" });
  const parsed = useMemo(() => parseOrderImport(text ?? ""), [text]);
  const quantity = parsed.lines.reduce((sum, line) => sum + line.quantity, 0);

  const readFile = ({ text: fileText, fileName }: CardListFile) => {
    form.setValue("text", fileText, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (!form.getValues("name")) {
      form.setValue("name", fileName.replace(/\.[^.]+$/, ""), {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  const submit = async (values: OrderImportFormValues) => {
    const result = await run(
      () =>
        createOrder({
          name: values.name,
          source: parsed.source,
          lines: parsed.lines,
        }),
      t("orders.created"),
    );
    if (result?.data) {
      onOpenChange(false);
      onCreated(result.data.guid);
    }
  };

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      className="sm:max-w-2xl"
      title={t("orders.importTitle")}
      description={t("orders.importDescription")}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            form="order-import-form"
            disabled={
              !form.formState.isValid ||
              form.formState.isSubmitting ||
              parsed.lines.length === 0
            }
          >
            {form.formState.isSubmitting && (
              <IconLoader2 className="animate-spin" />
            )}
            {t("orders.import")}
          </Button>
        </>
      }
    >
      <form
        id="order-import-form"
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit(submit)}
      >
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor="order-name">{t("orders.name")}</FieldLabel>
              <Input
                {...field}
                id="order-name"
                placeholder={t("orders.namePlaceholder")}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="text"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor="order-text">
                  {t("orders.contents")}
                </FieldLabel>
                <CardListFileButton onFileRead={readFile} />
              </div>
              <Textarea
                {...field}
                id="order-text"
                rows={10}
                className="max-h-[40svh] overflow-y-auto font-mono max-md:max-h-[30svh]"
                placeholder={t("orders.contentsPlaceholder")}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {text?.trim() && (
          <Callout variant={parsed.lines.length > 0 ? "info" : "warning"}>
            {parsed.lines.length > 0
              ? t("orders.preview", {
                  source: t(`orders.sources.${parsed.source}`),
                  lines: parsed.lines.length,
                  quantity,
                })
              : t("orders.previewEmpty")}
            {parsed.skipped > 0 &&
              ` ${t("orders.previewSkipped", { count: parsed.skipped })}`}
          </Callout>
        )}
      </form>
    </DynamicDialog>
  );
}
