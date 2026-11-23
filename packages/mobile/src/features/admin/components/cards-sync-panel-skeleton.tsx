import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { TextLineSkeleton } from "@/components/ui/text-line-skeleton";
import { useTheme } from "@/hooks/use-theme";
import { ADMIN_SYNC_LOG_VISIBLE_LINES } from "@/lib/constants/admin-cards";
import { BADGE_RADIUS, CONTROL_RADIUS, RADIUS, SPACING } from "@/lib/constants/theme";
import { BUTTON_HEIGHTS, INPUT_HEIGHT, PILL_MIN_HEIGHT } from "@/lib/constants/ui";
import { SettingsSection } from "@/features/settings/components/settings-section";

function SelectFieldSkeleton() {
  return (
    <View style={{ gap: SPACING.xs + 2 }}>
      <TextLineSkeleton size="xs" width={96} />
      <Skeleton height={INPUT_HEIGHT} radius={CONTROL_RADIUS} />
    </View>
  );
}

export function CardsSyncPanelSkeleton() {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View style={{ gap: SPACING.lg }}>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader
          title={t("admin.cards.sync.heading")}
          action={<Skeleton width={56} height={PILL_MIN_HEIGHT} radius={BADGE_RADIUS} />}
        />
        <Surface style={{ gap: SPACING.md }}>
          <SelectFieldSkeleton />
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <View style={{ flex: 1 }}>
              <TextLineSkeleton width="55%" />
            </View>
            <Skeleton width={51} height={31} radius={CONTROL_RADIUS} />
          </View>
          <View style={{ gap: SPACING.xs }}>
            <SelectFieldSkeleton />
            <TextLineSkeleton size="xs" width="85%" />
          </View>
          <Skeleton height={BUTTON_HEIGHTS.md} radius={CONTROL_RADIUS} />
        </Surface>
      </View>
      <SettingsSection
        title={t("admin.cards.sync.logHeading")}
        description={t("admin.cards.sync.logDescription", { count: ADMIN_SYNC_LOG_VISIBLE_LINES })}
      >
        <Surface style={{ gap: SPACING.sm }}>
          <View style={{ padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: colors.muted, gap: 2 }}>
            <TextLineSkeleton size="2xs" width="70%" />
          </View>
        </Surface>
      </SettingsSection>
    </View>
  );
}
