import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, View } from "react-native";
import { gameAbbreviation } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { OptionSheet } from "@/components/ui/option-sheet";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useActivateCollection } from "@/features/collections/api/use-activate-collection";
import { useAppAlerts } from "@/features/stream/api/use-app-alerts";
import { AlertsSheet } from "@/features/stream/components/alerts-sheet";
import { useActiveOrg, useSwitchOrg } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { useSession } from "@/lib/auth/session";
import { BRAND_MARK } from "@/lib/constants/brand";
import { ALERT_BADGE_MAX } from "@/lib/constants/stream";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import {
  TOP_BAR_BRAND_MARK_SCALE,
  TOP_BAR_BRAND_SIZE,
  TOP_BAR_HEIGHT,
  TOP_BAR_INITIAL_SIZE,
  TOP_BAR_SWITCHER_HEIGHT,
} from "@/lib/constants/ui";
import type { AppTopBarSheet, TopBarSwitcherProps } from "@/lib/interfaces/ui";

function TopBarSwitcher({ initial, label, badge, accessibilityLabel, onPress }: TopBarSwitcherProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: SPACING.xs + 2,
        flexShrink: 1,
        minWidth: 0,
        height: TOP_BAR_SWITCHER_HEIGHT,
        paddingHorizontal: SPACING.xs,
        borderRadius: RADIUS.md,
        backgroundColor: pressed ? colors.shellAccent : "transparent",
      })}
    >
      <View
        style={{
          width: TOP_BAR_INITIAL_SIZE,
          height: TOP_BAR_INITIAL_SIZE,
          borderRadius: RADIUS.sm,
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
      {badge ? (
        <View
          style={{
            height: 20,
            paddingHorizontal: SPACING.xs + 2,
            borderRadius: RADIUS.sm,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: "center",
          }}
        >
          <AppText size="2xs" weight="medium" style={{ lineHeight: 14 }}>
            {badge}
          </AppText>
        </View>
      ) : null}
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
  const { data: collections } = useQuery(collectionsQueryOptions(orgId));
  const activeCollection = collections?.find((collection) => collection.isActive) ?? null;
  const activateCollection = useActivateCollection(orgId);
  const alerts = useAppAlerts();
  const [openSheet, setOpenSheet] = useState<AppTopBarSheet | null>(null);
  const closeSheet = () => setOpenSheet(null);
  const collectionBadge = activeCollection
    ? [activeCollection.game ? gameAbbreviation(activeCollection.game.key) : null, activeCollection.lang.toUpperCase()]
        .filter(Boolean)
        .join(" · ")
    : undefined;

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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("alerts.title")}
        onPress={() => setOpenSheet("alerts")}
        style={({ pressed }) => ({
          width: TOP_BAR_BRAND_SIZE,
          height: TOP_BAR_BRAND_SIZE,
          borderRadius: RADIUS.md,
          backgroundColor: pressed ? colors.primaryPressed : colors.primary,
          alignItems: "center",
          justifyContent: "center",
        })}
      >
        <View
          style={{
            width: TOP_BAR_BRAND_SIZE,
            height: TOP_BAR_BRAND_SIZE,
            borderRadius: RADIUS.md,
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Image
            source={BRAND_MARK}
            style={{
              width: TOP_BAR_BRAND_SIZE * TOP_BAR_BRAND_MARK_SCALE,
              height: TOP_BAR_BRAND_SIZE * TOP_BAR_BRAND_MARK_SCALE,
            }}
          />
        </View>
        {alerts.length > 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -4,
              right: -4,
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
              {alerts.length > ALERT_BADGE_MAX ? `${ALERT_BADGE_MAX}+` : String(alerts.length)}
            </AppText>
          </View>
        ) : null}
      </Pressable>
      <View style={{ width: 1, height: 16, marginHorizontal: SPACING.xs, backgroundColor: colors.border }} />
      <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
        <TopBarSwitcher
          initial={(org?.name ?? "?").charAt(0).toUpperCase()}
          label={org?.name ?? t("account.organizations")}
          accessibilityLabel={t("account.organizations")}
          onPress={() => setOpenSheet("organizations")}
        />
        <AppText tone="secondary">/</AppText>
        <TopBarSwitcher
          initial={(activeCollection?.name ?? "?").charAt(0).toUpperCase()}
          label={activeCollection?.name ?? t("scan.noCollectionTitle")}
          badge={collectionBadge}
          accessibilityLabel={t("scan.chooseCollection")}
          onPress={() => setOpenSheet("collections")}
        />
      </View>
      <AlertsSheet visible={openSheet === "alerts"} alerts={alerts} onClose={closeSheet} />
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
      <OptionSheet
        visible={openSheet === "collections"}
        title={t("scan.chooseCollection")}
        options={(collections ?? []).map((collection) => ({ value: collection.guid, label: collection.name }))}
        selected={activeCollection ? [activeCollection.guid] : []}
        onSelect={(guid) => {
          closeSheet();
          if (guid !== activeCollection?.guid) activateCollection.mutate(guid);
        }}
        onClose={closeSheet}
      />
    </View>
  );
}
