import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  createCustomShortLink,
  updateCustomShortLink,
} from "@/features/admin/api/short-links";
import {
  CUSTOM_SHORT_LINK_FORM_ID,
  EMPTY_CUSTOM_SHORT_LINK_FORM,
} from "@/lib/constants/admin";
import type { CustomShortLinkDialogProps } from "@/lib/interfaces/admin";
import { toast } from "@/lib/toast";
import {
  buildShortenerUrl,
  customShortLinkFormSchema,
  type CustomShortLinkFormValues,
} from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function CustomShortLinkDialog({
  open,
  onOpenChange,
  shortLinkBaseUrl,
  link,
  onSaved,
}: CustomShortLinkDialogProps) {
  const { t } = useTranslation("admin");
  const isEditing = !!link;
  const form = useForm<CustomShortLinkFormValues>({
    resolver: zodResolver(customShortLinkFormSchema),
    defaultValues: link
      ? { code: link.code, targetUrl: link.targetUrl }
      : EMPTY_CUSTOM_SHORT_LINK_FORM,
  });
  const code = form.watch("code").trim().toLowerCase();

  async function handleSubmit(values: CustomShortLinkFormValues) {
    const result = await (link
      ? updateCustomShortLink(link.code, { targetUrl: values.targetUrl })
      : createCustomShortLink(values)
    ).catch(() => null);
    if (!result) {
      toast.error(t("shortLinks.saveFailed"));
      return;
    }
    if (!result.success) {
      if (result.reason === "codeTaken") {
        form.setError("code", { message: t("shortLinks.failures.codeTaken") });
        return;
      }
      toast.error(
        result.reason ? t(`shortLinks.failures.${result.reason}`) : t("shortLinks.saveFailed"),
      );
      return;
    }
    toast.success(isEditing ? t("shortLinks.updated") : t("shortLinks.created"));
    await onSaved();
    onOpenChange(false);
  }

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEditing ? t("shortLinks.editTitle") : t("shortLinks.createTitle")}
      description={t("shortLinks.dialogDescription")}
      footer={
        <Button
          type="submit"
          form={CUSTOM_SHORT_LINK_FORM_ID}
          disabled={form.formState.isSubmitting}
          className="w-full"
        >
          {form.formState.isSubmitting && <IconLoader2 className="animate-spin" />}
          {isEditing ? t("shortLinks.save") : t("shortLinks.create")}
        </Button>
      }
    >
      <form
        id={CUSTOM_SHORT_LINK_FORM_ID}
        className="flex flex-col gap-4 md:gap-2"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        <Field data-invalid={!!form.formState.errors.code}>
          <FieldLabel htmlFor="custom-short-link-code">{t("shortLinks.codeLabel")}</FieldLabel>
          <Input
            id="custom-short-link-code"
            placeholder={t("shortLinks.codePlaceholder")}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            readOnly={isEditing}
            autoFocus={!isEditing}
            aria-describedby="custom-short-link-code-preview"
            {...form.register("code")}
          />
          <FieldDescription id="custom-short-link-code-preview" className="break-all">
            {buildShortenerUrl(shortLinkBaseUrl, code || t("shortLinks.codePlaceholder"))}
          </FieldDescription>
          <FieldError errors={[form.formState.errors.code]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.targetUrl}>
          <FieldLabel htmlFor="custom-short-link-target">
            {t("shortLinks.targetLabel")}
          </FieldLabel>
          <Input
            id="custom-short-link-target"
            type="url"
            inputMode="url"
            placeholder={t("shortLinks.targetPlaceholder")}
            autoComplete="off"
            autoFocus={isEditing}
            {...form.register("targetUrl")}
          />
          <FieldError errors={[form.formState.errors.targetUrl]} />
        </Field>
      </form>
    </DynamicDialog>
  );
}
