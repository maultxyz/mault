import { useSerial } from "@/features/scanner/api/use-serial";
import type { FirmwareFeatureStatus } from "@/lib/interfaces/firmware";
import {
  FIRMWARE_FEATURE_MIN_VERSIONS,
  isFirmwareFeatureSupported,
  type FirmwareFeature,
} from "@magic-vault/shared";

export function useFirmwareFeature(
  feature: FirmwareFeature,
): FirmwareFeatureStatus {
  const { isConnected, firmwareVersion } = useSerial();
  return {
    isLocked:
      isConnected && !isFirmwareFeatureSupported(firmwareVersion, feature),
    minVersion: FIRMWARE_FEATURE_MIN_VERSIONS[feature],
  };
}
