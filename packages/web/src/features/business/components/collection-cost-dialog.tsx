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
import { Switch } from "@/components/ui/switch";
import { setCollectionCost } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import { NumberInput } from "@/features/business/components/number-input";
import { COST_MODES } from "@/lib/constants/business";
import type { CollectionCostDialogProps } from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import {
  collectionCostSchema,
  type CollectionCostFormValues,
} from "@/schemas/business.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function CollectionCostDialog({
  collection,
  onOpenChange,
}: CollectionCostDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const form = useForm<CollectionCostFormValues>({
    resolver: zodResolver(collectionCostSchema),
    defaultValues: { total: Number.NaN, mode: "spread", overwrite: false },
  });

  useEffect(() => {
    if (collection) {
      form.reset({ total: Number.NaN, mode: "spread", overwrite: false });
    }
  }, [collection, form]);

  const submit = async (values: CollectionCostFormValues) => {
    if (!collection) return;
    const result = await run(() => setCollectionCost(collection.guid, values));
    if (result?.data) {
      toast.success(t("cost.saved", { count: result.data.updated }));
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={!!collection} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cost.title")}</DialogTitle>
          <DialogDescription>
            {t("cost.description", { name: collection?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="collection-cost-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(submit)}
        >
          <Controller
            control={form.control}
            name="mode"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("cost.mode")}</FieldLabel>
                <ResponsiveSegmented
                  label={t("cost.mode")}
                  items={COST_MODES.map((mode) => ({
                    key: mode,
                    label: t(`cost.modes.${mode}`),
                  }))}
                  value={field.value}
                  onChange={field.onChange}
                />
                <p className="text-xs text-foreground/70">
                  {t(`cost.modeHints.${field.value}`)}
                </p>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="total"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="cost-total">{t("cost.amount")}</FieldLabel>
                <NumberInput
                  id="cost-total"
                  min={0}
                  step={0.01}
                  autoFocus
                  value={field.value}
                  onChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="overwrite"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3">
                <span className="flex flex-col">
                  <span className="text-sm">{t("cost.overwrite")}</span>
                  <span className="text-xs text-foreground/70">
                    {t("cost.overwriteHint")}
                  </span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            form="collection-cost-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("cost.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
