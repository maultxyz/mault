import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PUBLIC_API_KEY_HEADER, SYNC_API_KEY_PERMISSIONS, SYNC_API_PATH, syncApiKeyFormSchema, type SyncApiKeyFormValues } from "@magic-vault/shared";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, Share, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import { createSyncApiKey, revokeSyncApiKey, syncApiKeysQueryOptions } from "@/features/admin/api/cards-sync-api-keys";
import { useTheme } from "@/hooks/use-theme";
import { API_BASE } from "@/lib/constants/config";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import { formatShortDate } from "@/lib/dates";
import { translateFormErrorMessage } from "@/lib/form-validation";
import { SettingsSection } from "@/features/settings/components/settings-section";

export function CardsSyncApiKeysPanel() {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const keys = useQuery(syncApiKeysQueryOptions);
  const [creating, setCreating] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const form = useForm<SyncApiKeyFormValues>({
    resolver: zodResolver(syncApiKeyFormSchema),
    defaultValues: { name: "", permissions: ["sync_start"] },
  });

  const invalidateKeys = () => queryClient.invalidateQueries({ queryKey: syncApiKeysQueryOptions.queryKey });
  const create = useMutation({
    mutationFn: (values: SyncApiKeyFormValues) => createSyncApiKey({ name: values.name.trim(), permissions: values.permissions }),
    onSuccess: (created) => {
      setRawKey(created.rawKey);
      setCreating(false);
      form.reset();
      void invalidateKeys();
    },
  });
  const revoke = useMutation({
    mutationFn: revokeSyncApiKey,
    onSuccess: () => {
      AccessibilityInfo.announceForAccessibility(t("admin.cards.syncApiKeys.revoked"));
      void invalidateKeys();
    },
  });

  const exampleCommand = rawKey
    ? `curl -X POST ${API_BASE}/api${SYNC_API_PATH}/sync \\\n  -H "${PUBLIC_API_KEY_HEADER}: ${rawKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{"gameKey":"mtg","lang":"en"}'`
    : "";

  const confirmRevoke = (guid: string, name: string) =>
    Alert.alert(t("admin.cards.syncApiKeys.revokeConfirmTitle", { name }), t("admin.cards.syncApiKeys.revokeConfirmDescription"), [
      { text: t("admin.cards.cancel"), style: "cancel" },
      { text: t("admin.cards.syncApiKeys.revoke"), style: "destructive", onPress: () => revoke.mutate(guid) },
    ]);

  return (
    <View style={{ gap: SPACING.md }}>
      <AppText size="xs" tone="secondary">
        {t("admin.cards.syncApiKeys.description")}
      </AppText>
      {keys.isError ? <Callout tone="destructive" title={t("admin.cards.syncApiKeys.loadFailed")} /> : null}
      {create.isError ? <Callout tone="destructive" title={t("admin.cards.syncApiKeys.createFailed")} description={create.error.message} /> : null}
      {revoke.isError ? <Callout tone="destructive" title={t("admin.cards.syncApiKeys.revokeFailed")} description={revoke.error.message} /> : null}

      {rawKey ? (
        <SettingsSection title={t("admin.cards.syncApiKeys.revealTitle")} description={t("admin.cards.syncApiKeys.revealDescription")}>
          <Surface style={{ gap: SPACING.md }}>
            <View style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: colors.muted }}>
              <AppText mono selectable>
                {rawKey}
              </AppText>
            </View>
            <AppText size="xs" tone="secondary">
              {t("admin.cards.syncApiKeys.exampleLabel")}
            </AppText>
            <View style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: colors.muted }}>
              <AppText size="2xs" mono selectable>
                {exampleCommand}
              </AppText>
            </View>
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              <Button
                style={{ flex: 1 }}
                variant="secondary"
                icon="share"
                label={t("admin.cards.syncApiKeys.share")}
                onPress={() => void Share.share({ message: rawKey })}
              />
              <Button style={{ flex: 1 }} label={t("admin.cards.syncApiKeys.revealDone")} onPress={() => setRawKey(null)} />
            </View>
          </Surface>
        </SettingsSection>
      ) : null}

      {creating ? (
        <SettingsSection title={t("admin.cards.syncApiKeys.createTitle")} description={t("admin.cards.syncApiKeys.createDescription")}>
          <Surface style={{ gap: SPACING.md }}>
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("admin.cards.syncApiKeys.nameLabel")}
                  placeholder={t("admin.cards.syncApiKeys.namePlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  error={translateFormErrorMessage(t, fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={form.control}
              name="permissions"
              render={({ field, fieldState }) => (
                <View style={{ gap: SPACING.sm }}>
                  <AppText size="xs" weight="medium" accessibilityRole="header">
                    {t("admin.cards.syncApiKeys.permissionsLabel")}
                  </AppText>
                  {SYNC_API_KEY_PERMISSIONS.map((permission) => (
                    <SwitchRow
                      key={permission}
                      title={t(`admin.cards.syncApiKeys.permissions.${permission}.label`)}
                      description={t(`admin.cards.syncApiKeys.permissions.${permission}.description`)}
                      value={field.value.includes(permission)}
                      onValueChange={(checked) =>
                        field.onChange(
                          SYNC_API_KEY_PERMISSIONS.filter((candidate) => (candidate === permission ? checked : field.value.includes(candidate))),
                        )
                      }
                    />
                  ))}
                  {fieldState.error ? (
                    <AppText size="xs" tone="destructive" accessibilityRole="alert">
                      {translateFormErrorMessage(t, fieldState.error.message)}
                    </AppText>
                  ) : null}
                </View>
              )}
            />
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              <Button
                style={{ flex: 1 }}
                variant="ghost"
                label={t("admin.cards.cancel")}
                onPress={() => {
                  form.reset();
                  setCreating(false);
                }}
              />
              <Button
                style={{ flex: 1 }}
                label={t("admin.cards.syncApiKeys.create")}
                loading={create.isPending}
                onPress={form.handleSubmit((values) => create.mutate(values))}
              />
            </View>
          </Surface>
        </SettingsSection>
      ) : (
        <Button icon="plus" label={t("admin.cards.syncApiKeys.create")} onPress={() => setCreating(true)} />
      )}

      {keys.isLoading ? (
        <ListSkeleton rows={2} />
      ) : keys.data && keys.data.length === 0 ? (
        <EmptyState icon="key" title={t("admin.cards.syncApiKeys.empty")} />
      ) : (
        <ListGroup>
          {(keys.data ?? []).map((key) => (
            <ListRow
              key={key.guid}
              icon="key"
              title={`${key.name} · ${key.keyPrefix}…`}
              subtitle={[
                key.permissions.map((permission) => t(`admin.cards.syncApiKeys.permissions.${permission}.label`)).join(", "),
                t("admin.cards.syncApiKeys.createdBy", { name: key.createdBy, date: formatShortDate(key.createdAt, i18n.language) }),
                key.lastUsedAt
                  ? t("admin.cards.syncApiKeys.lastUsed", { date: formatShortDate(key.lastUsedAt, i18n.language) })
                  : t("admin.cards.syncApiKeys.neverUsed"),
              ].join(" · ")}
              subtitleNumberOfLines={3}
              rightIsInteractive
              right={
                <Button
                  size="sm"
                  variant="destructive"
                  label={t("admin.cards.syncApiKeys.revoke")}
                  accessibilityLabel={t("admin.cards.syncApiKeys.revokeLabel", { name: key.name })}
                  loading={revoke.isPending && revoke.variables === key.guid}
                  onPress={() => confirmRevoke(key.guid, key.name)}
                />
              }
            />
          ))}
        </ListGroup>
      )}
    </View>
  );
}
