import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { changePasswordFormSchema, type ChangePasswordFormValues } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { changePassword } from "@/features/account/api/account";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "", revokeOtherSessions: false },
  });
  const passwordChange = useMutation({
    mutationFn: (values: ChangePasswordFormValues) =>
      changePassword(values.currentPassword, values.newPassword, values.revokeOtherSessions),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auth-sessions"] });
      router.back();
      showToast({ message: t("account.profile.password.updated"), tone: "success" });
    },
  });

  const passwordField = (
    name: "currentPassword" | "newPassword" | "confirmPassword",
    label: string,
    isNewPassword: boolean,
  ) => (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <TextField
          label={label}
          value={field.value}
          onBlur={field.onBlur}
          onChangeText={field.onChange}
          secureTextEntry
          autoComplete={isNewPassword ? "new-password" : "password"}
          textContentType={isNewPassword ? "newPassword" : "password"}
          autoCapitalize="none"
          error={translateFormErrorMessage(t, fieldState.error?.message)}
        />
      )}
    />
  );

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("account.profile.password.change")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("account.profile.password.submit")}
            loading={passwordChange.isPending}
            onPress={form.handleSubmit((values) => passwordChange.mutate(values))}
          />
        }
      >
        {passwordChange.isError ? (
          <Callout tone="destructive" title={passwordChange.error.message || t("account.profile.password.updateFailed")} />
        ) : null}
        {passwordField("currentPassword", t("account.profile.password.currentLabel"), false)}
        {passwordField("newPassword", t("account.profile.password.newLabel"), true)}
        {passwordField("confirmPassword", t("account.profile.password.confirmLabel"), true)}
        <Controller
          control={form.control}
          name="revokeOtherSessions"
          render={({ field }) => (
            <SwitchRow title={t("account.profile.password.revokeOtherSessions")} value={field.value} onValueChange={field.onChange} />
          )}
        />
      </PinnedActionsLayout>
    </View>
  );
}
