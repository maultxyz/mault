import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { ReservationRequestsAlertsProps } from "@/lib/interfaces/business";

export function ReservationRequestsAlerts({ groups, onOpenReservations }: ReservationRequestsAlertsProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  if (groups.length === 0) return null;
  return (
    <View style={{ gap: SPACING.sm }}>
      <AppText size="sm" weight="semibold" accessibilityRole="header">
        {t("business.reservations.trayHeading")}
      </AppText>
      {groups.map((group) => (
        <Pressable
          key={group.requestGuid}
          accessibilityRole="button"
          accessibilityHint={t("business.reservations.trayReview")}
          onPress={onOpenReservations}
          style={{
            flexDirection: "row",
            gap: SPACING.sm,
            padding: SPACING.lg,
            borderRadius: SURFACE_RADIUS,
            borderCurve: "continuous",
            backgroundColor: colors.card,
          }}
        >
          <Icon name="bookmark" size={18} color={colors.infoForeground} />
          <View style={{ flex: 1, gap: SPACING.xs }}>
            <AppText size="sm">
              {t("business.reservations.trayToPull", { name: group.guestName, count: group.toPullCount })}
            </AppText>
            <AppText size="xs" weight="semibold" tone="primary">
              {t("business.reservations.trayReview")}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
