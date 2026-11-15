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
import { updateOrderBins } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import { NumberInput } from "@/features/business/components/number-input";
import type { OrderBinsDialogProps } from "@/lib/interfaces/business";
import {
  orderBinsSchema,
  type OrderBinsFormValues,
} from "@/schemas/business.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  autoAssignOrderBins,
  orderRefsOf,
  orderSortCatchAllBin,
} from "@magic-vault/shared";
import { IconLoader2, IconWand } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function OrderBinsDialog({
  order,
  open,
  onOpenChange,
}: OrderBinsDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const orderRefs = orderRefsOf(order.lines);
  const form = useForm<OrderBinsFormValues>({
    resolver: zodResolver(orderBinsSchema(order.binCount)),
    defaultValues: { bins: [] },
  });
  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "bins",
  });

  useEffect(() => {
    if (!open) return;
    const refs = orderRefsOf(order.lines);
    form.reset({
      bins: refs.map((orderRef) => ({
        orderRef,
        binNumber: order.orderBins[orderRef] ?? Number.NaN,
      })),
    });
  }, [open, order, form]);

  const autoAssign = () => {
    const current = Object.fromEntries(
      form
        .getValues("bins")
        .filter((bin) => Number.isInteger(bin.binNumber))
        .map((bin) => [bin.orderRef, bin.binNumber]),
    );
    const assigned = autoAssignOrderBins(orderRefs, current, order.binCount);
    replace(
      orderRefs.map((orderRef) => ({
        orderRef,
        binNumber: assigned[orderRef] ?? Number.NaN,
      })),
    );
  };

  const submit = async (values: OrderBinsFormValues) => {
    const result = await run(
      () =>
        updateOrderBins(order.guid, {
          orderBins: Object.fromEntries(
            values.bins.map((bin) => [bin.orderRef, bin.binNumber]),
          ),
        }),
      t("orders.orderBinsSaved"),
    );
    if (result) onOpenChange(false);
  };

  const tooManyOrders = orderRefs.length > order.binCount - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("orders.orderBinsTitle")}</DialogTitle>
          <DialogDescription>
            {t("orders.orderBinsDescription", {
              catchAll: orderSortCatchAllBin(order.binCount),
            })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="order-bins-form"
          className="flex min-h-0 flex-col gap-4 md:gap-2"
          onSubmit={form.handleSubmit(submit)}
        >
          <div>
            <Button type="button" variant="outline" onClick={autoAssign}>
              <IconWand />
              {t("orders.autoAssignBins")}
            </Button>
          </div>
          {tooManyOrders && (
            <p role="status" className="text-xs text-foreground/70">
              {t("orders.tooManyOrders", {
                count: order.binCount - 1,
              })}
            </p>
          )}
          <ul className="flex max-h-[50svh] flex-col divide-y divide-border overflow-y-auto rounded-lg bg-foreground/6">
            {fields.map((binField, index) => (
              <Controller
                key={binField.id}
                name={`bins.${index}.binNumber`}
                control={form.control}
                render={({ field, fieldState }) => (
                  <li className="px-2.5 py-1.5">
                    <Field
                      orientation="horizontal"
                      data-invalid={fieldState.invalid || undefined}
                    >
                      <FieldLabel
                        htmlFor={`order-bin-${index}`}
                        className="min-w-0 flex-1 truncate"
                      >
                        {t("orders.orderRefLabel", { order: binField.orderRef })}
                      </FieldLabel>
                      <NumberInput
                        id={`order-bin-${index}`}
                        inputMode="numeric"
                        min={1}
                        max={order.binCount - 1}
                        className="w-20 tabular-nums"
                        aria-invalid={fieldState.invalid}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </Field>
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </li>
                )}
              />
            ))}
          </ul>
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
            form="order-bins-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            )}
            {t("orders.saveOrderBins")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
