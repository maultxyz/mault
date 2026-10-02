import type { FirmwareFeature } from "../interfaces/firmware.interface";

export function isFirmwareVersionOutdated(
  version: string | null | undefined,
  latestVersion: string,
): boolean {
  if (!version) return false;
  const current = version.split(".").map((n) => parseInt(n, 10) || 0);
  const latest = latestVersion.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(current.length, latest.length); i++) {
    const c = current[i] ?? 0;
    const l = latest[i] ?? 0;
    if (c < l) return true;
    if (c > l) return false;
  }
  return false;
}

export const FIRMWARE_FEATURE_MIN_VERSIONS: Record<FirmwareFeature, string> = {
  pipelinedFeed: "2.1.0",
  feederRollback: "2.4.0",
};

export function isFirmwareFeatureSupported(
  version: string | null | undefined,
  feature: FirmwareFeature,
): boolean {
  return (
    !!version &&
    !isFirmwareVersionOutdated(version, FIRMWARE_FEATURE_MIN_VERSIONS[feature])
  );
}
