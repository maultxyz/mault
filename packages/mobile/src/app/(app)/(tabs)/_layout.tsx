import { Tabs } from "expo-router/tabs";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import { TAB_ICONS } from "@/lib/constants/nav";
import { TAB_BAR_HEIGHT, TAB_ICON_SIZE } from "@/lib/constants/ui";

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.foregroundSecondary,
        tabBarActiveBackgroundColor: colors.background,
        tabBarInactiveBackgroundColor: colors.background,
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: { height: TAB_BAR_HEIGHT, paddingVertical: 0, justifyContent: "center", gap: 2 },
        tabBarIcon: ({ color }) => (
          <Icon name={TAB_ICONS[route.name]} size={TAB_ICON_SIZE} color={typeof color === "string" ? color : colors.foreground} />
        ),
        tabBarLabel: ({ focused, color, children }) => (
          <AppText size="2xs" weight={focused ? "semibold" : "medium"} style={{ color, lineHeight: 14 }}>
            {children}
          </AppText>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: t("tabs.home") }} />
      <Tabs.Screen name="scan" options={{ title: t("tabs.scan") }} />
      <Tabs.Screen name="rules" options={{ title: t("tabs.rules") }} />
      <Tabs.Screen name="storage" options={{ title: t("tabs.storage") }} />
      <Tabs.Screen name="account" options={{ title: t("tabs.account") }} />
    </Tabs>
  );
}
