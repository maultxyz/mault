import { View } from "react-native";
import { Skeleton } from "@/components/ui/skeleton";
import { FONT_SIZE } from "@/lib/constants/theme";
import type { TextLineSkeletonProps } from "@/lib/interfaces/ui";

export function TextLineSkeleton({ size = "base", heading = false, width }: TextLineSkeletonProps) {
  const fontSize = FONT_SIZE[size];
  return (
    <View style={{ height: Math.round(fontSize * (heading ? 1.2 : 1.45)), justifyContent: "center" }}>
      <Skeleton width={width} height={fontSize} />
    </View>
  );
}
