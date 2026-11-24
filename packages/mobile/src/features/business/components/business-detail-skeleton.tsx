import { View } from "react-native";
import { SectionSkeleton } from "@/components/ui/section-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTileSkeleton } from "@/components/ui/stat-tile-skeleton";
import { BADGE_RADIUS, SPACING } from "@/lib/constants/theme";
import { PILL_MIN_HEIGHT } from "@/lib/constants/ui";
import type { BusinessDetailSkeletonProps } from "@/lib/interfaces/business";

export function BusinessDetailSkeleton({ pillCount, statTileCount, hasStatHeading = false, children }: BusinessDetailSkeletonProps) {
  const statTiles = (
    <StatGroup>
      {Array.from({ length: statTileCount }).map((_, index) => (
        <StatTileSkeleton key={index} />
      ))}
    </StatGroup>
  );
  return (
    <>
      <View style={{ flexDirection: "row", gap: SPACING.sm }}>
        {Array.from({ length: pillCount }).map((_, index) => (
          <Skeleton key={index} width={72} height={PILL_MIN_HEIGHT + 2} radius={BADGE_RADIUS} />
        ))}
      </View>
      {hasStatHeading ? <SectionSkeleton>{statTiles}</SectionSkeleton> : statTiles}
      {children}
    </>
  );
}
