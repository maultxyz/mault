import {
  TRADE_OFFER_TRAY_MESSAGE_KEYS,
  tradeOfferMessageValues,
  tradeOfferOfferKind,
} from "@magic-vault/shared";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Linking, Pressable, View } from "react-native";
import { PullToRefreshControl } from "@/components/ui/pull-to-refresh-control";
import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { useAlertsRefresh } from "@/features/stream/api/use-alerts-refresh";
import { useTheme } from "@/hooks/use-theme";
import { SPACING, SURFACE_RADIUS } from "@/lib/constants/theme";
import type { AlertsSheetProps } from "@/lib/interfaces/stream";

export function AlertsSheet({ visible, alerts, tradeOffers, onOpenTradeOffer, onClose }: AlertsSheetProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const toneColor = { info: colors.infoForeground, warning: colors.warningForeground, danger: colors.destructiveForeground };
  const { refresh, isRefreshing } = useAlertsRefresh();
  const refreshAlerts = async () => {
    const succeeded = await refresh();
    AccessibilityInfo.announceForAccessibility(succeeded ? t("alerts.refreshed") : t("alerts.refreshFailed"));
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("alerts.title")}
      description={`v${Constants.expoConfig?.version ?? ""}`}
      contentContainerStyle={{ gap: SPACING.sm }}
      headerAction={
        <IconButton
          icon="refresh"
          variant="plain"
          accessibilityLabel={t("alerts.refresh")}
          disabled={isRefreshing}
          onPress={() => void refreshAlerts()}
        />
      }
      refreshControl={
        <PullToRefreshControl
          onRefresh={() => refreshAlerts()}
        />
      }
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
                padding: SPACING.lg,
                borderRadius: SURFACE_RADIUS,
                borderCurve: "continuous",
                backgroundColor: colors.card,
              }}
            >
              <Icon name="transfer" size={18} color={colors.infoForeground} />
              <View style={{ flex: 1, gap: SPACING.xs }}>
                <AppText size="sm">
                  {t(TRADE_OFFER_TRAY_MESSAGE_KEYS[tradeOfferOfferKind(offer)], {
                    name: offer.guestName,
                    ...tradeOfferMessageValues(offer),
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
        <EmptyState icon="bell" title={t("alerts.empty")} />
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
              padding: SPACING.lg,
              borderRadius: SURFACE_RADIUS,
              borderCurve: "continuous",
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
