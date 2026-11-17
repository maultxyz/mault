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
import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { createAccuracyCheck } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import type { StartCheckDialogProps } from "@/lib/interfaces/business";
import {
  accuracyCheckSchema,
  type AccuracyCheckFormValues,
} from "@/schemas/business.schema";
import {
  ACCURACY_DEFAULT_SAMPLE_SIZE,
  ACCURACY_SAMPLE_SIZES,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function StartCheckDialog({
  collectionGuid,
  collectionName,
  open,
  onOpenChange,
  onStarted,
}: StartCheckDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const form = useForm<AccuracyCheckFormValues>({
    resolver: zodResolver(accuracyCheckSchema),
    defaultValues: {
      sampleSize: ACCURACY_DEFAULT_SAMPLE_SIZE,
      unreviewedOnly: true,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ sampleSize: ACCURACY_DEFAULT_SAMPLE_SIZE, unreviewedOnly: true });
    }
  }, [open, form]);

  const submit = async (values: AccuracyCheckFormValues) => {
    const result = await run(() =>
      createAccuracyCheck({ collectionGuid, intakeLotGuid: null, ...values }),
    );
    if (result?.data) {
      onOpenChange(false);
      onStarted(result.data.guid);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("accuracy.startTitle")}</DialogTitle>
          <DialogDescription>
            {t("accuracy.startDescription", { name: collectionName })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="start-check-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(submit)}
        >
          <Controller
            control={form.control}
            name="sampleSize"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t("accuracy.sampleSize")}</FieldLabel>
                <ResponsiveSegmented
                  label={t("accuracy.sampleSize")}
                  items={ACCURACY_SAMPLE_SIZES.map((size) => ({
                    key: String(size),
                    label: t("accuracy.sampleCards", { count: size }),
                  }))}
                  value={String(field.value)}
                  onChange={(value) => field.onChange(Number(value))}
                />
                <p className="text-xs text-foreground/70">
                  {t("accuracy.sampleHint")}
                </p>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="unreviewedOnly"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">{t("accuracy.unreviewedOnly")}</span>
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
            form="start-check-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("accuracy.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
