import {
  MACHINE_ID_UNSAFE_CHARACTERS,
  STATION_MACHINE_ID_PREFIX,
} from "@/lib/constants/machines";
import type { StationState } from "@/lib/interfaces/stations";

export function stationMachineId(station: StationState): string {
  const rawId = station.deviceGuid ?? `${STATION_MACHINE_ID_PREFIX}${station.id}`;
  return rawId.replace(MACHINE_ID_UNSAFE_CHARACTERS, "").slice(0, 80);
}
