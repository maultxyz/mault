import { NativeTabs } from "expo-router/native-tabs";
import { useTranslation } from "react-i18next";
import { useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTopBar } from "@/components/app-top-bar";
import { useTheme } from "@/hooks/use-theme";
import { IOS_SYMBOLS } from "@/lib/constants/ios-symbols";
import { ANDROID_TAB_SYMBOLS, TAB_ICONS } from "@/lib/constants/nav";

export function AppTabs() {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const contentStyle = { backgroundColor: colors.background };

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <AppTopBar opensNotificationsFromWidgetLink />
      <NativeTabs
        unstable_nativeProps={{ colorScheme: colorScheme === "dark" ? "dark" : "light" }}
        tintColor={colors.primaryText}
        indicatorColor={colors.primarySelected}
        iconColor={{ default: colors.foreground, selected: colors.primaryText }}
        labelStyle={{ default: { color: colors.foreground }, selected: { color: colors.primaryText } }}
      >
        <NativeTabs.Trigger name="index" contentStyle={contentStyle}>
          <NativeTabs.Trigger.Icon sf={IOS_SYMBOLS[TAB_ICONS.index]} md={ANDROID_TAB_SYMBOLS.index} />
          <NativeTabs.Trigger.Label>{t("tabs.home")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="scan" contentStyle={{ backgroundColor: colors.camera }}>
          <NativeTabs.Trigger.Icon sf={IOS_SYMBOLS[TAB_ICONS.scan]} md={ANDROID_TAB_SYMBOLS.scan} />
          <NativeTabs.Trigger.Label>{t("tabs.scan")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="collections" contentStyle={contentStyle}>
          <NativeTabs.Trigger.Icon sf={IOS_SYMBOLS[TAB_ICONS.collections]} md={ANDROID_TAB_SYMBOLS.collections} />
          <NativeTabs.Trigger.Label>{t("tabs.library")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="account" contentStyle={contentStyle}>
          <NativeTabs.Trigger.Icon sf={IOS_SYMBOLS[TAB_ICONS.account]} md={ANDROID_TAB_SYMBOLS.account} />
          <NativeTabs.Trigger.Label>{t("tabs.more")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}
