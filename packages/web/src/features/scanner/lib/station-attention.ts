import { STATION_ATTENTION_FIXES } from "@/lib/constants/scanner";
import type { StationAttention } from "@/lib/interfaces/stations";

export function stationCanResume(
  isReady: boolean,
  isRunning: boolean,
  attention: StationAttention | null,
): boolean {
  return (
    isReady &&
    !isRunning &&
    (!attention || STATION_ATTENTION_FIXES[attention.kind] === "resume")
  );
}
