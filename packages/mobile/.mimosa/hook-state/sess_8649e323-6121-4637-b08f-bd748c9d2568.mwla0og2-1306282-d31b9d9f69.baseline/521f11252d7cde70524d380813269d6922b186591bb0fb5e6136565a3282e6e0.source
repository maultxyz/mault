import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { useTheme } from "@/hooks/use-theme";
import { ANNOUNCEMENT_SEVERITY_TONE } from "@/lib/constants/admin-discord";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { LIST_ROW_MIN_HEIGHT } from "@/lib/constants/ui";
import { formatDateTime } from "@/lib/dates";
import type { DiscordAnnouncementRowProps } from "@/lib/interfaces/admin-discord";

export function DiscordAnnouncementRow({ announcement, onPress }: DiscordAnnouncementRowProps) {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const severityLabel = t(`admin.discord.announcements.severity.${announcement.severity}`);
  const statusLabel = announcement.isActive
    ? t("admin.discord.announcements.active")
    : t("admin.discord.announcements.inactive");
  const schedule = (() => {
    const { startsAt, endsAt } = announcement;
    if (startsAt && endsAt) {
      return t("admin.discord.announcements.schedule.startsAndEnds", {
        start: formatDateTime(startsAt, i18n.language),
        end: formatDateTime(endsAt, i18n.language),
      });
    }
    if (startsAt) return t("admin.discord.announcements.schedule.starts", { date: formatDateTime(startsAt, i18n.language) });
    if (endsAt) return t("admin.discord.announcements.schedule.ends", { date: formatDateTime(endsAt, i18n.language) });
    return null;
  })();
  const accessibilityLabel = [
    severityLabel,
    statusLabel,
    announcement.showOnLanding ? t("admin.discord.announcements.onLandingPage") : null,
    announcement.message,
    announcement.link,
    schedule,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t("admin.discord.announcements.editHint")}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.md,
        minHeight: LIST_ROW_MIN_HEIGHT,
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: SPACING.sm,
        backgroundColor: pressed ? colors.muted : "transparent",
      })}
    >
      <View style={{ flex: 1, minWidth: 0, gap: SPACING.xs }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.xs }}>
          <Pill label={severityLabel} tone={ANNOUNCEMENT_SEVERITY_TONE[announcement.severity]} />
          <Pill label={statusLabel} tone={announcement.isActive ? "success" : "neutral"} />
          {announcement.showOnLanding ? <Pill label={t("admin.discord.announcements.onLandingPage")} /> : null}
        </View>
        <AppText numberOfLines={3}>{announcement.message}</AppText>
        {announcement.link ? (
          <AppText size="xs" tone="secondary" numberOfLines={1}>
            {announcement.link}
          </AppText>
        ) : null}
        {schedule ? (
          <AppText size="xs" tone="secondary" numberOfLines={2}>
            {schedule}
          </AppText>
        ) : null}
      </View>
      <Icon name="chevron" size={16} color={colors.foregroundSecondary} />
    </Pressable>
  );
}
