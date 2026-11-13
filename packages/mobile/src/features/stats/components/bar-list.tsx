import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { BarListItem, BarListProps } from "@/lib/interfaces/stats";

export function BarList({ items, collapsedCount }: BarListProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  if (items.length === 0) return null;
  const canCollapse = collapsedCount != null && items.length > collapsedCount;
  const visibleItems = canCollapse && !isExpanded ? items.slice(0, collapsedCount) : items;
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
      <View style={{ height: 8, borderRadius: RADIUS.full, backgroundColor: colors.muted, overflow: "hidden" }}>
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
      {visibleItems.map((item) =>
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
      {canCollapse ? (
        <Button
          variant="ghost"
          size="sm"
          icon={isExpanded ? "collapse" : "expand"}
          label={isExpanded ? t("stats.showLess") : t("stats.showAll", { count: items.length })}
          onPress={() => setIsExpanded((value) => !value)}
          style={{ alignSelf: "flex-start" }}
        />
      ) : null}
    </View>
  );
}
