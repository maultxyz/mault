import {
  devicesQueryOptions,
  type Device,
} from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import { useQuery } from "@tanstack/react-query";

// A station shows its bound board's device. Before any board has connected,
// it falls back to a device no other station is bound to, so a fresh single-
// sorter setup still sees its calibration without connecting first.
export function useDevice(): Device | undefined {
  const { activeOrg } = useOrg();
  const { data } = useQuery(devicesQueryOptions(activeOrg?.id));
  const { station } = useStation();
  const { stations } = useStations();
  if (!data) return undefined;

  if (station.deviceGuid) {
    const bound = data.find((d) => d.guid === station.deviceGuid);
    if (bound) return bound;
  }
  const taken = new Set(
    stations
      .filter((s) => s.id !== station.id && s.deviceGuid)
      .map((s) => s.deviceGuid),
  );
  return (
    data.find((d) => !taken.has(d.guid)) ??
    (stations.length === 1 ? data[0] : undefined)
  );
}
