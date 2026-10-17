import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { useTheme } from "@/hooks/use-theme";
import { ALERT_BADGE_MAX } from "@/lib/constants/stream";
import { RADIUS } from "@/lib/constants/theme";
import type { AlertsBellProps } from "@/lib/interfaces/stream";

export function AlertsBell({ count, onPress }: AlertsBellProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  return (
    <View>
      <IconButton icon="bell" size={36} accessibilityLabel={t("alerts.title")} onPress={onPress} />
      {count > 0 ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            minWidth: 16,
            height: 16,
            paddingHorizontal: 4,
            borderRadius: RADIUS.full,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.destructiveStrong,
            borderWidth: 2,
            borderColor: colors.background,
          }}
        >
          <AppText size="2xs" weight="semibold" style={{ color: colors.destructiveForeground, lineHeight: 12 }}>
            {count > ALERT_BADGE_MAX ? `${ALERT_BADGE_MAX}+` : String(count)}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
