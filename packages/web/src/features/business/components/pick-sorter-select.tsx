import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
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
import { computeBinCount } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export interface PickSorterSelectProps {
  value: string;
  onChange: (deviceGuid: string) => void;
}

/**
 * Chooses which physical sorter a pick run is built for. The empty value
 * means "no preference": the preset is sized for the org's biggest sorter.
 */
export function PickSorterSelect({ value, onChange }: PickSorterSelectProps) {
  const { t } = useTranslation("business");
  const { activeOrg } = useOrg();
  const { data: devices } = useQuery(devicesQueryOptions(activeOrg?.id));
  const current = useDevice();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || !devices) return;
    setInitialized(true);
    if (value) return;
    if (current) {
      onChange(current.guid);
    } else if (devices.length === 1) {
      onChange(devices[0].guid);
    }
  }, [initialized, devices, current, value, onChange]);

  return (
    <Field className="gap-1.5">
      <FieldLabel htmlFor="pick-sorter-select">
        {t("orders.sorterPick.sorterLabel")}
      </FieldLabel>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="pick-sorter-select">
          <SelectValue>
            {(() => {
              const device = devices?.find(
                (candidate) => candidate.guid === value,
              );
              return device
                ? t("orders.sorterPick.sorterOption", {
                    name: device.name,
                    bins: computeBinCount(device.moduleCount),
                  })
                : t("orders.sorterPick.sorterDefault");
            })()}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {devices?.map((device) => (
            <SelectItem key={device.guid} value={device.guid}>
              {t("orders.sorterPick.sorterOption", {
                name: device.name,
                bins: computeBinCount(device.moduleCount),
              })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldDescription>{t("orders.sorterPick.sorterHint")}</FieldDescription>
    </Field>
  );
}
