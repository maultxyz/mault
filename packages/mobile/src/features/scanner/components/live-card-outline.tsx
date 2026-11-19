import { memo } from "react";
import { useLiveCorners } from "@/features/scanner/api/use-live-corners";
import { DetectedOutline } from "@/features/scanner/components/detected-outline";
import type { LiveCardOutlineProps } from "@/lib/interfaces/scanner";

export const LiveCardOutline = memo(function LiveCardOutline({
  grabLiveFrame,
  isActive,
  isPaused,
  color,
  onDetection,
  onLiveFrame,
}: LiveCardOutlineProps) {
  const liveCorners = useLiveCorners(grabLiveFrame, isActive, isPaused, onDetection, onLiveFrame);
  return <DetectedOutline corners={liveCorners} color={color} />;
});
