import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, Linking, View } from "react-native";
import {
  PRICE_SYNC_SCRIPT_COMMAND,
  PLATFORM_STATS_SCRIPT_COMMAND,
  DONATE_URL,
  PLATFORM_STAT_KEYS,
  type PlatformDiscordChannelKey,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SaveBar } from "@/components/ui/save-bar";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SwitchRow } from "@/components/ui/switch-row";
import {
  hasSameValues,
  platformDiscordAdminDraftSchema,
  toggledPlatformStatKeys,
  toPlatformDiscordAdminDraft,
} from "@/features/admin/api/discord-admin-draft";
import { adminAnnouncementsQueryOptions } from "@/features/admin/api/discord-announcements";
import {
  platformDiscordChannelsQueryOptions,
  platformDiscordLinkedRoleQueryOptions,
  platformStatsQueryOptions,
  postPlatformStatsNow,
  savePlatformDiscordChannels,
  savePlatformDiscordLinkedRole,
  savePlatformStatsSettings,
} from "@/features/admin/api/discord-channels";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { DiscordAnnouncementRow } from "@/features/admin/components/discord-announcement-row";
import { DiscordGuildTargetFields } from "@/features/admin/components/discord-guild-target-fields";
import { DiscordScriptCommand } from "@/features/admin/components/discord-script-command";
import {
  ADMIN_DISCORD_ANNOUNCEMENT_ROUTE,
} from "@/lib/constants/admin-discord";
import { SPACING } from "@/lib/constants/theme";
import { formatDateTime } from "@/lib/dates";
import type { PlatformDiscordAdminDraftFormValues } from "@/lib/interfaces/admin-discord";
import type { StatusTone } from "@/lib/interfaces/theme";

export default function AdminDiscordScreen() {
  return (
    <AdminGate>
      <AdminDiscordContent />
    </AdminGate>
  );
}

