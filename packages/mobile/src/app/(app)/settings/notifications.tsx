import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, Switch, View } from "react-native";
import {
  DEFAULT_ORG_SETTINGS,
  discordSettingsDraftFormSchema,
  type DiscordSettingsDraftFormValues,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SectionHeader } from "@/components/ui/section-header";
import { SelectField } from "@/components/ui/select-field";
import { Surface } from "@/components/ui/surface";
import { SwitchRow } from "@/components/ui/switch-row";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import {
  discordIntegrationQueryOptions,
  generateDiscordLinkCode,
  notificationRulesQueryOptions,
  sendTestNotification,
  setDiscordChannel,
  unlinkDiscord,
  updateNotificationRule,
} from "@/features/integrations/api/discord";
import {
  changedDiscordChannels,
  channelLabel,
  toDiscordSettingsDraft,
} from "@/features/integrations/lib/discord-settings";
import { orgSettingsQueryOptions, saveOrgSettings } from "@/features/org/api/org-settings";
import { useRulesData } from "@/features/rules/api/use-rules-data";
import { SettingsPage } from "@/features/settings/components/settings-page";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { NOTIFICATION_TEST_TYPES } from "@/lib/constants/integrations";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { DiscordChannelPicker, DiscordLinkCode, NotificationTestType } from "@/lib/interfaces/integrations";

