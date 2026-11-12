import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { AlertsSheetProps } from "@/lib/interfaces/stream";

export function AlertsSheet({ visible, alerts, tradeOffers, onOpenTradeOffer, onClose }: AlertsSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const toneColor = { info: colors.infoForeground, warning: colors.warningForeground, danger: colors.destructiveForeground };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("alerts.title")}
      description={`v${Constants.expoConfig?.version ?? ""}`}
      contentContainerStyle={{ gap: SPACING.sm }}
    >
      {tradeOffers.length > 0 ? (
        <View style={{ gap: SPACING.sm }}>
          <AppText size="sm" weight="semibold" accessibilityRole="header">
            {t("tradeOffers.trayHeading")}
          </AppText>
          {tradeOffers.map((offer) => (
            <Pressable
              key={offer.guid}
              accessibilityRole="button"
              accessibilityHint={t("tradeOffers.review")}
              onPress={() => onOpenTradeOffer(offer.guid)}
              style={{
                flexDirection: "row",
                gap: SPACING.sm,
                padding: SPACING.md,
                borderRadius: RADIUS.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.card,
              }}
            >
              <Icon name="transfer" size={18} color={colors.infoForeground} />
              <View style={{ flex: 1, gap: SPACING.xs }}>
                <AppText size="sm">
                  {t("tradeOffers.trayMessage", {
                    name: offer.guestName,
                    wanted: offer.wanted.length,
                    offered: offer.offered.reduce((sum, card) => sum + card.quantity, 0),
                  })}
                </AppText>
                <AppText size="xs" weight="semibold" tone="primary">
                  {t("tradeOffers.review")}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}
      {alerts.length === 0 && tradeOffers.length === 0 ? (
        <AppText size="sm" tone="secondary" style={{ textAlign: "center", paddingVertical: SPACING.xl }}>
          {t("alerts.empty")}
        </AppText>
      ) : (
        alerts.map((alert) => (
          <Pressable
            key={alert.id}
            accessibilityRole={alert.link ? "link" : undefined}
            disabled={!alert.link}
            onPress={() => (alert.link ? void Linking.openURL(alert.link) : undefined)}
            style={{
              flexDirection: "row",
              gap: SPACING.sm,
              padding: SPACING.md,
              borderRadius: RADIUS.md,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.card,
            }}
          >
            <Icon name={alert.severity === "info" ? "info" : "warning"} size={18} color={toneColor[alert.severity]} />
            <View style={{ flex: 1, gap: SPACING.xs }}>
              <AppText size="sm">{alert.message}</AppText>
              {alert.link ? (
                <AppText size="xs" weight="semibold" tone="primary">
                  {t("alerts.learnMore")}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        ))
      )}
    </Sheet>
  );
}
