import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { REVIEW_GRID_SKELETON_ATTRIBUTE_FIELD_COUNT, SCAN_ATTRIBUTE_FIELD_WIDTH } from "@/lib/constants/cards";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_ART_RADIUS, CONTROL_RADIUS, FONT_SIZE, SPACING } from "@/lib/constants/theme";
import { BUTTON_HEIGHTS, INPUT_HEIGHT } from "@/lib/constants/ui";

export function ReviewGridTileSkeleton() {
  const imageColumn = (
    <View style={{ flex: 1, gap: SPACING.xs }}>
      <Skeleton width="50%" height={FONT_SIZE["2xs"]} />
      <View style={{ aspectRatio: CARD_ASPECT_RATIO, borderRadius: CARD_ART_RADIUS, overflow: "hidden" }}>
        <Skeleton height="100%" radius={0} />
      </View>
    </View>
  );
  return (
    <Surface padded={false} style={{ padding: SPACING.md, gap: SPACING.md }}>
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        {imageColumn}
        {imageColumn}
      </View>
      <View style={{ gap: SPACING.xs }}>
        <Skeleton width="70%" height={FONT_SIZE.base} />
        <Skeleton width="50%" height={FONT_SIZE.xs} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
        {Array.from({ length: REVIEW_GRID_SKELETON_ATTRIBUTE_FIELD_COUNT }).map((_, index) => (
          <View key={index} style={{ width: SCAN_ATTRIBUTE_FIELD_WIDTH, flexGrow: 1, gap: SPACING.xs + 2 }}>
            <Skeleton width={64} height={FONT_SIZE.xs} />
            <Skeleton height={INPUT_HEIGHT} radius={CONTROL_RADIUS} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        <View style={{ flex: 1 }}>
          <Skeleton height={BUTTON_HEIGHTS.md} radius={CONTROL_RADIUS} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton height={BUTTON_HEIGHTS.md} radius={CONTROL_RADIUS} />
        </View>
      </View>
    </Surface>
  );
}
