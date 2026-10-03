import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useOrg } from "@/features/companies/api/use-organization";
import type { StationState } from "@/lib/interfaces/stations";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function useStationName(station: StationState, index: number): string {
  const { t } = useTranslation("scanner");
  const { activeOrg } = useOrg();
  const { data: devices = [] } = useQuery(devicesQueryOptions(activeOrg?.id));
  return (
    devices.find((d) => d.guid === station.deviceGuid)?.name ??
    t("stations.label", { number: index + 1 })
  );
}
