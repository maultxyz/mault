import { SIGNAL_STRENGTH_GOOD_MIN_RSSI, SIGNAL_STRENGTH_STRONG_MIN_RSSI } from "@/lib/constants/sorter";
import type { SignalStrength } from "@/lib/interfaces/sorter";

export function signalStrengthOf(rssi: number): SignalStrength {
  if (rssi >= SIGNAL_STRENGTH_STRONG_MIN_RSSI) return "strong";
  if (rssi >= SIGNAL_STRENGTH_GOOD_MIN_RSSI) return "good";
  return "weak";
}
