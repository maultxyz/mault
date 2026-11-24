import { View } from "react-native";
import { TextLineSkeleton } from "@/components/ui/text-line-skeleton";
import type { SectionHeaderSkeletonProps } from "@/lib/interfaces/ui";

export function SectionHeaderSkeleton({ width = 120 }: SectionHeaderSkeletonProps) {
  return (
    <View style={{ minHeight: 28, justifyContent: "center" }}>
      <TextLineSkeleton size="lg" heading width={width} />
    </View>
  );
}
