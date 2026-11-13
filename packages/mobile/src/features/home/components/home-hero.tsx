import { useId, useState } from "react";
import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/hooks/use-theme";
import {
  HOME_HERO_CHIP_BACKGROUND,
  HOME_HERO_DIVIDER_COLOR,
  HOME_HERO_SPARKLINE,
  HOME_HERO_SECONDARY_TEXT_COLOR,
} from "@/lib/constants/home";
import { sparklinePaths } from "@/features/home/lib/sparkline";
import { RADIUS, SPACING } from "@/lib/constants/theme";
import type { HomeHeroProps } from "@/lib/interfaces/home";

export function HomeHero({ label, value, change, changeCaption, stats, sparklineValues }: HomeHeroProps) {
  const gradientId = useId();
  const sparklineFillId = useId();
  const colors = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const heroTextColor = colors.primaryForeground;
  const sparkline = sparklinePaths(
    sparklineValues,
    size.width,
    size.height * HOME_HERO_SPARKLINE.heightRatio,
    size.height * HOME_HERO_SPARKLINE.topRatio,
  );
  const changeIcon = change?.direction === "up" ? "arrowUp" : change?.direction === "down" ? "arrowDown" : null;
  const changeText = change ? `${change.change} · ${change.percent}` : null;
  const accessibilityLabel = [
    `${label}: ${value}`,
    changeText ? `${changeText} ${changeCaption}` : null,
    ...stats.map((stat) => `${stat.label}: ${stat.value}`),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width !== size.width || height !== size.height) setSize({ width, height });
      }}
      style={{ borderRadius: RADIUS.xl, overflow: "hidden", padding: SPACING.xl, gap: SPACING.lg, backgroundColor: colors.primary }}
    >
      <Svg
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0 }}
        width={size.width}
        height={size.height}
      >
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primary} />
            <Stop offset="1" stopColor={colors.primaryPressed} />
          </LinearGradient>
          <LinearGradient id={sparklineFillId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={HOME_HERO_SPARKLINE.color} stopOpacity={HOME_HERO_SPARKLINE.fillOpacity} />
            <Stop offset="1" stopColor={HOME_HERO_SPARKLINE.color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={size.width} height={size.height} fill={`url(#${gradientId})`} />
        {sparkline ? (
          <>
            <Path d={sparkline.area} fill={`url(#${sparklineFillId})`} />
            <Path
              d={sparkline.line}
              fill="none"
              stroke={HOME_HERO_SPARKLINE.color}
              strokeOpacity={HOME_HERO_SPARKLINE.strokeOpacity}
              strokeWidth={HOME_HERO_SPARKLINE.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        ) : null}
      </Svg>

      <View style={{ gap: SPACING.xs }}>
        <AppText size="sm" weight="medium" style={{ color: HOME_HERO_SECONDARY_TEXT_COLOR }}>
          {label}
        </AppText>
        <AppText
          size="display"
          heading
          weight="bold"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ color: heroTextColor, fontVariant: ["tabular-nums"] }}
        >
          {value}
        </AppText>
        {changeText ? (
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: SPACING.xs,
              paddingHorizontal: SPACING.sm + 2,
              paddingVertical: SPACING.xs,
              borderRadius: RADIUS.full,
              backgroundColor: HOME_HERO_CHIP_BACKGROUND,
            }}
          >
            {changeIcon ? <Icon name={changeIcon} size={14} color={heroTextColor} /> : null}
            <AppText size="xs" weight="semibold" style={{ color: heroTextColor, fontVariant: ["tabular-nums"] }}>
              {changeText}
            </AppText>
            <AppText size="xs" style={{ color: HOME_HERO_SECONDARY_TEXT_COLOR }}>
              {changeCaption}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row" }}>
        {stats.map((stat, index) => (
          <View
            key={stat.label}
            style={{
              flex: 1,
              minWidth: 0,
              gap: 2,
              paddingLeft: index === 0 ? 0 : SPACING.md,
              borderLeftWidth: index === 0 ? 0 : 1,
              borderLeftColor: HOME_HERO_DIVIDER_COLOR,
            }}
          >
            <AppText
              size="xl"
              heading
              weight="bold"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ color: heroTextColor, fontVariant: ["tabular-nums"] }}
            >
              {stat.value}
            </AppText>
            <AppText size="2xs" numberOfLines={1} style={{ color: HOME_HERO_SECONDARY_TEXT_COLOR }}>
              {stat.label}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
