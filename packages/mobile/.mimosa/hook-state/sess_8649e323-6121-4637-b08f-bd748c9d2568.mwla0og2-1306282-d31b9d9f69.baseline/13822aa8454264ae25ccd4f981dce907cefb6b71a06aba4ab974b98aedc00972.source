import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { changeEmailFormSchema, type ChangeEmailFormValues } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { changeEmail } from "@/features/account/api/account";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function ChangeEmailScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { user } = useSession();
  const form = useForm<ChangeEmailFormValues>({ resolver: zodResolver(changeEmailFormSchema), defaultValues: { newEmail: "" } });
  const emailChange = useMutation({
    mutationFn: ({ newEmail }: ChangeEmailFormValues) => changeEmail(newEmail.trim()),
    onSuccess: () => AccessibilityInfo.announceForAccessibility(t("account.profile.email.confirmationSent")),
  });

  const submit = form.handleSubmit((values) => {
    if (values.newEmail.trim().toLowerCase() === (user?.email ?? "").toLowerCase()) {
      form.setError("newEmail", { message: t("account.profile.email.sameAsCurrent") });
      return;
    }
    emailChange.mutate(values);
  });

  if (emailChange.isSuccess) {
    return (
      <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
        <PageHeader title={t("account.profile.email.change")} />
        <PinnedActionsLayout actions={<Button size="lg" label={t("common.done")} onPress={() => router.back()} />}>
          <Callout
            tone="success"
            title={t("account.profile.email.confirmationSent")}
            description={t("account.profile.email.confirmationSentDescription", { email: emailChange.variables.newEmail.trim() })}
          />
        </PinnedActionsLayout>
      </View>
    );
  }

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("account.profile.email.change")} />
      <PinnedActionsLayout
        actions={
          <Button size="lg" label={t("account.profile.email.submit")} loading={emailChange.isPending} onPress={() => void submit()} />
        }
      >
        {emailChange.isError ? (
          <Callout tone="destructive" title={emailChange.error.message || t("account.profile.email.updateFailed")} />
        ) : null}
        <ListGroup>
          <ListRow title={t("account.profile.email.heading")} value={user?.email ?? ""} />
        </ListGroup>
        <Controller
          control={form.control}
          name="newEmail"
          render={({ field, fieldState }) => (
            <TextField
              label={t("account.profile.email.newLabel")}
              placeholder={t("account.profile.email.placeholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              autoComplete="email"
              textContentType="emailAddress"
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              error={fieldState.error ? (translateFormErrorMessage(t, fieldState.error.message) ?? t("account.profile.email.updateFailed")) : undefined}
            />
          )}
        />
      </PinnedActionsLayout>
    </View>
  );
}
