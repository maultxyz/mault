import { Tabs } from "expo-router/tabs";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useShellPanelStyle } from "@/hooks/use-shell-panel-style";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS } from "@/lib/constants/theme";
import { TAB_ICONS } from "@/lib/constants/nav";
import { TAB_ACTIVE_INDICATOR_HEIGHT, TAB_ACTIVE_INDICATOR_WIDTH, TAB_BAR_HEIGHT, TAB_ICON_SIZE } from "@/lib/constants/ui";

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const panelStyle = useShellPanelStyle();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: route.name === "scan" ? { ...panelStyle, backgroundColor: colors.camera } : panelStyle,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.foregroundSecondary,
        tabBarActiveBackgroundColor: colors.shell,
        tabBarInactiveBackgroundColor: colors.shell,
        tabBarStyle: {
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 0,
          backgroundColor: colors.shell,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: { height: TAB_BAR_HEIGHT, paddingVertical: 0, justifyContent: "center", gap: 2 },
        tabBarIcon: ({ focused, color }) => (
          <View
            style={{
              width: TAB_ACTIVE_INDICATOR_WIDTH,
              height: TAB_ACTIVE_INDICATOR_HEIGHT,
              borderRadius: RADIUS.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: focused ? colors.primarySelected : "transparent",
            }}
          >
            <Icon name={TAB_ICONS[route.name]} size={TAB_ICON_SIZE} color={typeof color === "string" ? color : colors.foreground} />
          </View>
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
