import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { OptionalNumberInput } from "@/features/storage/components/optional-number-input";
import {
  EMPTY_STORAGE_LOCATION_BULK_SIZES_FORM,
  STORAGE_LOCATION_BULK_SIZES_FORM_ID,
} from "@/lib/constants/storage";
import type { StorageLocationBulkSizesDialogProps } from "@/lib/interfaces/storage";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  storageLocationBulkSizesFormSchema,
  type StorageLocationBulkSizesFormValues,
  STORAGE_LOCATION_BATCH_SIZE_MAX,
  STORAGE_LOCATION_CAPACITY_MAX,
} from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function StorageLocationBulkSizesDialog({
  open,
  onOpenChange,
  count,
  onSubmit,
}: StorageLocationBulkSizesDialogProps) {
  const { t } = useTranslation("storage");
  const form = useForm<StorageLocationBulkSizesFormValues>({
    resolver: zodResolver(storageLocationBulkSizesFormSchema),
    defaultValues: EMPTY_STORAGE_LOCATION_BULK_SIZES_FORM,
    mode: "onChange",
  });
  const changesCapacity = form.watch("changesCapacity");
  const changesBatchSize = form.watch("changesBatchSize");

  useEffect(() => {
    if (open) form.reset(EMPTY_STORAGE_LOCATION_BULK_SIZES_FORM);
  }, [open, form]);

  const handleSubmit = async (values: StorageLocationBulkSizesFormValues) => {
    const saved = await onSubmit({
      ...(values.changesCapacity ? { capacity: values.capacity } : {}),
      ...(values.changesBatchSize ? { batchSize: values.batchSize } : {}),
    });
    if (saved) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("bulk.sizesTitle", { count })}</DialogTitle>
          <DialogDescription>{t("bulk.sizesDescription")}</DialogDescription>
        </DialogHeader>
        <form
          id={STORAGE_LOCATION_BULK_SIZES_FORM_ID}
          className="flex flex-col gap-3 md:gap-2"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <Controller
            name="changesCapacity"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  id="storage-bulk-changes-capacity"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <FieldLabel htmlFor="storage-bulk-changes-capacity">
                  {t("bulk.changeCapacity")}
                </FieldLabel>
              </Field>
            )}
          />
          {changesCapacity && (
            <Controller
              name="capacity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="storage-bulk-capacity">
                    {t("sizes.capacityLabel")}
                  </FieldLabel>
                  <OptionalNumberInput
                    id="storage-bulk-capacity"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    max={STORAGE_LOCATION_CAPACITY_MAX}
                    placeholder={t("bulk.emptyClearsCapacity")}
                    invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}
          <Controller
            name="changesBatchSize"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <Checkbox
                  id="storage-bulk-changes-batch-size"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <FieldLabel htmlFor="storage-bulk-changes-batch-size">
                  {t("bulk.changeBatchSize")}
                </FieldLabel>
              </Field>
            )}
          />
          {changesBatchSize && (
            <Controller
              name="batchSize"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="storage-bulk-batch-size">
                    {t("sizes.batchSizeLabel")}
                  </FieldLabel>
                  <OptionalNumberInput
                    id="storage-bulk-batch-size"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    max={STORAGE_LOCATION_BATCH_SIZE_MAX}
                    placeholder={t("bulk.emptyClearsBatchSize")}
                    invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("nameDialog.cancel")}
          </Button>
          <Button
            type="submit"
            form={STORAGE_LOCATION_BULK_SIZES_FORM_ID}
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            )}
            {t("bulk.applySizes", { count })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
