import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { CONTROL_RADIUS, RADIUS, SPACING } from "@/lib/constants/theme";
import { CHIP_MIN_HEIGHT, MIN_TOUCH_TARGET } from "@/lib/constants/ui";
import type { FilterChipProps } from "@/lib/interfaces/collections";

export function FilterChip({ label, selected, selectionRole = "checkbox", swatch, onPress }: FilterChipProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole={selectionRole}
      accessibilityState={{ checked: selected }}
      hitSlop={{ top: (MIN_TOUCH_TARGET - CHIP_MIN_HEIGHT) / 2, bottom: (MIN_TOUCH_TARGET - CHIP_MIN_HEIGHT) / 2 }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: CHIP_MIN_HEIGHT,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md + 2,
        borderRadius: CONTROL_RADIUS,
        backgroundColor: selected ? colors.primarySelected : pressed ? colors.tonalPressed : colors.tonal,
      })}
    >
      {swatch ? (
        <View
          style={{ width: 10, height: 10, borderRadius: RADIUS.full, borderWidth: 1, borderColor: colors.border, backgroundColor: swatch }}
        />
      ) : null}
      <AppText size="sm" weight="semibold" style={{ color: selected ? colors.primaryText : colors.foreground }}>
        {label}
      </AppText>
    </Pressable>
  );
}