export default function NotificationsSettingsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const canManage = org?.role === "owner" || org?.role === "admin";
  const { gameGuid } = useRulesData();
  const integration = useQuery(discordIntegrationQueryOptions(orgId));
  const rules = useQuery(notificationRulesQueryOptions(orgId, gameGuid));
  const settings = useQuery(orgSettingsQueryOptions(orgId));
  const collections = useQuery(collectionsQueryOptions(orgId));
  const [picker, setPicker] = useState<DiscordChannelPicker | null>(null);
  const [linkCode, setLinkCode] = useState<DiscordLinkCode | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<{ tone: "success" | "destructive" | "info"; text: string } | null>(null);
  const [saveError, setSaveError] = useState(false);

  const values = useMemo(
    () => toDiscordSettingsDraft(integration.data, rules.data ?? [], settings.data),
    [integration.data, rules.data, settings.data],
  );
  const form = useForm<DiscordSettingsDraftFormValues>({
    resolver: zodResolver(discordSettingsDraftFormSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const overrides = form.watch("overrides");

  const data = integration.data;
  const guild = data?.guild ?? null;
  const channels = guild?.channels ?? [];
  const roles = guild?.roles ?? [];
  const linked = !!data?.linked;
  const ready = linked && !!guild;
  const secondsLeft = linkCode ? Math.max(0, Math.round((new Date(linkCode.expiresAt).getTime() - now) / 1000)) : 0;

  useEffect(() => {
    if (!linkCode) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [linkCode]);

  useEffect(() => {
    if (linkCode && secondsLeft === 0) setLinkCode(null);
  }, [linkCode, secondsLeft]);

  const refreshIntegration = () => void queryClient.invalidateQueries({ queryKey: ["discord-integration", orgId] });

  const generate = useMutation({
    mutationFn: generateDiscordLinkCode,
    onSuccess: (code) => {
      setNow(Date.now());
      setLinkCode(code);
    },
    onError: () => setMessage({ tone: "destructive", text: t("settings.discord.bot.generateError") }),
  });
  const unlink = useMutation({
    mutationFn: unlinkDiscord,
    onSuccess: () => setMessage({ tone: "success", text: t("settings.discord.bot.unlinkSuccess") }),
    onError: () => setMessage({ tone: "destructive", text: t("settings.discord.bot.unlinkError") }),
    onSettled: refreshIntegration,
  });
  const addOverride = useMutation({
    mutationFn: setDiscordChannel,
    onSuccess: () => setMessage({ tone: "success", text: t("settings.discord.channelSettings.saved") }),
    onError: () => setMessage({ tone: "destructive", text: t("settings.discord.channelSettings.saveFailed") }),
    onSettled: refreshIntegration,
  });
  const test = useMutation({
    mutationFn: sendTestNotification,
    onSuccess: (outcome) =>
      setMessage(
        outcome === "sent"
          ? { tone: "success", text: t("settings.discord.toasts.testSuccess") }
          : outcome === "no_channel"
            ? { tone: "info", text: `${t("settings.discord.toasts.testNoChannel.title")}. ${t("settings.discord.toasts.testNoChannel.description")}` }
            : { tone: "destructive", text: t("settings.discord.toasts.testError") },
      ),
    onError: () => setMessage({ tone: "destructive", text: t("settings.discord.toasts.testError") }),
  });

  const submit = async (draft: DiscordSettingsDraftFormValues) => {
    setSaveError(false);
    const jobs: Promise<unknown>[] = [];
    const defaults = changedDiscordChannels(values, draft);
    if (defaults) jobs.push(setDiscordChannel(defaults));
    for (const [collectionGuid, next] of Object.entries(draft.overrides)) {
      const current = values.overrides[collectionGuid];
      if (!current) continue;
      const changed = changedDiscordChannels(current, next);
      if (changed) jobs.push(setDiscordChannel({ ...changed, collectionGuid }));
    }
    for (const rule of rules.data ?? []) {
      const enabled = draft.ruleEnabled[rule.guid];
      if (enabled === undefined || enabled === rule.isEnabled || !rule.channelId) continue;
      jobs.push(
        updateNotificationRule(rule.guid, {
          name: rule.name,
          isEnabled: enabled,
          rules: rule.rules,
          channelId: rule.channelId,
          roleId: rule.roleId,
        }),
      );
    }
    const settingsPatch = {
      ...(draft.discordNotifyOnScan !== values.discordNotifyOnScan ? { discordNotifyOnScan: draft.discordNotifyOnScan } : {}),
      ...(draft.discordScanUseThreads !== values.discordScanUseThreads ? { discordScanUseThreads: draft.discordScanUseThreads } : {}),
    };
    if (Object.keys(settingsPatch).length) {
      jobs.push(saveOrgSettings(settingsPatch).then((saved) => queryClient.setQueryData(["org-settings", orgId], saved)));
    }
    const results = await Promise.allSettled(jobs);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["discord-integration", orgId] }),
      queryClient.invalidateQueries({ queryKey: ["notification-rules", orgId] }),
    ]);
    if (results.some((result) => result.status === "rejected")) {
      setSaveError(true);
      return;
    }
    form.reset(draft);
    setMessage({ tone: "success", text: t("settings.discord.draft.saved") });
  };

  const pickerChannelOptions = (emptyLabel: string) => [
    { value: "", label: emptyLabel },
    ...channels.map((channel) => ({ value: channel.id, label: channelLabel(channels, channel.id, t, emptyLabel) })),
  ];

  const pickerConfig = (() => {
    if (!picker) return null;
    if (picker.kind === "add-collection") {
      const taken = new Set(Object.keys(overrides));
      return {
        title: t("settings.discord.overrides.pickCollection"),
        options: (collections.data ?? [])
          .filter((collection) => !taken.has(collection.guid))
          .map((collection) => ({ value: collection.guid, label: collection.name })),
        selected: [] as string[],
      };
    }
    if (picker.kind === "add-channel") {
      return {
        title: t("settings.discord.overrides.pickChannel"),
        options: channels.map((channel) => ({ value: channel.id, label: channelLabel(channels, channel.id, t, "") })),
        selected: [] as string[],
      };
    }
    const isOverride = picker.collectionGuid != null;
    const emptyLabel = isOverride
      ? picker.kind === "scan"
        ? t("settings.discord.channelSettings.sameScan")
        : t("settings.discord.channelSettings.sameError")
      : t("settings.discord.channelSettings.none");
    const current = isOverride
      ? overrides[picker.collectionGuid as string]?.[picker.kind === "scan" ? "scanChannelId" : "errorChannelId"]
      : form.getValues(picker.kind === "scan" ? "scanChannelId" : "errorChannelId");
    return {
      title: picker.kind === "scan" ? t("settings.discord.channelSettings.scan") : t("settings.discord.channelSettings.error"),
      options: pickerChannelOptions(emptyLabel),
      selected: [current ?? ""],
    };
  })();

  const onPick = (value: string) => {
    const active = picker;
    setPicker(null);
    if (!active) return;
    if (active.kind === "add-collection") {
      setPicker({ kind: "add-channel", collectionGuid: value });
      return;
    }
    if (active.kind === "add-channel") {
      addOverride.mutate({ collectionGuid: active.collectionGuid, scanChannelId: value });
      return;
    }
    const key = active.kind === "scan" ? "scanChannelId" : "errorChannelId";
    const channelId = value === "" ? null : value;
    if (active.collectionGuid == null) {
      form.setValue(key, channelId, { shouldDirty: true });
    } else {
      form.setValue(`overrides.${active.collectionGuid}.${key}`, channelId, { shouldDirty: true });
    }
  };

  const removeOverride = (collectionGuid: string) => {
    form.setValue(`overrides.${collectionGuid}.scanChannelId`, null, { shouldDirty: true });
    form.setValue(`overrides.${collectionGuid}.errorChannelId`, null, { shouldDirty: true });
  };

  const confirmUnlink = () =>
    Alert.alert(t("settings.discord.bot.unlink"), t("settings.discord.bot.linked"), [
      { text: t("settings.discord.ruleDialog.cancel"), style: "cancel" },
      { text: t("settings.discord.bot.unlink"), style: "destructive", onPress: () => unlink.mutate() },
    ]);

  const collectionName = (guid: string) =>
    data?.collections.find((c) => c.guid === guid)?.name ??
    collections.data?.find((c) => c.guid === guid)?.name ??
    guid;

  const visibleOverrides = Object.entries(overrides).filter(
    ([, override]) => override.scanChannelId != null || override.errorChannelId != null,
  );

  return (
    <SettingsPage
      title={t("settings.sections.notifications.title")}
      isDirty={form.formState.isDirty}
      isSaving={form.formState.isSubmitting}
      saveError={saveError}
      onSave={() => void form.handleSubmit(submit)()}
      onDiscard={() => form.reset(values)}
    >
      <AppText size="sm" tone="secondary">
        {t("settings.discord.discord.description")}
      </AppText>
      {integration.isError ? <Callout tone="destructive" title={t("settings.discord.channelSettings.saveFailed")} /> : null}
      {message ? <Callout tone={message.tone} title={message.text} /> : null}

      <Surface style={{ gap: SPACING.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <AppText heading weight="semibold" style={{ flex: 1 }}>
            {t("settings.discord.bot.heading")}
          </AppText>
          <AppText size="xs" weight="semibold" style={{ color: linked ? colors.success : colors.foreground }}>
            {linked ? t("settings.discord.discord.statusLinked") : t("settings.discord.discord.statusNotLinked")}
          </AppText>
        </View>
        <AppText size="xs" tone="secondary">
          {guild ? t("settings.discord.discord.connectedTo", { server: guild.name }) : t("settings.discord.bot.description")}
        </AppText>
        {linked && data && !data.botReachable ? <Callout tone="warning" title={t("settings.discord.discord.botUnreachable")} /> : null}
        {linked && data?.botReachable && !guild ? <Callout tone="warning" title={t("settings.discord.discord.botNotInServer")} /> : null}
        {linkCode ? (
          <View style={{ gap: SPACING.sm }}>
            <AppText size="xs" tone="secondary">
              {t("settings.discord.bot.codeInstructions")}
            </AppText>
            <View style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: colors.muted }}>
              <AppText mono selectable size="lg" weight="semibold">
                {`/link ${linkCode.code}`}
              </AppText>
            </View>
            <AppText size="xs" tone="secondary">
              {t("settings.discord.bot.expiresIn", { seconds: secondsLeft })}
            </AppText>
          </View>
        ) : null}
        {canManage ? (
          linked ? (
            <Button variant="secondary" label={t("settings.discord.bot.unlink")} loading={unlink.isPending} onPress={confirmUnlink} />
          ) : (
            <Button
              icon="discord"
              label={generate.isPending ? t("settings.discord.bot.generating") : t("settings.discord.bot.generateButton")}
              loading={generate.isPending}
              onPress={() => generate.mutate()}
            />
          )
        ) : null}
      </Surface>

      {ready ? (
        <>
          <SectionHeader title={t("settings.discord.channelSettings.heading")} />
          <AppText size="xs" tone="secondary">
            {t("settings.discord.channelSettings.description")}
          </AppText>
          <Controller
            control={form.control}
            name="scanChannelId"
            render={({ field }) => (
              <SelectField
                label={t("settings.discord.channelSettings.scan")}
                value={channelLabel(channels, field.value, t, t("settings.discord.channelSettings.none"))}
                placeholder={t("settings.discord.channelSettings.none")}
                disabled={!canManage}
                onPress={() => setPicker({ kind: "scan", collectionGuid: null })}
              />
            )}
          />
          <Controller
            control={form.control}
            name="errorChannelId"
            render={({ field }) => (
              <SelectField
                label={t("settings.discord.channelSettings.error")}
                value={channelLabel(channels, field.value, t, t("settings.discord.channelSettings.none"))}
                placeholder={t("settings.discord.channelSettings.none")}
                disabled={!canManage}
                onPress={() => setPicker({ kind: "error", collectionGuid: null })}
              />
            )}
          />

          <SectionHeader title={t("settings.discord.overrides.heading")} />
          <AppText size="xs" tone="secondary">
            {t("settings.discord.overrides.description")}
          </AppText>
          {visibleOverrides.length === 0 ? (
            <AppText size="sm" tone="secondary">
              {t("settings.discord.overrides.empty")}
            </AppText>
          ) : (
            visibleOverrides.map(([collectionGuid, override]) => (
              <Surface key={collectionGuid} style={{ gap: SPACING.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
                  <AppText weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
                    {collectionName(collectionGuid)}
                  </AppText>
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon="trash"
                      label={t("cardDetail.remove")}
                      accessibilityHint={t("settings.discord.overrides.remove", { name: collectionName(collectionGuid) })}
                      onPress={() => removeOverride(collectionGuid)}
                    />
                  ) : null}
                </View>
                <SelectField
                  label={t("settings.discord.channelSettings.scan")}
                  value={channelLabel(channels, override.scanChannelId, t, t("settings.discord.channelSettings.sameScan"))}
                  placeholder={t("settings.discord.channelSettings.sameScan")}
                  disabled={!canManage}
                  onPress={() => setPicker({ kind: "scan", collectionGuid })}
                />
                <SelectField
                  label={t("settings.discord.channelSettings.error")}
                  value={channelLabel(channels, override.errorChannelId, t, t("settings.discord.channelSettings.sameError"))}
                  placeholder={t("settings.discord.channelSettings.sameError")}
                  disabled={!canManage}
                  onPress={() => setPicker({ kind: "error", collectionGuid })}
                />
              </Surface>
            ))
          )}
          {canManage ? (
            <Button
              variant="secondary"
              icon="plus"
              label={t("settings.discord.overrides.add")}
              loading={addOverride.isPending}
              onPress={() => setPicker({ kind: "add-collection" })}
            />
          ) : null}

          <SectionHeader title={t("settings.discord.rules.heading")} />
          <AppText size="xs" tone="secondary">
            {t("settings.discord.rules.description")}
          </AppText>
          {!gameGuid ? (
            <Callout tone="info" title={t("settings.discord.rules.needsGame")} />
          ) : rules.data && rules.data.length === 0 ? (
            <EmptyState icon="bell" title={t("settings.discord.rules.empty")} />
          ) : (
            <ListGroup>
              {(rules.data ?? []).map((rule) => {
                const role = roles.find((r) => r.id === rule.roleId);
                const target = rule.channelId
                  ? `${t("settings.discord.rules.postsTo")} ${channelLabel(channels, rule.channelId, t, "")}${role ? ` ${t("settings.discord.rules.andPings")} @${role.name}` : ""}`
                  : t("settings.discord.rules.noChannel");
                return (
                  <Controller
                    key={rule.guid}
                    control={form.control}
                    name={`ruleEnabled.${rule.guid}`}
                    render={({ field }) => (
                      <ListRow
                        title={rule.name}
                        subtitle={target}
                        disabled={!canManage}
                        onPress={() => router.push({ pathname: "/settings/notification-rule", params: { guid: rule.guid } })}
                        right={
                          <Switch
                            accessibilityLabel={t("settings.discord.rules.enabled")}
                            value={field.value ?? rule.isEnabled}
                            disabled={!canManage || !rule.channelId}
                            onValueChange={field.onChange}
                            trackColor={{ true: colors.primary, false: colors.muted }}
                          />
                        }
                      />
                    )}
                  />
                );
              })}
            </ListGroup>
          )}
          {canManage && gameGuid ? (
            <Button
              variant="secondary"
              icon="plus"
              label={t("settings.discord.rules.add")}
              onPress={() => router.push("/settings/notification-rule")}
            />
          ) : null}

          <SectionHeader title={t("settings.discord.notificationsHeading")} />
          <Controller
            control={form.control}
            name="discordNotifyOnScan"
            render={({ field }) => (
              <SwitchRow
                title={t("settings.discord.notifications.notifyToggleLabel")}
                description={t("settings.discord.notifications.notifyToggleDescription")}
                value={field.value}
                disabled={!canManage}
                onValueChange={field.onChange}
              />
            )}
          />
          <Controller
            control={form.control}
            name="discordScanUseThreads"
            render={({ field }) => (
              <SwitchRow
                title={t("settings.discord.notifications.threadToggleLabel")}
                description={t("settings.discord.notifications.threadToggleDescription")}
                value={field.value ?? DEFAULT_ORG_SETTINGS.discordScanUseThreads}
                disabled={!canManage}
                onValueChange={field.onChange}
              />
            )}
          />
        </>
      ) : null}

      <SectionHeader title={t("settings.discord.notifications.heading")} />
      <AppText size="xs" tone="secondary">
        {ready ? t("settings.discord.notifications.testHintReady") : t("settings.discord.notifications.testHintNotLinked")}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {NOTIFICATION_TEST_TYPES.map((type: NotificationTestType) => (
          <Button
            key={type}
            size="sm"
            variant="secondary"
            label={test.isPending && test.variables === type ? t("settings.discord.notifications.sending") : t(`settings.discord.notifications.testTypes.${type}`)}
            disabled={!ready || test.isPending}
            onPress={() => test.mutate(type)}
          />
        ))}
      </View>

      <OptionSheet
        visible={!!pickerConfig}
        title={pickerConfig?.title ?? ""}
        options={pickerConfig?.options ?? []}
        selected={pickerConfig?.selected ?? []}
        onSelect={onPick}
        onClose={() => setPicker(null)}
      />
    </SettingsPage>
  );
}
