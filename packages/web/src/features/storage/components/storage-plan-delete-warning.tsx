import { Callout } from "@/components/callout";
import { useStoragePlanDeleteImpact } from "@/features/storage/api/use-storage-plan-uses";
import type { StoragePlanDeleteWarningProps } from "@/lib/interfaces/storage";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function StoragePlanDeleteWarning({
  locations,
}: StoragePlanDeleteWarningProps) {
  const { t } = useTranslation("storage");
  const locationGuids = useMemo(
    () => locations.map((location) => location.guid),
    [locations],
  );
  const impact = useStoragePlanDeleteImpact(locationGuids);
  if (impact.presetNames.length === 0) return null;
  const inPlan = new Set(impact.locationGuids);
  const locationNames = locations
    .filter((location) => inPlan.has(location.guid))
    .map((location) => location.name);
  return (
    <Callout variant="warning">
      {t("planUses.deleteWarning", {
        count: locationNames.length,
        locations: locationNames.join(", "),
        presets: impact.presetNames.join(", "),
      })}
    </Callout>
  );
}
