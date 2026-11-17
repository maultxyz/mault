import type { Device } from "@/lib/interfaces/calibration";
import type { StationState } from "@/lib/interfaces/stations";

export function findStationDeviceName(
  station: StationState,
  devices: Device[],
): string | undefined {
  return devices.find((device) => device.guid === station.deviceGuid)?.name;
}
