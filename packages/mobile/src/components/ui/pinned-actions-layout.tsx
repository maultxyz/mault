import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { PinnedActionsLayoutProps } from "@/lib/interfaces/ui";

export function PinnedActionsLayout({ children, actions }: PinnedActionsLayoutProps) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: SCREEN_GUTTER, gap: SPACING.xl }}
      >
        {children}
      </ScrollView>
      <View
        style={{
          gap: SPACING.sm,
          paddingHorizontal: SCREEN_GUTTER,
          paddingTop: SPACING.md,
          paddingBottom: SPACING.md + insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        {actions}
      </View>
    </View>
  );
}
