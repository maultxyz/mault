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
import { signInLocal, signUpLocal } from "@/lib/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
const signUpSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

// Local-mode-only sign-in/sign-up screen (see app/router.tsx, which renders
// this instead of Neon's prebuilt <AuthView> when AUTH_PROVIDER=local).
// own-auth has no equivalent prebuilt React UI to reuse, so this is a
// minimal hand-built form covering only what local mode supports: email/
// password auth. No email verification, magic links, MFA, or OAuth.
export default function AuthLocalPage() {
  const { t } = useTranslation("auth");
  const { path } = useParams();
  const navigate = useNavigate();
  const isSignUp = path === "sign-up";
  const [serverError, setServerError] = useState<string | null>(null);

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  useEffect(() => {
    setServerError(null);
  }, [isSignUp]);

  async function onSignIn(values: z.infer<typeof signInSchema>) {
    setServerError(null);
    const result = await signInLocal(values.email, values.password);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    navigate("/app", { replace: true });
  }

  async function onSignUp(values: z.infer<typeof signUpSchema>) {
    setServerError(null);
    const result = await signUpLocal(
      values.email,
      values.password,
      values.name,
    );
    if (result.error) {
      setServerError(result.error);
      return;
    }
    navigate("/app", { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {isSignUp ? t("local.signUpTitle") : t("local.signInTitle")}
          </CardTitle>
          <CardDescription>
            {isSignUp
              ? t("local.signUpDescription")
              : t("local.signInDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp ? (
            <form
              id="local-auth-form"
              onSubmit={signUpForm.handleSubmit(onSignUp)}
              className="flex flex-col gap-3"
            >
              <Field data-invalid={!!signUpForm.formState.errors.name}>
                <FieldLabel htmlFor="name">{t("local.nameLabel")}</FieldLabel>
                <Input id="name" autoComplete="name" {...signUpForm.register("name")} />
                <FieldError errors={[signUpForm.formState.errors.name]} />
              </Field>
              <Field data-invalid={!!signUpForm.formState.errors.email}>
                <FieldLabel htmlFor="email">{t("local.emailLabel")}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...signUpForm.register("email")}
                />
                <FieldError errors={[signUpForm.formState.errors.email]} />
              </Field>
              <Field data-invalid={!!signUpForm.formState.errors.password}>
                <FieldLabel htmlFor="password">
                  {t("local.passwordLabel")}
                </FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...signUpForm.register("password")}
                />
                <FieldError errors={[signUpForm.formState.errors.password]} />
              </Field>
              {serverError && (
                <p className="text-xs text-destructive">{serverError}</p>
              )}
            </form>
          ) : (
            <form
              id="local-auth-form"
              onSubmit={signInForm.handleSubmit(onSignIn)}
              className="flex flex-col gap-3"
            >
              <Field data-invalid={!!signInForm.formState.errors.email}>
                <FieldLabel htmlFor="email">{t("local.emailLabel")}</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...signInForm.register("email")}
                />
                <FieldError errors={[signInForm.formState.errors.email]} />
              </Field>
              <Field data-invalid={!!signInForm.formState.errors.password}>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="password">
                    {t("local.passwordLabel")}
                  </FieldLabel>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => navigate("/auth/forgot-password")}
                  >
                    {t("local.forgotPassword")}
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...signInForm.register("password")}
                />
                <FieldError errors={[signInForm.formState.errors.password]} />
              </Field>
              {serverError && (
                <p className="text-xs text-destructive">{serverError}</p>
              )}
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            form="local-auth-form"
            className="w-full"
            disabled={
              isSignUp
                ? signUpForm.formState.isSubmitting
                : signInForm.formState.isSubmitting
            }
          >
            {(isSignUp
              ? signUpForm.formState.isSubmitting
              : signInForm.formState.isSubmitting) && (
              <IconLoader2 className="animate-spin" />
            )}
            {isSignUp ? t("local.signUp") : t("local.signIn")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {isSignUp ? t("local.haveAccount") : t("local.noAccount")}{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() =>
                navigate(isSignUp ? "/auth/sign-in" : "/auth/sign-up")
              }
            >
              {isSignUp ? t("local.signInLink") : t("local.signUpLink")}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
