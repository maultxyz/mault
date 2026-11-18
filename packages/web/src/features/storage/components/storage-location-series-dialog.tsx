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
import { OptionalNumberInput } from "@/features/storage/components/optional-number-input";
import {
  DEFAULT_STORAGE_LOCATION_SERIES_FORM,
  STORAGE_LOCATION_SERIES_PREVIEW_MAX,
} from "@/lib/constants/storage";
import type { StorageLocationSeriesDialogProps } from "@/lib/interfaces/storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  STORAGE_LOCATION_BATCH_SIZE_MAX,
  STORAGE_LOCATION_CAPACITY_MAX,
  STORAGE_LOCATION_SERIES_COUNT_MAX,
  STORAGE_LOCATION_SERIES_START_MAX,
  storageLocationSeriesFormSchema,
  storageLocationSeriesNames,
  type StorageLocationSeriesFormValues,
} from "@magic-vault/shared";

export function StorageLocationSeriesDialog({
  open,
  onOpenChange,
  createSeries,
}: StorageLocationSeriesDialogProps) {
  const { t } = useTranslation("storage");
  const form = useForm<StorageLocationSeriesFormValues>({
    resolver: zodResolver(storageLocationSeriesFormSchema),
    defaultValues: DEFAULT_STORAGE_LOCATION_SERIES_FORM,
    mode: "onChange",
  });
  const [prefix, firstNumber, count] = useWatch({
    control: form.control,
    name: ["prefix", "firstNumber", "count"],
  });

  useEffect(() => {
    if (open) form.reset(DEFAULT_STORAGE_LOCATION_SERIES_FORM);
  }, [open, form]);

  const previewNames =
    form.formState.isValid && prefix.trim()
      ? storageLocationSeriesNames(prefix, firstNumber, count)
      : [];
  const preview =
    previewNames.length > STORAGE_LOCATION_SERIES_PREVIEW_MAX
      ? t("series.previewRange", {
          first: previewNames[0],
          last: previewNames[previewNames.length - 1],
          count: previewNames.length,
        })
      : previewNames.join(", ");

  const handleSubmit = async (values: StorageLocationSeriesFormValues) => {
    if (await createSeries(values)) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("series.title")}</DialogTitle>
          <DialogDescription>{t("series.description")}</DialogDescription>
        </DialogHeader>
        <form
          id="storage-location-series-form"
          className="flex flex-col gap-3 md:gap-2"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <Controller
            name="prefix"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="storage-series-prefix">
                  {t("series.prefixLabel")}
                </FieldLabel>
                <Input
                  {...field}
                  id="storage-series-prefix"
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
              name="firstNumber"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="storage-series-first-number">
                    {t("series.firstNumberLabel")}
                  </FieldLabel>
                  <Input
                    id="storage-series-first-number"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={STORAGE_LOCATION_SERIES_START_MAX}
                    aria-invalid={fieldState.invalid}
                    value={Number.isFinite(field.value) ? field.value : ""}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.valueAsNumber)
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="count"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="storage-series-count">
                    {t("series.countLabel")}
                  </FieldLabel>
                  <Input
                    id="storage-series-count"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={STORAGE_LOCATION_SERIES_COUNT_MAX}
                    aria-invalid={fieldState.invalid}
                    value={Number.isFinite(field.value) ? field.value : ""}
                    onBlur={field.onBlur}
                    onChange={(event) =>
                      field.onChange(event.target.valueAsNumber)
                    }
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="capacity"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="storage-series-capacity">
                    {t("sizes.capacityLabel")}
                  </FieldLabel>
                  <OptionalNumberInput
                    id="storage-series-capacity"
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
                  <FieldLabel htmlFor="storage-series-batch-size">
                    {t("sizes.batchSizeLabel")}
                  </FieldLabel>
                  <OptionalNumberInput
                    id="storage-series-batch-size"
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
          {preview && (
            <p className="rounded-lg bg-foreground/6 px-2.5 py-2 text-xs">
              <span className="font-medium">{t("series.previewLabel")}</span>{" "}
              {preview}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("nameDialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="storage-location-series-form"
            disabled={!form.formState.isValid || form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && (
              <IconLoader2 className="animate-spin" />
            )}
            {t("series.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
