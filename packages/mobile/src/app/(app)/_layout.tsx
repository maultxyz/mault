import { Stack, usePathname } from "expo-router";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppTopBar } from "@/components/app-top-bar";
import { GradientBurst } from "@/components/ui/gradient-burst";
import { MemberSeatLocked } from "@/features/org/components/member-seat-locked";
import { useActiveOrgId } from "@/hooks/use-org";
import { useShellPanelStyle } from "@/hooks/use-shell-panel-style";
import { useTheme } from "@/hooks/use-theme";
import { useMemberSeatLock } from "@/lib/api/member-seat-lock";
import { FULL_BLEED_ROUTE_PATTERN, UNFRAMED_STACK_ROUTE_NAMES } from "@/lib/constants/nav";
import { SHELL_PANEL_INSET } from "@/lib/constants/ui";

export default function AppLayout() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const seatLock = useMemberSeatLock(useActiveOrgId());
  const isFullBleed = !seatLock && FULL_BLEED_ROUTE_PATTERN.test(usePathname());
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
      {seatLock ? (
        <View style={panelStyle}>
          <MemberSeatLocked lock={seatLock} />
        </View>
      ) : null}
      <View style={{ flex: 1, display: seatLock ? "none" : "flex" }}>
        <Stack
          screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}
          screenLayout={({ route, children }) =>
            UNFRAMED_STACK_ROUTE_NAMES.has(route.name) ? (
              children
            ) : (
              <View collapsable={false} style={panelStyle}>
                {children}
              </View>
            )
          }
        >
          <Stack.Screen name="(tabs)" options={{ contentStyle: { backgroundColor: "transparent" } }} />
          <Stack.Screen name="collection/[guid]" />
          <Stack.Screen name="card/[scanId]" options={{ presentation: "modal", contentStyle: modalStyle }} />
          <Stack.Screen name="review-grid" />
          <Stack.Screen name="unmatched/[guid]" />
          <Stack.Screen name="unmatched-card" options={{ presentation: "modal", contentStyle: modalStyle }} />
          <Stack.Screen name="rules/index" />
          <Stack.Screen name="rules/[binNumber]" />
          <Stack.Screen name="rules/mode" />
          <Stack.Screen name="rules/repack" />
          <Stack.Screen name="rules/stages" />
          <Stack.Screen name="stats" />
          <Stack.Screen name="validate-matches" />
          <Stack.Screen name="collection-new" options={{ presentation: "modal", contentStyle: modalStyle }} />
          <Stack.Screen name="collection-rename" options={{ presentation: "modal", contentStyle: modalStyle }} />
          <Stack.Screen name="storage-name" options={{ presentation: "modal", contentStyle: modalStyle }} />
          <Stack.Screen name="storage-pick-list" />
          <Stack.Screen name="batch-scan" options={{ contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen
            name="storage-card-scan"
            options={{ contentStyle: { backgroundColor: colors.background } }}
          />
          <Stack.Screen
            name="desktop-camera/[guid]"
            options={{ gestureEnabled: false, contentStyle: { backgroundColor: colors.background } }}
          />
        </Stack>
      </View>
    </View>
  );
}
