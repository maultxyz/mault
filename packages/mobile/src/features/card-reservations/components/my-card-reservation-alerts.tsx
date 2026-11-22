import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { MyCardReservationAlertsProps } from "@/lib/interfaces/card-reservations";

export function MyCardReservationAlerts({ alerts, onOpenReservations }: MyCardReservationAlertsProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  if (alerts.length === 0) return null;
  return (
    <View style={{ gap: SPACING.sm }}>
      <AppText size="sm" weight="semibold" accessibilityRole="header">
        {t("myReservations.trayHeading")}
      </AppText>
      {alerts.map((reservation) => (
        <Pressable
          key={reservation.guid}
          accessibilityRole="button"
          accessibilityHint={t("myReservations.view")}
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
              {t(`myReservations.alerts.${reservation.guestAlert}`, {
                card: reservation.card.name,
                catalog: reservation.catalogName ?? t("myReservations.unknownCatalog"),
              })}
            </AppText>
            <AppText size="xs" weight="semibold" tone="primary">
              {t("myReservations.view")}
            </AppText>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
