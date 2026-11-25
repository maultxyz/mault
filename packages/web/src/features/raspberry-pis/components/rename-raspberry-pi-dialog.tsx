import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { RASPBERRY_PI_RENAME_FORM_ID } from "@/lib/constants/raspberry-pis";
import type { RenameRaspberryPiDialogProps } from "@/lib/interfaces/raspberry-pis";
import { piHostNameFormSchema, type PiHostNameFormValues } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function RenameRaspberryPiDialog({ host, onOpenChange, onRename }: RenameRaspberryPiDialogProps) {
  const { t } = useTranslation("settings");
  const form = useForm<PiHostNameFormValues>({
    resolver: zodResolver(piHostNameFormSchema),
    values: { name: host?.name ?? "" },
  });

  async function rename(values: PiHostNameFormValues) {
    if (!host) return;
    const renamed = await onRename(host.guid, values.name).then(
      () => true,
      () => false,
    );
    if (renamed) onOpenChange(false);
  }

  return (
    <DynamicDialog
      open={!!host}
      onOpenChange={onOpenChange}
      title={t("raspberryPis.renameTitle")}
      footer={
        <Button
          type="submit"
          form={RASPBERRY_PI_RENAME_FORM_ID}
          disabled={form.formState.isSubmitting}
          className="w-full"
        >
          {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
          {t("raspberryPis.rename")}
        </Button>
      }
    >
      <form id={RASPBERRY_PI_RENAME_FORM_ID} className="flex flex-col gap-4 md:gap-2" onSubmit={form.handleSubmit(rename)}>
        <Field data-invalid={!!form.formState.errors.name}>
          <FieldLabel htmlFor="raspberry-pi-rename">{t("raspberryPis.nameLabel")}</FieldLabel>
          <Input id="raspberry-pi-rename" autoFocus {...form.register("name")} />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
      </form>
    </DynamicDialog>
  );
}
