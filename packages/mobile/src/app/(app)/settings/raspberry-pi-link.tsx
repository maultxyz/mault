import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import {
  piHostClaimFormSchema,
  type PiHostClaimFormInput,
  type PiHostClaimFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { useRaspberryPis } from "@/features/raspberry-pis/api/use-raspberry-pis";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function LinkRaspberryPiScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { claim } = useRaspberryPis();
  const form = useForm<PiHostClaimFormInput, unknown, PiHostClaimFormValues>({
    resolver: zodResolver(piHostClaimFormSchema),
    defaultValues: { code: "", name: "" },
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("settings.raspberryPis.linkTitle")} subtitle={t("settings.raspberryPis.linkDescription")} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("settings.raspberryPis.link")}
            loading={claim.isPending}
            onPress={form.handleSubmit((values) => claim.mutate(values, { onSuccess: () => router.back() }))}
          />
        }
      >
        {claim.isError ? <Callout tone="destructive" title={claim.error.message} /> : null}
        <Controller
          control={form.control}
          name="code"
          render={({ field, fieldState }) => (
            <TextField
              label={t("settings.raspberryPis.codeLabel")}
              placeholder={t("settings.raspberryPis.codePlaceholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              returnKeyType="next"
              error={translateFormErrorMessage(t, fieldState.error?.message)}
            />
          )}
        />
        <AppText size="sm" tone="secondary">
          {t("settings.raspberryPis.codeDescription")}
        </AppText>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <TextField
              label={t("settings.raspberryPis.nameLabel")}
              placeholder={t("settings.raspberryPis.namePlaceholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              returnKeyType="done"
              error={translateFormErrorMessage(t, fieldState.error?.message)}
            />
          )}
        />
      </PinnedActionsLayout>
    </View>
  );
}
