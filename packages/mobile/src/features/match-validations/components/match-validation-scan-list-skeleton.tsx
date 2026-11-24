import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/surface";
import { TextLineSkeleton } from "@/components/ui/text-line-skeleton";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { MATCH_VALIDATION_SCAN_SKELETON_ROWS, MATCH_VALIDATION_THUMBNAIL_WIDTH } from "@/lib/constants/match-validations";
import { BADGE_RADIUS, CARD_THUMBNAIL_RADIUS, SPACING } from "@/lib/constants/theme";
import { PILL_MIN_HEIGHT } from "@/lib/constants/ui";

export function MatchValidationScanListSkeleton() {
  return (
    <View style={{ gap: SPACING.md }}>
      {Array.from({ length: MATCH_VALIDATION_SCAN_SKELETON_ROWS }).map((_, index) => (
        <Surface key={index} style={{ flexDirection: "row", gap: SPACING.md }}>
          <View style={{ flexDirection: "row", gap: SPACING.xs }}>
            {[0, 1].map((thumbnail) => (
              <Skeleton
                key={thumbnail}
                width={MATCH_VALIDATION_THUMBNAIL_WIDTH}
                height={MATCH_VALIDATION_THUMBNAIL_WIDTH / CARD_ASPECT_RATIO}
                radius={CARD_THUMBNAIL_RADIUS}
              />
            ))}
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: SPACING.xs }}>
            <TextLineSkeleton width="65%" />
            <TextLineSkeleton size="xs" width="45%" />
            <Skeleton width={72} height={PILL_MIN_HEIGHT} radius={BADGE_RADIUS} />
            <TextLineSkeleton size="xs" width="70%" />
          </View>
        </Surface>
      ))}
    </View>
  );
}
