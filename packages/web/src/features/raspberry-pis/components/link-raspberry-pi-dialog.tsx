import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { RASPBERRY_PI_LINK_FORM_ID } from "@/lib/constants/raspberry-pis";
import type { LinkRaspberryPiDialogProps } from "@/lib/interfaces/raspberry-pis";
import {
  piHostClaimFormSchema,
  type PiHostClaimFormInput,
  type PiHostClaimFormValues,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function LinkRaspberryPiDialog({ open, onOpenChange, onLink }: LinkRaspberryPiDialogProps) {
  const { t } = useTranslation("settings");
  const form = useForm<PiHostClaimFormInput, unknown, PiHostClaimFormValues>({
    resolver: zodResolver(piHostClaimFormSchema),
    defaultValues: { code: "", name: "" },
  });

  async function link(values: PiHostClaimFormValues) {
    const linked = await onLink(values).then(
      () => true,
      () => false,
    );
    if (!linked) return;
    form.reset();
    onOpenChange(false);
  }

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("raspberryPis.linkTitle")}
      description={t("raspberryPis.linkDescription")}
      footer={
        <Button
          type="submit"
          form={RASPBERRY_PI_LINK_FORM_ID}
          disabled={form.formState.isSubmitting}
          className="w-full"
        >
          {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
          {t("raspberryPis.link")}
        </Button>
      }
    >
      <form
        id={RASPBERRY_PI_LINK_FORM_ID}
        className="flex flex-col gap-4 md:gap-2"
        onSubmit={form.handleSubmit(link)}
      >
        <Field data-invalid={!!form.formState.errors.code}>
          <FieldLabel htmlFor="raspberry-pi-code">{t("raspberryPis.codeLabel")}</FieldLabel>
          <Input
            id="raspberry-pi-code"
            placeholder={t("raspberryPis.codePlaceholder")}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            autoFocus
            {...form.register("code")}
          />
          <FieldDescription>{t("raspberryPis.codeDescription")}</FieldDescription>
          <FieldError errors={[form.formState.errors.code]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.name}>
          <FieldLabel htmlFor="raspberry-pi-name">{t("raspberryPis.nameLabel")}</FieldLabel>
          <Input
            id="raspberry-pi-name"
            placeholder={t("raspberryPis.namePlaceholder")}
            {...form.register("name")}
          />
          <FieldError errors={[form.formState.errors.name]} />
        </Field>
      </form>
    </DynamicDialog>
  );
}
