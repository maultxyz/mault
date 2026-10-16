import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { BarListItem, BarListProps } from "@/lib/interfaces/stats";

export function BarList({ items }: BarListProps) {
  const colors = useTheme();
  if (items.length === 0) return null;
  const max = Math.max(...items.map((item) => item.value), 0);

  const renderContent = (item: BarListItem) => (
    <>
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: SPACING.md }}>
        <View style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          {item.swatch ? (
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: RADIUS.full,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: item.swatch,
              }}
            />
          ) : null}
          <AppText numberOfLines={1} style={{ flexShrink: 1 }}>
            {item.label}
          </AppText>
        </View>
        <AppText weight="semibold" style={{ fontVariant: ["tabular-nums"] }}>
          {item.display}
          {item.secondary ? (
            <AppText size="xs" tone="secondary">
              {`  ${item.secondary}`}
            </AppText>
          ) : null}
        </AppText>
      </View>
      <View style={{ height: 6, borderRadius: RADIUS.full, backgroundColor: colors.muted, overflow: "hidden" }}>
        <View
          style={{
            height: "100%",
            width: `${max > 0 ? (item.value / max) * 100 : 0}%` as `${number}%`,
            borderRadius: RADIUS.full,
            backgroundColor: colors.primaryText,
          }}
        />
      </View>
    </>
  );

  return (
    <View style={{ gap: SPACING.xs }}>
      {items.map((item) =>
        item.onPress ? (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            onPress={item.onPress}
            style={({ pressed }) => ({
              gap: 6,
              marginHorizontal: -SPACING.sm,
              paddingHorizontal: SPACING.sm,
              paddingVertical: 6,
              borderRadius: RADIUS.md,
              backgroundColor: pressed ? colors.muted : "transparent",
            })}
          >
            {renderContent(item)}
          </Pressable>
        ) : (
          <View key={item.key} style={{ gap: 6, paddingVertical: 6 }}>
            {renderContent(item)}
          </View>
        ),
      )}
    </View>
  );
}
