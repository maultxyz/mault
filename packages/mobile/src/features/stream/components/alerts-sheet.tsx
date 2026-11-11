import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { Linking, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SHEET_SHADOW, SPACING } from "@/lib/constants/theme";
import type { AlertsSheetProps } from "@/lib/interfaces/stream";

export function AlertsSheet({ visible, alerts, tradeOffers, onOpenTradeOffer, onClose }: AlertsSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const toneColor = { info: colors.infoForeground, warning: colors.warningForeground, danger: colors.destructiveForeground };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityRole="button" accessibilityLabel={t("common.dismiss")} onPress={onClose} style={{ flex: 1, backgroundColor: colors.overlay }} />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose}
        style={{
          maxHeight: "75%",
          backgroundColor: colors.background,
          borderTopLeftRadius: RADIUS.xl,
          borderTopRightRadius: RADIUS.xl,
          borderWidth: 1,
          borderBottomWidth: 0,
          borderColor: colors.border,
          ...SHEET_SHADOW,
          shadowColor: colors.popoverShadow,
          paddingBottom: insets.bottom + SPACING.md,
        }}
      >
        <View style={{ alignItems: "center", paddingTop: SPACING.sm }}>
          <View style={{ width: 36, height: 4, borderRadius: RADIUS.full, backgroundColor: colors.border }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md }}>
          <View style={{ flex: 1 }}>
            <AppText size="lg" heading weight="bold" accessibilityRole="header">
              {t("alerts.title")}
            </AppText>
            <AppText size="xs" tone="secondary">
              {`v${Constants.expoConfig?.version ?? ""}`}
            </AppText>
          </View>
          <IconButton icon="dismiss" size={36} accessibilityLabel={t("common.dismiss")} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: SCREEN_GUTTER, gap: SPACING.sm, paddingBottom: SPACING.md }}>
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
        </ScrollView>
      </View>
    </Modal>
  );
}
