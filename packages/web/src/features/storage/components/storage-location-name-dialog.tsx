import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { StorageLocationNameDialogProps } from "@/lib/interfaces/storage";
import {
  storageLocationNameSchema,
  type StorageLocationNameFormValues,
} from "@/schemas/storage.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function StorageLocationNameDialog({
  open,
  onOpenChange,
  initialName = "",
  title,
  submitLabel,
  onSubmit,
}: StorageLocationNameDialogProps) {
  const { t } = useTranslation("storage");
  const form = useForm<StorageLocationNameFormValues>({
    resolver: zodResolver(storageLocationNameSchema),
    defaultValues: { name: initialName },
    mode: "onChange",
  });

  useEffect(() => {
    if (open) form.reset({ name: initialName });
  }, [open, initialName, form]);

  const handleSubmit = async (values: StorageLocationNameFormValues) => {
    if (await onSubmit(values.name)) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          id="storage-location-name-form"
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
