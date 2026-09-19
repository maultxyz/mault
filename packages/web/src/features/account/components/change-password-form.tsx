import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SaveBar } from "@/components/save-bar";
import { Switch } from "@/components/ui/switch";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { neon } from "@/lib/auth/client";
import {
  createChangePasswordSchema,
  type ChangePasswordFormValues,
} from "@/schemas/account.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function ChangePasswordForm() {
  const { t } = useTranslation("account");
  const passwordSchema = createChangePasswordSchema(t);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      revokeOtherSessions: false,
    },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    try {
      const { error } = await neon.auth.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: values.revokeOtherSessions,
      });
      if (error) throw new Error(error.message);
      form.reset();
      toast.success(t("password.updated"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("password.updateFailed"));
    }
  }

  return (
    <>
      <form
        id="change-password-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-sm flex-col gap-3"
      >
        <Field data-invalid={!!form.formState.errors.currentPassword}>
          <FieldLabel htmlFor="currentPassword">
            {t("password.currentLabel")}
          </FieldLabel>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            {...form.register("currentPassword")}
          />
          <FieldError errors={[form.formState.errors.currentPassword]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.newPassword}>
          <FieldLabel htmlFor="newPassword">{t("password.newLabel")}</FieldLabel>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("newPassword")}
          />
          <FieldError errors={[form.formState.errors.newPassword]} />
        </Field>
        <Field data-invalid={!!form.formState.errors.confirmPassword}>
          <FieldLabel htmlFor="confirmPassword">
            {t("password.confirmLabel")}
          </FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...form.register("confirmPassword")}
          />
          <FieldError errors={[form.formState.errors.confirmPassword]} />
        </Field>
        <Controller
          control={form.control}
          name="revokeOtherSessions"
          render={({ field }) => (
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {t("password.revokeOtherSessions")}
              </span>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </label>
          )}
        />
      </form>
      <SaveBar
        show={form.formState.isDirty}
        formId="change-password-form"
        isSaving={form.formState.isSubmitting}
        onDiscard={() => form.reset()}
      />
      <UnsavedChangesGuard isDirty={form.formState.isDirty} />
    </>
  );
}
