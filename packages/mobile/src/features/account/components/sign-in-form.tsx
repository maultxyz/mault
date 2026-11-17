import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { TextField } from "@/components/ui/text-field";
import { signInSchema } from "@/features/account/lib/auth-schemas";
import { SOCIAL_SIGN_IN_PROVIDERS, signIn, signInWithSocialProvider } from "@/lib/auth/session";
import { SOCIAL_SIGN_IN_CANCELLED_ERROR, SOCIAL_SIGN_IN_PROVIDER_NAMES } from "@/lib/constants/auth";
import { SPACING } from "@/lib/constants/theme";
import { AppText } from "@/components/ui/app-text";
import type { NeonSocialProvider } from "@magic-vault/shared";
import type { SignInValues } from "@/lib/interfaces/forms";

export function SignInForm() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const [pendingSocialProvider, setPendingSocialProvider] = useState<NeonSocialProvider | null>(null);
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await signIn(values.email, values.password);
    if (result.error) setError(t(`auth.errors.${result.error}`, { defaultValue: result.error }));
  });

  const continueWithSocialProvider = async (provider: NeonSocialProvider) => {
    setError(null);
    setPendingSocialProvider(provider);
    const result = await signInWithSocialProvider(provider);
    setPendingSocialProvider(null);
    if (result.error && result.error !== SOCIAL_SIGN_IN_CANCELLED_ERROR) {
      setError(
        t(`auth.errors.${result.error}`, {
          defaultValue: t("auth.errors.socialWithCode", { code: result.error }),
        }),
      );
    }
  };
  const isBusy = formState.isSubmitting || pendingSocialProvider !== null;

  return (
    <View style={{ gap: SPACING.lg }}>
      {error ? <Callout tone="destructive" title={t("auth.signInFailed")} description={error} /> : null}
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <TextField
            label={t("auth.email")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error ? t("auth.validation.email") : undefined}
            autoComplete="email"
            textContentType="emailAddress"
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <TextField
            label={t("auth.password")}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error ? t("auth.validation.passwordRequired") : undefined}
            autoComplete="password"
            textContentType="password"
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />
      <Button
        label={t("auth.signIn")}
        size="lg"
        loading={formState.isSubmitting}
        disabled={isBusy}
        onPress={onSubmit}
      />
      {SOCIAL_SIGN_IN_PROVIDERS.length ? (
        <View style={{ gap: SPACING.md }}>
          <AppText tone="secondary" style={{ textAlign: "center" }}>
            {t("auth.orContinueWith")}
          </AppText>
          {SOCIAL_SIGN_IN_PROVIDERS.map((provider) => (
            <Button
              key={provider}
              variant="secondary"
              size="lg"
              label={t("auth.continueWithProvider", { provider: SOCIAL_SIGN_IN_PROVIDER_NAMES[provider] })}
              loading={pendingSocialProvider === provider}
              disabled={isBusy}
              onPress={() => void continueWithSocialProvider(provider)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
