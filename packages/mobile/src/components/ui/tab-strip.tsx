import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { COUNT_BADGE_LINE_HEIGHT, COUNT_BADGE_MIN_SIZE } from "@/lib/constants/ui";
import type { TabStripProps } from "@/lib/interfaces/ui";

export function TabStrip<T extends string>({ items, value, onChange, inline = false }: TabStripProps<T>) {
  const colors = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        paddingHorizontal: inline ? 0 : SCREEN_GUTTER - SPACING.sm,
      }}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            hitSlop={{ top: 2, bottom: 2 }}
            onPress={() => onChange(item.value)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 40,
              paddingHorizontal: SPACING.sm,
              marginBottom: -1,
              borderBottomWidth: 2,
              borderBottomColor: active ? colors.primaryText : "transparent",
            }}
          >
            <AppText weight={active ? "semibold" : "medium"} tone={active ? "primary" : "secondary"}>
              {item.label}
            </AppText>
            {item.badge ? (
              <View
                style={{
                  minWidth: COUNT_BADGE_MIN_SIZE,
                  minHeight: COUNT_BADGE_MIN_SIZE,
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  borderRadius: RADIUS.full,
                  backgroundColor: colors.destructiveStrong,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppText size="2xs" weight="semibold" style={{ color: colors.onStatusStrong, lineHeight: COUNT_BADGE_LINE_HEIGHT }}>
                  {item.badge > 99 ? "99+" : String(item.badge)}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
