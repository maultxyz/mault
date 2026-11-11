import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { OptionSheet } from "@/components/ui/option-sheet";
import { BrandIcon } from "@/components/ui/brand-icon";
import { useAppAlerts } from "@/features/stream/api/use-app-alerts";
import { pendingTradeOffersQueryOptions } from "@/features/trade-offers/api/trade-offers";
import { AlertsSheet } from "@/features/stream/components/alerts-sheet";
import { ValidateMatchesTopBarButton } from "@/features/match-validations/components/validate-matches-top-bar-button";
import { PlanPreviewTopBarChip } from "@/features/admin/components/plan-preview-top-bar-chip";
import { useActiveOrg, useSwitchOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session";
import { ALERT_BADGE_MAX } from "@/lib/constants/stream";
import { BADGE_RADIUS, CONTROL_RADIUS, RADIUS, SPACING } from "@/lib/constants/theme";
import {
  TOP_BAR_BRAND_ICON_SIZE,
  TOP_BAR_BRAND_SIZE,
  TOP_BAR_HEIGHT,
  MIN_TOUCH_TARGET,
  TOP_BAR_INITIAL_SIZE,
  TOP_BAR_SWITCHER_HEIGHT,
} from "@/lib/constants/ui";
import type { AppTopBarSheet, TopBarSwitcherProps } from "@/lib/interfaces/ui";

function TopBarSwitcher({ initial, label, accessibilityLabel, onPress }: TopBarSwitcherProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: (MIN_TOUCH_TARGET - TOP_BAR_SWITCHER_HEIGHT) / 2, bottom: (MIN_TOUCH_TARGET - TOP_BAR_SWITCHER_HEIGHT) / 2 }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs + 2,
        flexShrink: 1,
        minWidth: 0,
        height: TOP_BAR_SWITCHER_HEIGHT,
        paddingHorizontal: SPACING.xs,
        borderRadius: CONTROL_RADIUS,
        backgroundColor: pressed ? colors.shellAccent : "transparent",
      })}
    >
      <View
        style={{
          width: TOP_BAR_INITIAL_SIZE,
          height: TOP_BAR_INITIAL_SIZE,
          borderRadius: BADGE_RADIUS,
          backgroundColor: colors.foreground,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AppText size="2xs" weight="bold" style={{ color: colors.background, lineHeight: 14 }}>
          {initial}
        </AppText>
      </View>
      <AppText weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
        {label}
      </AppText>
      <Icon name="selector" size={14} color={colors.foregroundSecondary} />
    </Pressable>
  );
}

export function AppTopBar() {
  const { t } = useTranslation();
  const colors = useTheme();
  const { organizations } = useSession();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const switchOrg = useSwitchOrg();
  const hasSeveralOrganizations = organizations.length > 1;
  const alerts = useAppAlerts();
  const { data: tradeOffers = [] } = useQuery(pendingTradeOffersQueryOptions(orgId));
  const notificationCount = alerts.length + tradeOffers.length;
  const [openSheet, setOpenSheet] = useState<AppTopBarSheet | null>(null);
  const closeSheet = () => setOpenSheet(null);

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
      <View
        style={{
          width: TOP_BAR_BRAND_SIZE,
          height: TOP_BAR_BRAND_SIZE,
          borderRadius: RADIUS.md,
          overflow: "hidden",
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <BrandIcon size={TOP_BAR_BRAND_ICON_SIZE} color={colors.primaryForeground} />
      </View>
      {hasSeveralOrganizations ? (
        <View style={{ width: 1, height: 16, marginHorizontal: SPACING.xs, backgroundColor: colors.border }} />
      ) : null}
      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
        {hasSeveralOrganizations ? (
          <TopBarSwitcher
            initial={(org?.name ?? "?").charAt(0).toUpperCase()}
            label={org?.name ?? t("account.organizations")}
            accessibilityLabel={t("account.organizations")}
            onPress={() => setOpenSheet("organizations")}
          />
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
      <OptionSheet
        visible={openSheet === "organizations"}
        title={t("account.organizations")}
        options={organizations.map((organization) => ({ value: organization.id, label: organization.name }))}
        selected={orgId ? [orgId] : []}
        onSelect={(nextOrgId) => {
          closeSheet();
          switchOrg(nextOrgId);
        }}
        onClose={closeSheet}
      />
    </View>
  );
}
