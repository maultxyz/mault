import { useContext } from "react";
import { ScrollView, View } from "react-native";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { PullToRefreshControl } from "@/components/ui/pull-to-refresh-control";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { ScreenProps } from "@/lib/interfaces/ui";
import { OfflineBannerHostContext } from "@/lib/offline-banner-host-context";

export function Screen({
  children,
  scroll = true,
  padded = true,
  onRefresh,
  edges = [],
  header,
  contentStartsWithList = false,
}: ScreenProps) {
  const colors = useTheme();
  const isOfflineBannerHosted = useContext(OfflineBannerHostContext);
  const padding = padded ? SCREEN_GUTTER : 0;
  const topPadding = contentStartsWithList ? 0 : padding;
  const safeEdges = header ? edges.filter((edge) => edge !== "top") : edges;
  return (
    <SafeAreaView edges={safeEdges} style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      {isOfflineBannerHosted ? null : <OfflineBanner />}
      {scroll ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: padding,
            paddingTop: topPadding,
            paddingBottom: padding + SPACING.xxl,
            gap: SPACING.lg + SPACING.xs,
          }}
          refreshControl={onRefresh ? <PullToRefreshControl onRefresh={onRefresh} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: padding, paddingTop: topPadding }}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
