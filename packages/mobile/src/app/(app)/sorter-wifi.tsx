import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { sorterWifiFormSchema, type SorterWifiFormValues } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-provider";
import { useSorterWifi } from "@/features/sorter/api/use-sorter-wifi";
import { useTheme } from "@/hooks/use-theme";
import { SPACING } from "@/lib/constants/theme";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function SorterWifiScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { showToast } = useToast();
  const wifi = useSorterWifi();
  const isConfigured = !!wifi.status && wifi.status.wifi !== "unconfigured";
  const form = useForm<SorterWifiFormValues>({
    resolver: zodResolver(sorterWifiFormSchema),
    values: { ssid: wifi.status?.ssid ?? "", password: "" },
    resetOptions: { keepDirtyValues: true },
  });

  const save = useMutation({
    mutationFn: wifi.configure,
    onSuccess: (result) => {
      if (!result.ok) return;
      showToast({ message: result.restarting ? t("sorterWifi.savedRestarting") : t("sorterWifi.saved"), tone: "success" });
      router.back();
    },
  });
  const forget = useMutation({
    mutationFn: wifi.forget,
    onSuccess: (result) => {
      if (!result.ok) return;
      showToast({
        message: result.serverLinkRemovalFailed
          ? t("sorterWifi.forgottenLinkKept")
          : result.restarting
            ? t("sorterWifi.forgottenRestarting")
            : t("sorterWifi.forgotten"),
        tone: "success",
      });
    },
  });
  const saveError = save.data && !save.data.ok ? (save.data.error ?? t("sorterWifi.saveFailedDescription")) : null;
  const forgetError = forget.data && !forget.data.ok ? (forget.data.error ?? t("sorterWifi.forgetFailed")) : null;

  const confirmForget = () =>
    Alert.alert(t("sorterWifi.forget"), wifi.sharesRadioWithBluetooth ? t("sorterWifi.sharesRadio") : t("sorterWifi.forgetDescription"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("sorterWifi.forget"), style: "destructive", onPress: () => forget.mutate() },
    ]);

  const wifiDetail =
    wifi.status?.wifi === "connected"
      ? [wifi.status.ssid, wifi.status.ip].filter(Boolean).join(" · ")
      : (wifi.status?.ssid ?? undefined);

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("sorterWifi.title")} />
      <PinnedActionsLayout
        actions={
          wifi.canConfigure ? (
            <Button
              size="lg"
              label={t("sorterWifi.save")}
              loading={save.isPending}
              disabled={forget.isPending}
              onPress={form.handleSubmit((values) => save.mutate(values))}
            />
          ) : null
        }
      >
        <AppText size="sm" tone="secondary">
          {t("sorterWifi.description")}
        </AppText>
        {!wifi.isSupported && !wifi.needsFirmware && !wifi.needsWifiBoard ? (
          <Callout tone="info" title={t("sorterWifi.connectFirst")} />
        ) : null}
        {wifi.needsWifiBoard ? <Callout tone="info" title={t("sorterWifi.needsWifiBoard")} /> : null}
        {wifi.needsFirmware ? <Callout tone="warning" title={t("sorterWifi.needsFirmwareShort")} /> : null}
        {wifi.isSupported && wifi.isCloudConnection ? <Callout tone="info" title={t("sorterWifi.changeOverLocal")} /> : null}
        {wifi.status?.wifi === "paused" ? <Callout tone="warning" title={t("sorterWifi.pausedForPower")} /> : null}
        {saveError ? <Callout tone="destructive" title={t("sorterWifi.saveFailed")} description={saveError} /> : null}
        {forgetError ? <Callout tone="destructive" title={forgetError} /> : null}

        {wifi.isSupported ? (
          <ListGroup>
            <ListRow
              icon="wifi"
              title={t("sorterWifi.wifiLabel")}
              subtitle={wifiDetail}
              value={wifi.status ? t(`sorterWifi.wifiState.${wifi.status.wifi}`) : t("sorterWifi.unknown")}
            />
            <ListRow
              icon="external"
              title={t("sorterWifi.cloudLabel")}
              subtitle={wifi.status?.host ?? undefined}
              value={wifi.status ? t(`sorterWifi.cloudState.${wifi.status.cloud}`) : t("sorterWifi.unknown")}
            />
          </ListGroup>
        ) : null}

        {wifi.canConfigure ? (
          <View style={{ gap: SPACING.lg }}>
            <AppText size="sm" tone="secondary">
              {t("sorterWifi.dialogDescription")}
            </AppText>
            {wifi.sharesRadioWithBluetooth ? <Callout tone="info" title={t("sorterWifi.sharesRadio")} /> : null}
            <Controller
              control={form.control}
              name="ssid"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("sorterWifi.ssid")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("sorterWifi.password")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  returnKeyType="done"
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
            <AppText size="xs" tone="secondary">
              {t("sorterWifi.passwordHint")}
            </AppText>
            {isConfigured ? (
              <Button
                variant="secondary"
                label={t("sorterWifi.forget")}
                loading={forget.isPending}
                disabled={save.isPending}
                onPress={confirmForget}
              />
            ) : null}
          </View>
        ) : null}
      </PinnedActionsLayout>
    </View>
  );
}
