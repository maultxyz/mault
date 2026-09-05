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
import { forgotPassword } from "@/lib/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "@/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

// Always shows the same "if that email exists..." success message
// regardless of what actually happened server-side, for both providers -
// deliberately generic so this page can't be used to check which emails
// have accounts.
export default function AuthForgotPasswordPage() {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: ForgotPasswordFormValues) {
    await forgotPassword(email);
    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{t("forgotPassword.title")}</CardTitle>
          <CardDescription>
            {sent
              ? t("forgotPassword.sent")
              : t("forgotPassword.description")}
          </CardDescription>
        </CardHeader>
        {!sent && (
          <CardContent>
            <form id="forgot-password-form" onSubmit={form.handleSubmit(onSubmit)}>
              <Field data-invalid={!!form.formState.errors.email}>
                <FieldLabel htmlFor="email">{t("common.emailLabel")}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  {...form.register("email")}
                />
                <FieldError errors={[form.formState.errors.email]} />
              </Field>
            </form>
          </CardContent>
        )}
        <CardFooter className="flex flex-col gap-3">
          {!sent && (
            <Button
              type="submit"
              form="forgot-password-form"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && (
                <IconLoader2 className="animate-spin" />
              )}
              {t("forgotPassword.submit")}
            </Button>
          )}
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => navigate("/auth/sign-in")}
          >
            {t("signIn.link")}
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
