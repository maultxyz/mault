import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { FONT_SIZE, SPACING } from "@/lib/constants/theme";
import { SECTION_SKELETON_HEADER_MIN_HEIGHT } from "@/lib/constants/ui";
import type { SectionSkeletonProps } from "@/lib/interfaces/ui";

export function SectionSkeleton({ hasDescription = false, titleWidth = 140, children }: SectionSkeletonProps) {
  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={{ gap: 2 }}>
        <View style={{ minHeight: SECTION_SKELETON_HEADER_MIN_HEIGHT, justifyContent: "center" }}>
          <Skeleton width={titleWidth} height={FONT_SIZE.lg} />
        </View>
        {hasDescription ? <Skeleton width="80%" height={FONT_SIZE.xs} /> : null}
      </View>
      {children}
    </View>
  );
}
