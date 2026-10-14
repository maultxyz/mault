import { SERVOS } from "@/lib/constants/calibration";
import { SORTER_FEEDER_HOTSPOT_KEY } from "@/lib/constants/sorter-model";
import type { SorterHotspot } from "@/lib/interfaces/sorter-model";

export function sorterHotspots(modules: number[]): SorterHotspot[] {
  const servoHotspots = modules.flatMap((module) =>
    SERVOS.map(
      ({ name: servo }): SorterHotspot => ({
        kind: "servo",
        key: `${module}:${servo}`,
        module,
        servo,
      }),
    ),
  );
  return [{ kind: "feeder", key: SORTER_FEEDER_HOTSPOT_KEY }, ...servoHotspots];
}
