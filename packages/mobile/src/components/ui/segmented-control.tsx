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
        padding: 4,
        borderRadius: RADIUS.full,
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
              height: 36,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: RADIUS.full,
              paddingHorizontal: SPACING.sm,
              backgroundColor: selected ? colors.foreground : "transparent",
            }}
          >
            <AppText
              weight="semibold"
              numberOfLines={1}
              style={{ color: selected ? colors.background : colors.foregroundSecondary }}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
