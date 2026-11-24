import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { TextLineSkeleton } from "@/components/ui/text-line-skeleton";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_ART_RADIUS, SPACING } from "@/lib/constants/theme";

export function MatchValidationQueueSkeleton() {
  return (
    <>
      <View style={{ flexDirection: "row", gap: SPACING.md }}>
        {[0, 1].map((column) => (
          <View key={column} style={{ flex: 1, gap: 6 }}>
            <TextLineSkeleton size="xs" width="55%" />
            <View style={{ aspectRatio: CARD_ASPECT_RATIO }}>
              <Skeleton height="100%" radius={CARD_ART_RADIUS} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ gap: SPACING.xs }}>
        <TextLineSkeleton width="60%" />
        <TextLineSkeleton size="sm" width="45%" />
        <TextLineSkeleton size="sm" width="55%" />
      </View>
      <TextLineSkeleton size="xs" width="40%" />
    </>
  );
}
