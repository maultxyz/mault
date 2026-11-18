import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { OptionalNumberInput } from "@/features/storage/components/optional-number-input";
import { EMPTY_STORAGE_LOCATION_NAME_FORM } from "@/lib/constants/storage";
import type { StorageLocationNameDialogProps } from "@/lib/interfaces/storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  STORAGE_LOCATION_BATCH_SIZE_MAX,
  STORAGE_LOCATION_CAPACITY_MAX,
  storageLocationNameFormSchema,
  type StorageLocationNameFormValues,
} from "@magic-vault/shared";

export function StorageLocationNameDialog({
  open,
  onOpenChange,
  initialValues = EMPTY_STORAGE_LOCATION_NAME_FORM,
  title,
  submitLabel,
  onSubmit,
}: StorageLocationNameDialogProps) {
  const { t } = useTranslation("storage");
  const form = useForm<StorageLocationNameFormValues>({
    resolver: zodResolver(storageLocationNameFormSchema),
    defaultValues: initialValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (open) form.reset(initialValues);
  }, [open, initialValues, form]);

  const handleSubmit = async (values: StorageLocationNameFormValues) => {
    if (await onSubmit(values)) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          id="storage-location-name-form"
          className="flex flex-col gap-3 md:gap-2"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="storage-location-name">
                  {t("nameDialog.label")}
                </FieldLabel>
                <Input
                  {...field}
                  id="storage-location-name"
                  placeholder={t("nameDialog.placeholder")}
                  aria-invalid={fieldState.invalid}
                  autoFocus
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <div className="grid grid-cols-2 gap-3 md:gap-2">
            <Controller
              name="capacity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="storage-location-capacity">
                    {t("sizes.capacityLabel")}
                  </FieldLabel>
                  <OptionalNumberInput
                    id="storage-location-capacity"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    max={STORAGE_LOCATION_CAPACITY_MAX}
                    placeholder={t("sizes.noLimit")}
                    invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="batchSize"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="storage-location-batch-size">
                    {t("sizes.batchSizeLabel")}
                  </FieldLabel>
                  <OptionalNumberInput
                    id="storage-location-batch-size"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    max={STORAGE_LOCATION_BATCH_SIZE_MAX}
                    placeholder={t("sizes.noBatches")}
                    invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </div>
          <FieldDescription>{t("sizes.description")}</FieldDescription>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("nameDialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="storage-location-name-form"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <IconLoader2 className="animate-spin" />
            )}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
