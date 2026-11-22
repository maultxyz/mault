import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { devicesQueryOptions } from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import { useStation, useStations } from "@/features/scanner/api/use-stations";
import type { CalibrationSorterSelectProps } from "@/lib/interfaces/calibration";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function CalibrationSorterSelect({
  isDisabled,
}: CalibrationSorterSelectProps) {
  const { t } = useTranslation("calibration");
  const { activeOrg } = useOrg();
  const { data: devices = [] } = useQuery(devicesQueryOptions(activeOrg?.id));
  const device = useDevice();
  const { station } = useStation();
  const { bindStationDevice, isDeviceConnected } = useStations();
  const selectableDevices = devices.filter(
    (candidate) => !isDeviceConnected(candidate.guid),
  );

  if (selectableDevices.length < 2) return null;

  return (
    <Select
      value={device?.guid ?? null}
      disabled={isDisabled}
      onValueChange={(deviceGuid) => {
        if (deviceGuid) bindStationDevice(station.id, deviceGuid);
      }}
    >
      <SelectTrigger
        className="w-48"
        aria-label={t("calibratePage.sorterSelectLabel")}
      >
        <SelectValue placeholder={t("calibratePage.sorterSelectLabel")}>
          {device?.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {selectableDevices.map((candidate) => (
          <SelectItem key={candidate.guid} value={candidate.guid}>
            {candidate.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
