import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { TextField } from "@/components/ui/text-field";
import { signInSchema } from "@/features/account/lib/auth-schemas";
import { signIn } from "@/lib/auth/session";
import { SPACING } from "@/lib/constants/theme";
import type { SignInValues } from "@/lib/interfaces/forms";

export function SignInForm() {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await signIn(values.email, values.password);
    if (result.error) setError(t(`auth.errors.${result.error}`, { defaultValue: result.error }));
  });

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
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="go"
            onSubmitEditing={onSubmit}
          />
        )}
      />
      <Button label={t("auth.signIn")} size="lg" loading={formState.isSubmitting} onPress={onSubmit} />
    </View>
  );
}
