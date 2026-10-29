import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { TabStripProps } from "@/lib/interfaces/ui";

export function TabStrip<T extends string>({ items, value, onChange }: TabStripProps<T>) {
  const colors = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        paddingHorizontal: SCREEN_GUTTER - SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <Pressable
            key={item.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(item.value)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              height: 40,
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
                  minWidth: 16,
                  paddingHorizontal: 4,
                  borderRadius: RADIUS.full,
                  backgroundColor: colors.destructiveStrong,
                  alignItems: "center",
                }}
              >
                <AppText size="2xs" weight="semibold" style={{ color: colors.onStatusStrong, lineHeight: 16 }}>
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
