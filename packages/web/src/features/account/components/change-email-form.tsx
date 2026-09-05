import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { neon } from "@/lib/auth/client";
import {
  changeEmailSchema,
  type ChangeEmailFormValues,
} from "@/schemas/account.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
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
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="self-start"
        >
          {form.formState.isSubmitting && (
            <IconLoader2 className="animate-spin" />
          )}
          {t("email.submit")}
        </Button>
      </form>
    </div>
  );
}
