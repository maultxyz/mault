import { View } from "react-native";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { PICK_WALK_NEXT_CARD_WIDTH } from "@/lib/constants/business";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_ART_RADIUS, CONTROL_RADIUS, FONT_SIZE, RADIUS, SPACING } from "@/lib/constants/theme";
import { BUTTON_HEIGHTS, PROGRESS_BAR_HEIGHT } from "@/lib/constants/ui";

export function PickWalkSkeleton() {
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
        <Skeleton width={96} height={FONT_SIZE.xs} />
        <View style={{ flex: 1 }}>
          <Skeleton height={PROGRESS_BAR_HEIGHT} radius={RADIUS.full} />
        </View>
      </View>
      <Surface>
        <View style={{ gap: SPACING.md }}>
          <View style={{ flexDirection: "row", gap: SPACING.md }}>
            <Skeleton
              width={PICK_WALK_NEXT_CARD_WIDTH}
              height={PICK_WALK_NEXT_CARD_WIDTH / CARD_ASPECT_RATIO}
              radius={CARD_ART_RADIUS}
            />
            <View style={{ flex: 1, gap: SPACING.sm }}>
              <Skeleton width="40%" height={FONT_SIZE.xs} />
              <Skeleton width="80%" height={FONT_SIZE["2xl"]} />
              <Skeleton width="50%" height={FONT_SIZE.xl} />
              <Skeleton width="70%" height={FONT_SIZE.base} />
              <Skeleton width="60%" height={FONT_SIZE.xs} />
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: SPACING.sm }}>
            <View style={{ flex: 1 }}>
              <Skeleton height={BUTTON_HEIGHTS.md} radius={CONTROL_RADIUS} />
            </View>
            <View style={{ flex: 1 }}>
              <Skeleton height={BUTTON_HEIGHTS.md} radius={CONTROL_RADIUS} />
            </View>
          </View>
        </View>
      </Surface>
      <View style={{ gap: SPACING.xs }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
          <Skeleton width={18} height={18} radius={RADIUS.full} />
          <View style={{ flex: 1 }}>
            <Skeleton width="50%" height={FONT_SIZE.base} />
          </View>
          <Skeleton width={40} height={FONT_SIZE.xs} />
        </View>
        <ListSkeleton rows={3} leading="thumbnail" hasSubtitle />
      </View>
    </>
  );
}
