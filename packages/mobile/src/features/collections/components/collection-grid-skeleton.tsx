import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { CARD_ASPECT_RATIO, CARD_GRID_GAP_X, CARD_GRID_GAP_Y } from "@/lib/constants/collections";
import {
  COLLECTION_GRID_SKELETON_CAPTION_LINE_HEIGHT,
  COLLECTION_GRID_SKELETON_TILE_COUNT,
} from "@/lib/constants/navigation-memory";
import { CARD_ART_RADIUS, FONT_SIZE } from "@/lib/constants/theme";
import type { CollectionGridSkeletonProps } from "@/lib/interfaces/navigation-memory";

export function CollectionGridSkeleton({ tileWidth }: CollectionGridSkeletonProps) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: CARD_GRID_GAP_X, rowGap: CARD_GRID_GAP_Y }}>
      {Array.from({ length: COLLECTION_GRID_SKELETON_TILE_COUNT }).map((_, index) => (
        <View key={index} style={{ width: tileWidth, gap: 6 }}>
          <View
            style={{
              width: "100%",
              aspectRatio: CARD_ASPECT_RATIO,
              borderRadius: CARD_ART_RADIUS,
              overflow: "hidden",
            }}
          >
            <Skeleton height="100%" radius={0} />
          </View>
          <View style={{ paddingHorizontal: 2 }}>
            <View style={{ height: COLLECTION_GRID_SKELETON_CAPTION_LINE_HEIGHT, justifyContent: "center" }}>
              <Skeleton width="80%" height={FONT_SIZE.xs} />
            </View>
            <View style={{ height: COLLECTION_GRID_SKELETON_CAPTION_LINE_HEIGHT, justifyContent: "center" }}>
              <Skeleton width="50%" height={FONT_SIZE.xs} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
