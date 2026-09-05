import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/lib/auth";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";

// The link from a password-reset email points here for both providers.
// Resetting also revokes every other active session for the account (both
// own-auth and Better Auth do this server-side), so this always sends the
// user to sign in fresh with their new password rather than trying to keep
// them logged in.
export default function AuthResetPasswordPage() {
  const { t } = useTranslation("auth");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit({ password }: ResetPasswordFormValues) {
    if (!token) return;
    setServerError(null);
    const result = await resetPassword(token, password);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    navigate("/auth/sign-in", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("resetPassword.title")}</CardTitle>
          <CardDescription>
            {!token
              ? t("resetPassword.invalid")
              : t("resetPassword.description")}
          </CardDescription>
        </CardHeader>
        {token && (
          <CardContent>
            <form
              id="reset-password-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-3"
            >
              <Field data-invalid={!!form.formState.errors.password}>
                <FieldLabel htmlFor="password">
                  {t("resetPassword.newPasswordLabel")}
                </FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  autoFocus
                  {...form.register("password")}
                />
                <FieldError errors={[form.formState.errors.password]} />
              </Field>
              <Field data-invalid={!!form.formState.errors.confirmPassword}>
                <FieldLabel htmlFor="confirmPassword">
                  {t("resetPassword.confirmPasswordLabel")}
                </FieldLabel>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...form.register("confirmPassword")}
                />
                <FieldError errors={[form.formState.errors.confirmPassword]} />
              </Field>
              {serverError && (
                <p className="text-sm text-destructive">{serverError}</p>
              )}
            </form>
          </CardContent>
        )}
        {token && (
          <CardFooter>
            <Button
              type="submit"
              form="reset-password-form"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && (
                <IconLoader2 className="animate-spin" />
              )}
              {t("resetPassword.submit")}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
