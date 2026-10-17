import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import type { SorterWifiDialogProps } from "@/lib/interfaces/sorter-wifi";
import {
  createSorterWifiSchema,
  type SorterWifiFormValues,
} from "@/schemas/sorter-wifi.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function SorterWifiDialog({
  open,
  onOpenChange,
  defaultSsid,
  onSubmit,
}: SorterWifiDialogProps) {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const form = useForm<SorterWifiFormValues>({
    resolver: zodResolver(createSorterWifiSchema(t)),
    defaultValues: { ssid: defaultSsid ?? "", password: "" },
  });

  useEffect(() => {
    if (open) form.reset({ ssid: defaultSsid ?? "", password: "" });
  }, [open, defaultSsid, form]);

  async function submit(values: SorterWifiFormValues) {
    const result = await onSubmit(values);
    if (result.ok) {
      toast.success(t("sorterWifi.saved"));
      onOpenChange(false);
      return;
    }
    toast.error(t("sorterWifi.saveFailed"), {
      description: result.error ?? t("sorterWifi.saveFailedDescription"),
    });
  }

  const { errors, isSubmitting } = form.formState;

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("sorterWifi.dialogTitle")}
      description={t("sorterWifi.dialogDescription")}
      footer={
        <Button type="submit" form="sorter-wifi-form" disabled={isSubmitting}>
          {isSubmitting && <IconLoader2 className="animate-spin" />}
          {t("sorterWifi.save")}
        </Button>
      }
    >
      <form
        id="sorter-wifi-form"
        onSubmit={form.handleSubmit(submit)}
        className="flex flex-col gap-3"
      >
        <Field data-invalid={!!errors.ssid}>
          <FieldLabel htmlFor="sorter-wifi-ssid">
            {t("sorterWifi.ssid")}
          </FieldLabel>
          <Input
            id="sorter-wifi-ssid"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            {...form.register("ssid")}
          />
          <FieldError errors={[errors.ssid]} />
        </Field>
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="sorter-wifi-password">
            {t("sorterWifi.password")}
          </FieldLabel>
          <Input
            id="sorter-wifi-password"
            type="password"
            autoComplete="off"
            {...form.register("password")}
          />
          <FieldDescription>{t("sorterWifi.passwordHint")}</FieldDescription>
          <FieldError errors={[errors.password]} />
        </Field>
      </form>
    </DynamicDialog>
  );
}
