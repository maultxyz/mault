import { RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { ScreenProps } from "@/lib/interfaces/ui";

export function Screen({
  children,
  scroll = true,
  padded = true,
  refreshing = false,
  onRefresh,
  edges = [],
  header,
}: ScreenProps) {
  const colors = useTheme();
  const padding = padded ? SCREEN_GUTTER : 0;
  const safeEdges = header ? edges.filter((edge) => edge !== "top") : edges;
  return (
    <SafeAreaView edges={safeEdges} style={{ flex: 1, backgroundColor: colors.background }}>
      {header}
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: padding,
            paddingTop: padding,
            paddingBottom: padding + SPACING.xxl,
            gap: SPACING.lg + SPACING.xs,
          }}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primaryText}
                colors={[colors.primary]}
                progressBackgroundColor={colors.card}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: padding, paddingTop: padding }}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}
