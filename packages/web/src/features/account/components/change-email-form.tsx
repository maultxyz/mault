import { Badge } from "@/components/ui/badge";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { neon } from "@/lib/auth/client";
import {
  changeEmailSchema,
  type ChangeEmailFormValues,
} from "@/schemas/account.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export function ChangeEmailForm() {
  const { t } = useTranslation("account");
  const { data } = neon.auth.useSession();
  const currentEmail = data?.user?.email ?? "";
  const isVerified = !!data?.user?.emailVerified;

  const form = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { newEmail: "" },
  });

  async function onSubmit({ newEmail }: ChangeEmailFormValues) {
    if (newEmail === currentEmail) {
      form.setError("newEmail", { message: t("email.sameAsCurrent") });
      return;
    }
    try {
      const { error } = await neon.auth.changeEmail({ newEmail });
      if (error) throw new Error(error.message);
      form.reset();
      toast.success(t("email.confirmationSent"), {
        description: t("email.confirmationSentDescription", {
          email: newEmail,
        }),
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("email.updateFailed"));
    }
  }

  return (
    <div className="flex max-w-sm flex-col gap-4">
      <div className="flex items-center gap-2">
        <p className="text-sm">{currentEmail}</p>
        <Badge variant={isVerified ? "success" : "outline"}>
          {isVerified ? t("email.verified") : t("email.unverified")}
        </Badge>
      </div>
      <form
        id="change-email-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-3"
      >
        <Field data-invalid={!!form.formState.errors.newEmail}>
          <FieldLabel htmlFor="newEmail">{t("email.newLabel")}</FieldLabel>
          <Input
            id="newEmail"
            type="email"
            autoComplete="email"
            placeholder={t("email.placeholder")}
            {...form.register("newEmail")}
          />
          <FieldError errors={[form.formState.errors.newEmail]} />
        </Field>
      </form>
      <SaveBar
        show={form.formState.isDirty}
        formId="change-email-form"
        isSaving={form.formState.isSubmitting}
        onDiscard={() => form.reset()}
      />
      <UnsavedChangesGuard isDirty={form.formState.isDirty} />
    </div>
  );
}
