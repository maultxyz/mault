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
import { signIn, signUp } from "@/lib/auth";
import {
  signInSchema,
  signUpSchema,
  type SignInFormValues,
  type SignUpFormValues,
} from "@/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

// Sign-in/sign-up screen shared by both auth providers (see lib/auth's
// signIn/signUp, which dispatch to own-auth or Neon Auth under the hood) -
// email/password only, matching what both providers actually support today.
export default function AuthPage() {
  const { t } = useTranslation("auth");
  const { path } = useParams();
  const navigate = useNavigate();
  const isSignUp = path === "sign-up";
  const [serverError, setServerError] = useState<string | null>(null);

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  useEffect(() => {
    setServerError(null);
  }, [isSignUp]);

  async function onSignIn(values: SignInFormValues) {
    setServerError(null);
    const result = await signIn(values.email, values.password);
    if (result.error) {
      setServerError(result.error);
      return;
    }
    navigate("/app", { replace: true });
  }

  async function onSignUp(values: SignUpFormValues) {
    setServerError(null);
    const result = await signUp(values.email, values.password, values.name);
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
            {isSignUp ? t("signUp.title") : t("signIn.title")}
          </CardTitle>
          <CardDescription>
            {isSignUp ? t("signUp.description") : t("signIn.description")}
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
                <FieldLabel htmlFor="name">{t("signUp.nameLabel")}</FieldLabel>
                <Input id="name" autoComplete="name" {...signUpForm.register("name")} />
                <FieldError errors={[signUpForm.formState.errors.name]} />
              </Field>
              <Field data-invalid={!!signUpForm.formState.errors.email}>
                <FieldLabel htmlFor="email">{t("common.emailLabel")}</FieldLabel>
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
                  {t("common.passwordLabel")}
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
                <p className="text-sm text-destructive">{serverError}</p>
              )}
            </form>
          ) : (
            <form
              id="local-auth-form"
              onSubmit={signInForm.handleSubmit(onSignIn)}
              className="flex flex-col gap-3"
            >
              <Field data-invalid={!!signInForm.formState.errors.email}>
                <FieldLabel htmlFor="email">{t("common.emailLabel")}</FieldLabel>
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
                    {t("common.passwordLabel")}
                  </FieldLabel>
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => navigate("/auth/forgot-password")}
                  >
                    {t("forgotPassword.link")}
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
                <p className="text-sm text-destructive">{serverError}</p>
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
            {isSignUp ? t("signUp.submit") : t("signIn.submit")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isSignUp ? t("signUp.haveAccount") : t("signIn.noAccount")}{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() =>
                navigate(isSignUp ? "/auth/sign-in" : "/auth/sign-up")
              }
            >
              {isSignUp ? t("signIn.link") : t("signUp.link")}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
