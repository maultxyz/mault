import { router, useGlobalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { BrandIcon } from "@/components/ui/brand-icon";
import { useAppAlerts } from "@/features/stream/api/use-app-alerts";
import { pendingTradeOffersQueryOptions } from "@/features/trade-offers/api/trade-offers";
import { AlertsSheet } from "@/features/stream/components/alerts-sheet";
import { ValidateMatchesTopBarButton } from "@/features/match-validations/components/validate-matches-top-bar-button";
import { PlanPreviewTopBarChip } from "@/features/admin/components/plan-preview-top-bar-chip";
import { useActiveOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session";
import { ALERT_BADGE_MAX } from "@/lib/constants/stream";
import { CONTROL_RADIUS, RADIUS, SPACING } from "@/lib/constants/theme";
import {
  TOP_BAR_BRAND_ICON_SIZE,
  TOP_BAR_HEIGHT,
  MIN_TOUCH_TARGET,
  TOP_BAR_SWITCHER_HEIGHT,
} from "@/lib/constants/ui";
import { OPEN_NOTIFICATIONS_LINK_PARAM } from "@/lib/constants/widgets";
import type { AppTopBarProps, AppTopBarSheet } from "@/lib/interfaces/ui";

export function AppTopBar({ opensNotificationsFromWidgetLink = false }: AppTopBarProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const { organizations } = useSession();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const hasSeveralOrganizations = organizations.length > 1;
  const alerts = useAppAlerts();
  const { data: tradeOffers = [] } = useQuery(pendingTradeOffersQueryOptions(orgId));
  const notificationCount = alerts.length + tradeOffers.length;
  const [openSheet, setOpenSheet] = useState<AppTopBarSheet | null>(null);
  const closeSheet = () => setOpenSheet(null);
  const openNotificationsFromLink = useGlobalSearchParams()[OPEN_NOTIFICATIONS_LINK_PARAM];

  useEffect(() => {
    if (!opensNotificationsFromWidgetLink || !openNotificationsFromLink) return;
    setOpenSheet("alerts");
    router.setParams({ [OPEN_NOTIFICATIONS_LINK_PARAM]: undefined });
  }, [opensNotificationsFromWidgetLink, openNotificationsFromLink]);

  return (
    <View
      style={{
        height: TOP_BAR_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm + 2,
      }}
    >
      <BrandIcon size={TOP_BAR_BRAND_ICON_SIZE} color={colors.foreground} />
      {hasSeveralOrganizations ? (
        <View style={{ width: 1, height: 16, marginHorizontal: SPACING.xs, backgroundColor: colors.border }} />
      ) : null}
      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
        {hasSeveralOrganizations && org ? (
          <AppText weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {org.name}
          </AppText>
        ) : null}
      </View>
      <PlanPreviewTopBarChip />
      <ValidateMatchesTopBarButton />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={notificationCount > 0 ? `${t("alerts.title")}, ${notificationCount}` : t("alerts.title")}
        hitSlop={(MIN_TOUCH_TARGET - TOP_BAR_SWITCHER_HEIGHT) / 2}
        onPress={() => setOpenSheet("alerts")}
        style={({ pressed }) => ({
          width: TOP_BAR_SWITCHER_HEIGHT,
          height: TOP_BAR_SWITCHER_HEIGHT,
          borderRadius: CONTROL_RADIUS,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: pressed ? colors.shellAccent : "transparent",
        })}
      >
        <Icon name="bell" size={20} color={colors.foreground} />
        {notificationCount > 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              minWidth: 16,
              height: 16,
              paddingHorizontal: 3,
              borderRadius: RADIUS.full,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.destructiveStrong,
              borderWidth: 2,
              borderColor: colors.shell,
            }}
          >
            <AppText size="2xs" weight="semibold" style={{ color: colors.onStatusStrong, fontSize: 10, lineHeight: 12 }}>
              {notificationCount > ALERT_BADGE_MAX ? `${ALERT_BADGE_MAX}+` : String(notificationCount)}
            </AppText>
          </View>
        ) : null}
      </Pressable>
      <AlertsSheet
        visible={openSheet === "alerts"}
        alerts={alerts}
        tradeOffers={tradeOffers}
        onOpenTradeOffer={(guid) => {
          closeSheet();
          router.push({ pathname: "/trade-offer/[guid]", params: { guid } });
        }}
        onClose={closeSheet}
      />
    </View>
  );
}
