import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useIsOnline } from "@/hooks/use-is-online";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

export function OfflineBanner() {
  const { t } = useTranslation();
  const colors = useTheme();
  const isOnline = useIsOnline();
  if (isOnline) return null;
  return (
    <View
      accessible
      accessibilityLabel={`${t("offline.title")}. ${t("offline.description")}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.sm,
        paddingHorizontal: SCREEN_GUTTER,
        paddingVertical: SPACING.sm,
        backgroundColor: colors.warningMuted,
      }}
    >
      <Icon name="offline" size={16} color={colors.warningForeground} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText size="xs" weight="medium" style={{ color: colors.warningForeground }}>
          {t("offline.title")}
        </AppText>
        <AppText size="xs" style={{ color: colors.warningForeground }}>
          {t("offline.description")}
        </AppText>
      </View>
    </View>
  );
}
