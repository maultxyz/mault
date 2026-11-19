import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { statsSyncConnectFormSchema, type StatsSyncConnectFormValues } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { connectStatsSync, statsSyncConnectionQueryOptions } from "@/features/integrations/api/stats-sync";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function StatsSyncConnectScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const connectionOptions = statsSyncConnectionQueryOptions(org?.id ?? null);
  const form = useForm<StatsSyncConnectFormValues>({
    resolver: zodResolver(statsSyncConnectFormSchema),
    defaultValues: { syncKey: "" },
  });
  const connect = useMutation({
    mutationFn: connectStatsSync,
    onSuccess: (status) => {
      queryClient.setQueryData(connectionOptions.queryKey, status);
      AccessibilityInfo.announceForAccessibility(t("settings.statsSync.connection.connected"));
      router.back();
    },
    onError: () => AccessibilityInfo.announceForAccessibility(t("settings.statsSync.connection.connectFailed")),
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("settings.statsSync.connection.heading")} subtitle={org?.name} />
      <PinnedActionsLayout
        actions={
          <Button
            size="lg"
            label={t("settings.statsSync.connection.connect")}
            loading={connect.isPending}
            onPress={form.handleSubmit((values) => connect.mutate({ syncKey: values.syncKey }))}
          />
        }
      >
        {connect.isError ? <Callout tone="destructive" title={t("settings.statsSync.connection.connectFailed")} /> : null}
        <AppText size="sm" tone="secondary">
          {t("settings.statsSync.connection.keyDescription")}
        </AppText>
        <Controller
          control={form.control}
          name="syncKey"
          render={({ field, fieldState }) => (
            <TextField
              label={t("settings.statsSync.connection.keyLabel")}
              placeholder={t("settings.statsSync.connection.keyPlaceholder")}
              value={field.value}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              autoCapitalize="none"
              autoComplete="off"
              returnKeyType="done"
              error={translateFormErrorMessage(t, fieldState.error?.message)}
            />
          )}
        />
      </PinnedActionsLayout>
    </View>
  );
}
