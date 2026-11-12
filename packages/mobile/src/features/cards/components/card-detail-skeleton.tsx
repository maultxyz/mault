import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { SectionHeader } from "@/components/ui/section-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/hooks/use-theme";
import {
  CARD_DETAIL_SKELETON_DETAIL_ROWS,
  CARD_DETAIL_SKELETON_PILL_WIDTHS,
  CARD_DETAIL_SKELETON_PRICE_ROWS,
} from "@/lib/constants/cards";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { BADGE_RADIUS, CARD_ART_RADIUS, CONTROL_RADIUS, FONT_SIZE, SPACING } from "@/lib/constants/theme";
import { INPUT_HEIGHT, PILL_MIN_HEIGHT } from "@/lib/constants/ui";
import type { CardDetailSkeletonProps, SkeletonTextLineProps } from "@/lib/interfaces/cards";

function SkeletonTextLine({ fontSize, lineHeight, width }: SkeletonTextLineProps) {
  return (
    <View style={{ height: lineHeight, justifyContent: "center" }}>
      <Skeleton width={width} height={fontSize} />
    </View>
  );
}

export function PricePaidFieldSkeleton() {
  return (
    <View style={{ gap: SPACING.xs + 2 }}>
      <SkeletonTextLine fontSize={FONT_SIZE.xs} lineHeight={Math.round(FONT_SIZE.xs * 1.45)} width="40%" />
      <Skeleton height={INPUT_HEIGHT} radius={CONTROL_RADIUS} />
    </View>
  );
}

export function CardDetailSkeleton({ showsCapturedScan }: CardDetailSkeletonProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const imageFrame = (
    <View style={{ flex: 1, gap: 6 }}>
      {showsCapturedScan ? <SkeletonTextLine fontSize={FONT_SIZE.xs} lineHeight={Math.round(FONT_SIZE.xs * 1.45)} width="50%" /> : null}
      <View
        style={{
          aspectRatio: CARD_ASPECT_RATIO,
          borderRadius: CARD_ART_RADIUS,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Skeleton height="100%" radius={0} />
      </View>
    </View>
  );
  return (
    <>
      <View style={{ gap: SPACING.xs }}>
        <SkeletonTextLine fontSize={FONT_SIZE.xl} lineHeight={Math.round(FONT_SIZE.xl * 1.2)} width="70%" />
        <SkeletonTextLine fontSize={FONT_SIZE.sm} lineHeight={Math.round(FONT_SIZE.sm * 1.45)} width="50%" />
        <SkeletonTextLine fontSize={FONT_SIZE.lg} lineHeight={Math.round(FONT_SIZE.lg * 1.2)} width="30%" />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {CARD_DETAIL_SKELETON_PILL_WIDTHS.map((width, index) => (
          <Skeleton key={index} width={width} height={PILL_MIN_HEIGHT + 2} radius={BADGE_RADIUS} />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: SPACING.md, alignItems: "flex-start" }}>
        {showsCapturedScan ? imageFrame : null}
        {imageFrame}
      </View>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("cardDetail.details")} />
        <View style={{ gap: 6 }}>
          {Array.from({ length: CARD_DETAIL_SKELETON_DETAIL_ROWS }).map((_, index) => (
            <SkeletonTextLine
              key={index}
              fontSize={FONT_SIZE.sm}
              lineHeight={Math.round(FONT_SIZE.sm * 1.45)}
              width={index % 2 === 0 ? "75%" : "60%"}
            />
          ))}
        </View>
      </View>
      <View style={{ gap: SPACING.sm }}>
        <SectionHeader title={t("cardDetail.prices")} />
        {Array.from({ length: CARD_DETAIL_SKELETON_PRICE_ROWS }).map((_, index) => (
          <View
            key={index}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingVertical: SPACING.sm + 2,
              borderTopWidth: index > 0 ? 1 : 0,
              borderTopColor: colors.border,
            }}
          >
            <SkeletonTextLine fontSize={FONT_SIZE.sm} lineHeight={Math.round(FONT_SIZE.sm * 1.45)} width={96} />
            <SkeletonTextLine fontSize={FONT_SIZE.lg} lineHeight={Math.round(FONT_SIZE.lg * 1.2)} width={72} />
          </View>
        ))}
      </View>
    </>
  );
}
