import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams, useNavigation, usePreventRemove } from "expo-router";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import type { Announcement } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { SaveBar } from "@/components/ui/save-bar";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SwitchRow } from "@/components/ui/switch-row";
import { TextField } from "@/components/ui/text-field";
import {
  announcementFormSchema,
  toAnnouncementFormValues,
  toAnnouncementInput,
  translateAnnouncementFormError,
} from "@/features/admin/api/discord-announcement-form";
import {
  adminAnnouncementsQueryOptions,
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "@/features/admin/api/discord-announcements";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { ANNOUNCEMENT_SEVERITIES } from "@/lib/constants/admin-discord";
import { SPACING } from "@/lib/constants/theme";
import type { AnnouncementFormValues } from "@/lib/interfaces/admin-discord";

export default function AdminAnnouncementScreen() {
  return (
    <AdminGate>
      <AdminAnnouncementContent />
    </AdminGate>
  );
}

function AdminAnnouncementContent() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { guid } = useLocalSearchParams<{ guid?: string }>();
  const announcementsQuery = useQuery(adminAnnouncementsQueryOptions);
  const existing = guid ? announcementsQuery.data?.find((announcement) => announcement.guid === guid) : undefined;
  const [error, setError] = useState<string | null>(null);

  const values = useMemo(() => toAnnouncementFormValues(existing), [existing]);
  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    values,
    resetOptions: { keepDirtyValues: true },
  });
  const isDirty = form.formState.isDirty;

  const replaceCachedAnnouncements = (update: (announcements: Announcement[]) => Announcement[]) =>
    queryClient.setQueryData<Announcement[]>(adminAnnouncementsQueryOptions.queryKey, (current) => update(current ?? []));

  const save = useMutation({
    mutationFn: (draft: AnnouncementFormValues) => {
      const input = toAnnouncementInput(draft);
      return existing ? updateAnnouncement(existing.guid, input) : createAnnouncement(input);
    },
    onSuccess: (saved, draft) => {
      replaceCachedAnnouncements((announcements) =>
        existing
          ? announcements.map((announcement) => (announcement.guid === saved.guid ? saved : announcement))
          : [saved, ...announcements],
      );
      form.reset(draft);
      router.back();
    },
    onError: (err: Error) =>
      setError(
        err.message ||
          (existing ? t("admin.discord.announcements.updateFailed") : t("admin.discord.announcements.createFailed")),
      ),
  });

  const remove = useMutation({
    mutationFn: () => deleteAnnouncement(existing?.guid ?? ""),
    onSuccess: () => {
      replaceCachedAnnouncements((announcements) =>
        announcements.filter((announcement) => announcement.guid !== existing?.guid),
      );
      form.reset(values);
      router.back();
    },
    onError: (err: Error) => setError(err.message || t("admin.discord.announcements.deleteFailed")),
  });

  usePreventRemove(isDirty && !save.isPending && !remove.isPending, ({ data }) => {
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

  const submit = form.handleSubmit(
    (draft) => {
      setError(null);
      save.mutate(draft);
    },
    () => setError(t("admin.discord.announcements.fixErrors")),
  );

  const confirmDelete = () =>
    Alert.alert(t("admin.discord.announcements.deleteTitle"), t("admin.discord.announcements.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("admin.discord.announcements.delete"), style: "destructive", onPress: () => remove.mutate() },
    ]);

  const isMissing = !!guid && !announcementsQuery.isPending && !existing;
  const title = existing ? t("admin.discord.announcements.editTitle") : t("admin.discord.announcements.add");

  return (
    <View style={{ flex: 1 }}>
      <Screen header={<PageHeader title={title} onBack={() => router.back()} />}>
        {announcementsQuery.isPending && guid ? (
          <PageSkeleton />
        ) : isMissing ? (
          <Callout tone="warning" title={t("admin.discord.announcements.notFound")} />
        ) : (
          <>
            <AppText size="sm" tone="secondary">
              {t("admin.discord.announcements.formDescription")}
            </AppText>
            {error ? <Callout tone="destructive" title={error} /> : null}
            <Controller
              control={form.control}
              name="severity"
              render={({ field }) => (
                <View style={{ gap: SPACING.xs + 2 }}>
                  <AppText size="xs" weight="medium">
                    {t("admin.discord.announcements.severityLabel")}
                  </AppText>
                  <SegmentedControl
                    options={ANNOUNCEMENT_SEVERITIES.map((severity) => ({
                      value: severity,
                      label: t(`admin.discord.announcements.severity.${severity}`),
                    }))}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </View>
              )}
            />
            <Controller
              control={form.control}
              name="message"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("admin.discord.announcements.messageLabel")}
                  placeholder={t("admin.discord.announcements.messagePlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  multiline
                  error={translateAnnouncementFormError(t, fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={form.control}
              name="link"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("admin.discord.announcements.linkLabel")}
                  placeholder={t("admin.discord.announcements.linkPlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  autoComplete="off"
                  error={translateAnnouncementFormError(t, fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={form.control}
              name="startsAt"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("admin.discord.announcements.startsAtLabel")}
                  placeholder={t("admin.discord.announcements.dateTimePlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  autoComplete="off"
                  error={translateAnnouncementFormError(t, fieldState.error?.message)}
                />
              )}
            />
            <Controller
              control={form.control}
              name="endsAt"
              render={({ field, fieldState }) => (
                <TextField
                  label={t("admin.discord.announcements.endsAtLabel")}
                  placeholder={t("admin.discord.announcements.dateTimePlaceholder")}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  autoCapitalize="none"
                  autoComplete="off"
                  error={translateAnnouncementFormError(t, fieldState.error?.message)}
                />
              )}
            />
            <AppText size="xs" tone="secondary">
              {t("admin.discord.announcements.scheduleHint")}
            </AppText>
            <Controller
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <SwitchRow title={t("admin.discord.announcements.active")} value={field.value} onValueChange={field.onChange} />
              )}
            />
            <Controller
              control={form.control}
              name="showOnLanding"
              render={({ field }) => (
                <SwitchRow
                  title={t("admin.discord.announcements.showOnLandingLabel")}
                  description={t("admin.discord.announcements.showOnLandingDescription")}
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            {existing ? (
              <Button
                variant="ghost"
                icon="trash"
                label={t("admin.discord.announcements.delete")}
                loading={remove.isPending}
                onPress={confirmDelete}
              />
            ) : null}
          </>
        )}
      </Screen>
      <SaveBar
        visible={!isMissing && (isDirty || !existing)}
        saving={save.isPending}
        onSave={() => void submit()}
        onDiscard={() => (existing ? form.reset(values) : router.back())}
      />
    </View>
  );
}
