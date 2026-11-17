import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateOrder } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import type { OrderEditDialogProps } from "@/lib/interfaces/business";
import {
  orderEditSchema,
  type OrderEditFormValues,
} from "@/schemas/business.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addOrderLines,
  ORDER_LINE_QUANTITY_MAX,
  orderLineLabel,
  parseOrderImport,
  toOrderLineInput,
} from "@magic-vault/shared";
import { IconLoader2, IconPlus, IconTrash } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function OrderEditDialog({
  order,
  open,
  onOpenChange,
}: OrderEditDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const form = useForm<OrderEditFormValues>({
    resolver: zodResolver(orderEditSchema),
    defaultValues: { name: "", lines: [], cardsToAdd: "" },
  });
  const { fields, replace, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });
  const lines = useWatch({ control: form.control, name: "lines" });
  const cardsToAdd = useWatch({ control: form.control, name: "cardsToAdd" });
  const linesToAdd = parseOrderImport(cardsToAdd ?? "").lines;

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: order.name,
      lines: order.lines.map(toOrderLineInput),
      cardsToAdd: "",
    });
  }, [open, order, form]);

  const addCards = () => {
    if (linesToAdd.length === 0) return;
    replace(addOrderLines(lines, linesToAdd));
    form.setValue("cardsToAdd", "");
  };

  const submit = async (values: OrderEditFormValues) => {
    const result = await run(
      () =>
        updateOrder(order.guid, {
          name: values.name,
          lines: addOrderLines(
            values.lines,
            parseOrderImport(values.cardsToAdd).lines,
          ),
        }),
      t("orders.edited"),
    );
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("orders.editTitle")}</DialogTitle>
          <DialogDescription>{t("orders.editDescription")}</DialogDescription>
        </DialogHeader>
        <form
          id="order-edit-form"
          className="flex min-h-0 flex-col gap-4"
          onSubmit={form.handleSubmit(submit)}
        >
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="order-edit-name">{t("orders.name")}</FieldLabel>
                <Input
                  {...field}
                  id="order-edit-name"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Field data-invalid={!!form.formState.errors.lines || undefined}>
            <FieldLabel>{t("orders.lines")}</FieldLabel>
            <ul className="flex max-h-[40svh] flex-col divide-y overflow-y-auto rounded-lg border">
              {fields.map((lineField, index) => (
                <Controller
                  key={lineField.id}
                  name={`lines.${index}.quantity`}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <li className="flex flex-col gap-1 px-2.5 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {orderLineLabel(lineField)}
                          {lineField.condition && (
                            <span className="ml-1.5 text-xs text-foreground/70">
                              {lineField.condition}
                            </span>
                          )}
                          {lineField.isFoil && (
                            <span className="ml-1.5 text-xs text-foreground/70">
                              {t("table.foil")}
                            </span>
                          )}
                        </span>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={ORDER_LINE_QUANTITY_MAX}
                          className="h-8 w-20 tabular-nums"
                          aria-label={t("orders.quantityLabel", {
                            name: lineField.name,
                          })}
                          aria-invalid={!!fieldState.error}
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={Number.isNaN(field.value) ? "" : field.value}
                          onChange={(event) =>
                            field.onChange(event.target.valueAsNumber)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("orders.removeLine", {
                            name: lineField.name,
                          })}
                          onClick={() => remove(index)}
                        >
                          <IconTrash />
                        </Button>
                      </div>
                      {fieldState.error && <FieldError errors={[fieldState.error]} />}
                    </li>
                  )}
                />
              ))}
            </ul>
            {form.formState.errors.lines?.message && (
              <FieldError errors={[form.formState.errors.lines]} />
            )}
          </Field>
          <Controller
            name="cardsToAdd"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="order-edit-add">{t("orders.addCardsLabel")}</FieldLabel>
                <Textarea
                  {...field}
                  id="order-edit-add"
                  rows={3}
                  className="font-mono"
                  placeholder={t("orders.addCardsPlaceholder")}
                />
                <FieldDescription>{t("orders.addCardsHint")}</FieldDescription>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={linesToAdd.length === 0}
                    onClick={addCards}
                  >
                    <IconPlus />
                    {t("orders.addCards")}
                  </Button>
                </div>
              </Field>
            )}
          />
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {t("actions.back")}
          </Button>
          <Button
            type="submit"
            form="order-edit-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            )}
            {t("orders.saveEdit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
