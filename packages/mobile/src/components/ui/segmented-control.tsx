import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { SegmentedControlProps } from "@/lib/interfaces/ui";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const colors = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        padding: 2,
        borderRadius: RADIUS.lg,
        backgroundColor: colors.muted,
        gap: SPACING.xs,
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: RADIUS.md,
              paddingHorizontal: SPACING.sm,
              backgroundColor: selected ? colors.segmentActive : "transparent",
              shadowColor: "#000",
              shadowOpacity: selected ? 0.06 : 0,
              shadowRadius: 2,
              shadowOffset: { width: 0, height: 1 },
              elevation: selected ? 1 : 0,
            }}
          >
            <AppText weight="medium" tone={selected ? "default" : "secondary"}>
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
