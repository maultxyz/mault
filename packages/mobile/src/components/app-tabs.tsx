import { useQuery } from "@tanstack/react-query";
import { NativeTabs } from "expo-router/native-tabs";
import { useTranslation } from "react-i18next";
import { useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTopBar } from "@/components/app-top-bar";
import { billingQueryOptions } from "@/features/org/api/billing";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { IOS_SYMBOLS } from "@/lib/constants/ios-symbols";
import { ANDROID_TAB_SYMBOLS, TAB_ICONS } from "@/lib/constants/nav";

export function AppTabs() {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const orgId = useActiveOrgId();
  const { data: billing } = useQuery(billingQueryOptions(orgId));
  const isStorageNotInPlan = billing?.storage === false;
  const isStorageLocked = isStorageNotInPlan && !billing?.storageLocationCount;
  const contentStyle = { backgroundColor: colors.background };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <AppTopBar />
      <NativeTabs
        unstable_nativeProps={{ colorScheme: colorScheme === "dark" ? "dark" : "light" }}
        tintColor={colors.primaryText}
        indicatorColor={colors.primarySelected}
        iconColor={{ default: colors.foreground, selected: colors.primaryText }}
        labelStyle={{ default: { color: colors.foreground }, selected: { color: colors.primaryText } }}
      >
        <NativeTabs.Trigger name="index" contentStyle={contentStyle}>
          <NativeTabs.Trigger.Icon sf={IOS_SYMBOLS[TAB_ICONS.index]} md={ANDROID_TAB_SYMBOLS.index} />
          <NativeTabs.Trigger.Label>{t("tabs.collections")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="scan" contentStyle={{ backgroundColor: colors.camera }}>
          <NativeTabs.Trigger.Icon sf={IOS_SYMBOLS[TAB_ICONS.scan]} md={ANDROID_TAB_SYMBOLS.scan} />
          <NativeTabs.Trigger.Label>{t("tabs.scan")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger
          name="storage"
          contentStyle={contentStyle}
          disabled={isStorageLocked}
          accessibilityLabel={isStorageNotInPlan ? `${t("tabs.storage")}, ${t("tabs.upgradeYourPlan")}` : undefined}
        >
          <NativeTabs.Trigger.Icon sf={IOS_SYMBOLS[TAB_ICONS.storage]} md={ANDROID_TAB_SYMBOLS.storage} />
          <NativeTabs.Trigger.Label>{t("tabs.storage")}</NativeTabs.Trigger.Label>
          {isStorageNotInPlan ? <NativeTabs.Trigger.Badge>{t("tabs.upgradeShort")}</NativeTabs.Trigger.Badge> : null}
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="account" contentStyle={contentStyle}>
          <NativeTabs.Trigger.Icon sf={IOS_SYMBOLS[TAB_ICONS.account]} md={ANDROID_TAB_SYMBOLS.account} />
          <NativeTabs.Trigger.Label>{t("tabs.more")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}
