import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { FilterChipProps } from "@/lib/interfaces/collections";

export function FilterChip({ label, selected, swatch, onPress }: FilterChipProps) {
  const colors = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 36,
        paddingHorizontal: SPACING.md + 2,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: selected ? colors.primarySelected : colors.border,
        backgroundColor: selected ? colors.primarySelected : pressed ? colors.muted : colors.background,
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
