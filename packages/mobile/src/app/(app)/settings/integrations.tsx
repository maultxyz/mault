import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, Share, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { apiKeysQueryOptions, createApiKey, revokeApiKey } from "@/features/integrations/api/api-keys";
import { billingQueryOptions } from "@/features/org/api/billing";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { formatShortDate } from "@/lib/dates";
import { orgApiKeyFormSchema, type OrgApiKeyFormValues } from "@magic-vault/shared";
import { translateFormErrorMessage } from "@/lib/form-validation";

export default function ApiKeysSettingsScreen() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const keys = useQuery(apiKeysQueryOptions(orgId));
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const locked = billing?.apiAccess === false;
  const canManage = keys.data?.canManage ?? false;
  const [creating, setCreating] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const form = useForm<OrgApiKeyFormValues>({ resolver: zodResolver(orgApiKeyFormSchema), defaultValues: { name: "", allowWrite: false } });

  const create = useMutation({
    mutationFn: (values: OrgApiKeyFormValues) =>
      createApiKey({ name: values.name.trim(), scope: values.allowWrite ? "read_write" : "read" }),
    onSuccess: (created) => {
      setRawKey(created.rawKey);
      setCreating(false);
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["api-keys", orgId] });
    },
  });
  const revoke = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["api-keys", orgId] }),
  });

  return (
    <Screen
      refreshing={keys.isRefetching}
      onRefresh={() => void keys.refetch()}
      header={<PageHeader title={t("settings.apiKeys.heading")} subtitle={org?.name} onBack={() => router.back()} />}
    >
      <AppText size="xs" tone="secondary">
        {t("settings.apiKeys.description")}
      </AppText>
      {locked ? <Callout tone="info" title={t("settings.apiKeys.upgrade")} /> : null}
      {!locked && keys.data && !canManage ? <Callout tone="info" title={t("settings.apiKeys.managersOnly")} /> : null}
      {keys.isError ? <Callout tone="destructive" title={t("settings.apiKeys.loadFailed")} /> : null}
      {create.isError ? <Callout tone="destructive" title={t("settings.apiKeys.createFailed")} /> : null}
      {revoke.isError ? <Callout tone="destructive" title={t("settings.apiKeys.revokeFailed")} /> : null}

      {rawKey ? (
        <Surface style={{ gap: SPACING.md }}>
          <AppText heading weight="semibold">
            {t("settings.apiKeys.revealTitle")}
          </AppText>
          <AppText size="xs" tone="secondary">
            {t("settings.apiKeys.revealDescription")}
          </AppText>
          <View style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: colors.muted }}>
            <AppText mono selectable>
              {rawKey}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button style={{ flex: 1 }} variant="secondary" label={t("settings.apiKeys.share")} onPress={() => void Share.share({ message: rawKey })} />
            <Button style={{ flex: 1 }} label={t("settings.apiKeys.revealDone")} onPress={() => setRawKey(null)} />
          </View>
        </Surface>
      ) : null}

      {creating ? (
        <Surface style={{ gap: SPACING.md }}>
          <View>
            <AppText heading weight="semibold">
              {t("settings.apiKeys.createTitle")}
            </AppText>
            <AppText size="xs" tone="secondary">
              {t("settings.apiKeys.createDescription")}
            </AppText>
          </View>
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <TextField
                label={t("settings.apiKeys.nameLabel")}
                placeholder={t("settings.apiKeys.namePlaceholder")}
                value={field.value}
                onBlur={field.onBlur}
                onChangeText={field.onChange}
                error={translateFormErrorMessage(t, fieldState.error?.message)}
              />
            )}
          />
          <Controller
            control={form.control}
            name="allowWrite"
            render={({ field }) => (
              <SwitchRow
                title={t("settings.apiKeys.writeLabel")}
                description={t("settings.apiKeys.writeDescription")}
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <Button style={{ flex: 1 }} variant="ghost" label={t("settings.apiKeys.cancel")} onPress={() => setCreating(false)} />
            <Button
              style={{ flex: 1 }}
              label={t("settings.apiKeys.create")}
              loading={create.isPending}
              onPress={form.handleSubmit((values) => create.mutate(values))}
            />
          </View>
        </Surface>
      ) : canManage && !locked ? (
        <Button icon="plus" label={t("settings.apiKeys.create")} onPress={() => setCreating(true)} />
      ) : null}

      {keys.data && keys.data.keys.length === 0 ? (
        <AppText tone="secondary">{t("settings.apiKeys.empty")}</AppText>
      ) : (
        <ListGroup>
          {(keys.data?.keys ?? []).map((key) => (
            <ListRow
              key={key.guid}
              icon="connection"
              title={`${key.name} · ${key.keyPrefix}…`}
              subtitle={[
                key.scope === "read_write" ? t("settings.apiKeys.readWrite") : t("settings.apiKeys.readOnly"),
                t("settings.apiKeys.createdBy", { name: key.createdBy, date: formatShortDate(key.createdAt, i18n.language) }),
                key.lastUsedAt
                  ? t("settings.apiKeys.lastUsed", { date: formatShortDate(key.lastUsedAt, i18n.language) })
                  : t("settings.apiKeys.neverUsed"),
              ].join(" · ")}
              right={
                canManage ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    label={t("settings.apiKeys.revoke")}
                    loading={revoke.isPending && revoke.variables === key.guid}
                    onPress={() =>
                      Alert.alert(t("settings.apiKeys.revokeConfirmTitle"), t("settings.apiKeys.revokeConfirmDescription"), [
                        { text: t("settings.apiKeys.cancel"), style: "cancel" },
                        { text: t("settings.apiKeys.revoke"), style: "destructive", onPress: () => revoke.mutate(key.guid) },
                      ])
                    }
                  />
                ) : undefined
              }
            />
          ))}
        </ListGroup>
      )}
    </Screen>
  );
}
