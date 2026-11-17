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
import { setDeviceMaintenance } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import { NumberInput } from "@/features/business/components/number-input";
import { SERVICE_INTERVAL_PRESETS } from "@/lib/constants/business";
import type { ServiceIntervalDialogProps } from "@/lib/interfaces/business";
import {
  serviceIntervalSchema,
  type ServiceIntervalFormValues,
} from "@/schemas/business.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function ServiceIntervalDialog({
  device,
  onOpenChange,
}: ServiceIntervalDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();
  const form = useForm<ServiceIntervalFormValues>({
    resolver: zodResolver(serviceIntervalSchema),
    defaultValues: { enabled: false, interval: SERVICE_INTERVAL_PRESETS[1] },
  });

  useEffect(() => {
    if (device) {
      form.reset({
        enabled: device.maintenanceIntervalCards !== null,
        interval: device.maintenanceIntervalCards ?? SERVICE_INTERVAL_PRESETS[1],
      });
    }
  }, [device, form]);

  const enabled = useWatch({ control: form.control, name: "enabled" });

  const submit = async (values: ServiceIntervalFormValues) => {
    if (!device) return;
    const result = await run(
      () =>
        setDeviceMaintenance(device.guid, {
          maintenanceIntervalCards: values.enabled ? values.interval : null,
        }),
      t("fleet.intervalSaved"),
    );
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={!!device} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("fleet.intervalTitle")}</DialogTitle>
          <DialogDescription>
            {t("fleet.intervalDescription", { name: device?.name ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="service-interval-form"
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(submit)}
        >
          <Controller
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">{t("fleet.intervalEnabled")}</span>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </label>
            )}
          />
          {enabled && (
            <Controller
              control={form.control}
              name="interval"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="service-interval">
                    {t("fleet.intervalCards")}
                  </FieldLabel>
                  <NumberInput
                    id="service-interval"
                    min={0}
                    step={500}
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={fieldState.invalid}
                  />
                  <div className="flex flex-wrap gap-1">
                    {SERVICE_INTERVAL_PRESETS.map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        onClick={() => field.onChange(preset)}
                      >
                        {preset.toLocaleString()}
                      </Button>
                    ))}
                  </div>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("actions.cancel")}
          </Button>
          <Button
            type="submit"
            form="service-interval-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
