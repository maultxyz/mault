import { Stack, usePathname } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTopBar } from "@/components/app-top-bar";
import { GradientBurst } from "@/components/ui/gradient-burst";
import { useShellPanelStyle } from "@/hooks/use-shell-panel-style";
import { useTheme } from "@/hooks/use-theme";
import { FULL_BLEED_ROUTE_PATTERN } from "@/lib/constants/nav";
import { SHELL_PANEL_INSET } from "@/lib/constants/ui";

export default function AppLayout() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const isFullBleed = FULL_BLEED_ROUTE_PATTERN.test(usePathname());
  const panelStyle = useShellPanelStyle(Math.max(insets.bottom, SHELL_PANEL_INSET));
  const modalStyle = { backgroundColor: colors.background };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isFullBleed ? colors.background : colors.shell,
        paddingTop: isFullBleed ? 0 : insets.top,
      }}
    >
      {isFullBleed ? null : <GradientBurst />}
      {isFullBleed ? null : <AppTopBar />}
      <Stack screenOptions={{ headerShown: false, contentStyle: panelStyle }}>
        <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: "transparent" } }} />
        <Stack.Screen name="collection/[guid]" />
        <Stack.Screen name="card/[scanId]" options={{ presentation: "modal", contentStyle: modalStyle }} />
        <Stack.Screen name="review-grid" />
        <Stack.Screen name="rules/[binNumber]" />
        <Stack.Screen name="rules/mode" />
        <Stack.Screen name="rules/repack" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="collection-new" options={{ presentation: "modal", contentStyle: modalStyle }} />
        <Stack.Screen name="collection-rename" options={{ presentation: "modal", contentStyle: modalStyle }} />
        <Stack.Screen name="storage-name" options={{ presentation: "modal", contentStyle: modalStyle }} />
        <Stack.Screen
          name="desktop-camera/[guid]"
          options={{ gestureEnabled: false, contentStyle: { backgroundColor: colors.background } }}
        />
      </Stack>
    </View>
  );
}
