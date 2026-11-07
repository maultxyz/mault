import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { StatGroupProps } from "@/lib/interfaces/ui";

export function StatGroup({ heading, children }: StatGroupProps) {
  const colors = useTheme();
  return (
    <View
      style={{
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        overflow: "hidden",
      }}
    >
      {heading ? (
        <View style={{ paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          <AppText size="xs" weight="medium" tone="secondary" accessibilityRole="header">
            {heading}
          </AppText>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginRight: -1, marginBottom: -1 }}>{children}</View>
    </View>
  );
}