function AdminDiscordContent() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const channelsQuery = useQuery(platformDiscordChannelsQueryOptions);
  const statsQuery = useQuery(platformStatsQueryOptions);
  const linkedRoleQuery = useQuery(platformDiscordLinkedRoleQueryOptions);
  const announcementsQuery = useQuery(adminAnnouncementsQueryOptions);
  const [message, setMessage] = useState<{ tone: StatusTone; text: string } | null>(null);
  const [saveError, setSaveError] = useState(false);

  const values = useMemo(
    () => toPlatformDiscordAdminDraft(channelsQuery.data, statsQuery.data, linkedRoleQuery.data),
    [channelsQuery.data, statsQuery.data, linkedRoleQuery.data],
  );
  const form = useForm<PlatformDiscordAdminDraftFormValues>({
    resolver: zodResolver(platformDiscordAdminDraftSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const draftChannels = useWatch({ control: form.control, name: "channels" });
  const draftStatKeys = useWatch({ control: form.control, name: "stats" });
  const draftLinkedRole = useWatch({ control: form.control, name: "linkedRole" });
  const isDirty = form.formState.isDirty;
  const isSaving = form.formState.isSubmitting;

  const postNow = useMutation({
    mutationFn: postPlatformStatsNow,
    onSuccess: (posted) => {
      queryClient.setQueryData(platformStatsQueryOptions.queryKey, posted);
      setMessage({ tone: "success", text: t("admin.discord.stats.posted") });
    },
    onError: (error: Error) => setMessage({ tone: "destructive", text: error.message || t("admin.discord.stats.postFailed") }),
  });

  usePreventRemove(isDirty && !isSaving, ({ data }) => {
    Alert.alert(t("common.discardTitle"), t("settings.discardDescription"), [
      { text: t("common.keepEditing"), style: "cancel" },
      {
        text: t("common.discard"),
        style: "destructive",
        onPress: () => {
          form.reset(values);
          navigation.dispatch(data.action);
        },
      },
    ]);
  });

  const submit = async (draft: PlatformDiscordAdminDraftFormValues) => {
    setSaveError(false);
    setMessage(null);
    let failed = false;
    if (!hasSameValues(draft.channels, values.channels)) {
      try {
        const saved = await savePlatformDiscordChannels(draft.channels);
        queryClient.setQueryData(platformDiscordChannelsQueryOptions.queryKey, saved);
        void queryClient.invalidateQueries({ queryKey: platformStatsQueryOptions.queryKey });
      } catch {
        failed = true;
      }
    }
    if (!hasSameValues(draft.stats, values.stats)) {
      try {
        const saved = await savePlatformStatsSettings({ stats: draft.stats });
        queryClient.setQueryData(platformStatsQueryOptions.queryKey, saved);
      } catch {
        failed = true;
      }
    }
    if (!hasSameValues(draft.linkedRole, values.linkedRole)) {
      try {
        const saved = await savePlatformDiscordLinkedRole(draft.linkedRole);
        queryClient.setQueryData(platformDiscordLinkedRoleQueryOptions.queryKey, saved);
      } catch {
        failed = true;
      }
    }
    if (failed) {
      setSaveError(true);
      return;
    }
    form.reset(draft);
    setMessage({ tone: "success", text: t("admin.discord.saved") });
  };

  const isLoading = channelsQuery.isPending || statsQuery.isPending || linkedRoleQuery.isPending;
  const loadFailed = !isLoading && (!channelsQuery.data || !statsQuery.data);
  const guilds = channelsQuery.data?.guilds ?? [];
  const botReachable = channelsQuery.data?.botReachable ?? false;
  const statsData = statsQuery.data;
  const canPostStats = !isDirty && !!statsData?.channelConfigured && statsData.settings.stats.length > 0;

  const setChannelField = (channelKey: PlatformDiscordChannelKey, field: "guildId" | "channelId", next: string | null) =>
    form.setValue(`channels.${channelKey}.${field}`, next, { shouldDirty: true });

  const channelFields = (channelKey: PlatformDiscordChannelKey) => (
    <DiscordGuildTargetFields
      targetKind="channel"
      guilds={guilds}
      botReachable={botReachable}
      guildId={draftChannels?.[channelKey]?.guildId ?? null}
      targetId={draftChannels?.[channelKey]?.channelId ?? null}
      onGuildChange={(next) => setChannelField(channelKey, "guildId", next)}
      onTargetChange={(next) => setChannelField(channelKey, "channelId", next)}
    />
  );

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "discord"] });
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        refreshing={channelsQuery.isRefetching || announcementsQuery.isRefetching}
        onRefresh={refresh}
        header={
          <PageHeader
            title={t("admin.sections.discord.title")}
            subtitle={t("admin.sections.discord.subtitle")}
            onBack={() => router.back()}
          />
        }
      >
        {saveError ? <Callout tone="destructive" title={t("settings.draft.saveFailed")} /> : null}
        {message ? <Callout tone={message.tone} title={message.text} /> : null}
        {isLoading ? (
          <PageSkeleton />
        ) : loadFailed ? (
          <Callout
            tone="destructive"
            title={t("admin.discord.loadFailed")}
            action={<Button variant="secondary" icon="refresh" label={t("admin.discord.retry")} onPress={refresh} />}
          />
        ) : (
          <>
            {!botReachable ? <Callout tone="warning" title={t("admin.discord.botUnreachable")} /> : null}

            <SectionHeader title={t("admin.discord.channels.stats.heading")} />
            <AppText size="xs" tone="secondary">
              {t("admin.discord.channels.stats.description")}
            </AppText>
            {channelFields("stats")}
            <AppText size="xs" tone="secondary">
              {t("admin.discord.stats.statsDescription")}
            </AppText>
            <View style={{ gap: SPACING.md }}>
              {PLATFORM_STAT_KEYS.map((statKey) => (
                <SwitchRow
                  key={statKey}
                  title={t(`admin.discord.stats.keys.${statKey}.label`)}
                  description={t(`admin.discord.stats.keys.${statKey}.description`)}
                  value={(draftStatKeys ?? []).includes(statKey)}
                  onValueChange={(isSelected) =>
                    form.setValue("stats", toggledPlatformStatKeys(draftStatKeys ?? [], statKey, isSelected), {
                      shouldDirty: true,
                    })
                  }
                />
              ))}
            </View>
            <DiscordScriptCommand command={PLATFORM_STATS_SCRIPT_COMMAND} description={t("admin.discord.stats.scheduleDescription")} />
            <AppText size="xs" tone="secondary">
              {[
                statsData?.lastPostedAt
                  ? t("admin.discord.stats.lastPosted", { date: formatDateTime(statsData.lastPostedAt, i18n.language) })
                  : t("admin.discord.stats.neverPosted"),
                isDirty ? t("admin.discord.stats.saveBeforePosting") : null,
              ]
                .filter(Boolean)
                .join(" ")}
            </AppText>
            <Button
              variant="secondary"
              icon="send"
              label={t("admin.discord.stats.postNow")}
              loading={postNow.isPending}
              disabled={!canPostStats}
              onPress={() => postNow.mutate()}
            />

            <SectionHeader title={t("admin.discord.channels.donations.heading")} />
            <AppText size="xs" tone="secondary">
              {t("admin.discord.channels.donations.description")}
            </AppText>
            {channelFields("donations")}
            <Button
              variant="ghost"
              icon="external"
              label={t("admin.discord.donationsLink")}
              accessibilityHint={t("admin.discord.opensInBrowser")}
              onPress={() => void Linking.openURL(DONATE_URL)}
            />

            <SectionHeader title={t("admin.discord.channels.pricing.heading")} />
            <AppText size="xs" tone="secondary">
              {t("admin.discord.channels.pricing.description")}
            </AppText>
            {channelFields("pricing")}
            <DiscordScriptCommand command={PRICE_SYNC_SCRIPT_COMMAND} description={t("admin.discord.priceSyncCommand")} />

            <SectionHeader title={t("admin.discord.linkedRole.heading")} />
            <AppText size="xs" tone="secondary">
              {t("admin.discord.linkedRole.description")}
            </AppText>
            <DiscordGuildTargetFields
              targetKind="role"
              guilds={guilds}
              botReachable={botReachable}
              guildId={draftLinkedRole?.guildId ?? null}
              targetId={draftLinkedRole?.roleId ?? null}
              onGuildChange={(next) => form.setValue("linkedRole.guildId", next, { shouldDirty: true })}
              onTargetChange={(next) => form.setValue("linkedRole.roleId", next, { shouldDirty: true })}
            />
          </>
        )}

        <SectionHeader title={t("admin.discord.announcements.heading")} />
        <AppText size="xs" tone="secondary">
          {t("admin.discord.announcements.description")}
        </AppText>
        {announcementsQuery.isPending ? (
          <ListSkeleton withIcon={false} />
        ) : announcementsQuery.isError ? (
          <Callout tone="destructive" title={t("admin.discord.announcements.loadFailed")} />
        ) : announcementsQuery.data.length === 0 ? (
          <EmptyState icon="announcement" title={t("admin.discord.announcements.empty")} />
        ) : (
          <ListGroup>
            {announcementsQuery.data.map((announcement) => (
              <DiscordAnnouncementRow
                key={announcement.guid}
                announcement={announcement}
                onPress={() =>
                  router.push({ pathname: ADMIN_DISCORD_ANNOUNCEMENT_ROUTE, params: { guid: announcement.guid } })
                }
              />
            ))}
          </ListGroup>
        )}
        <Button
          variant="secondary"
          icon="plus"
          label={t("admin.discord.announcements.add")}
          onPress={() => router.push(ADMIN_DISCORD_ANNOUNCEMENT_ROUTE)}
        />
      </Screen>
      <SaveBar
        visible={isDirty}
        saving={isSaving}
        onSave={() => void form.handleSubmit(submit)()}
        onDiscard={() => form.reset(values)}
      />
    </View>
  );
}
