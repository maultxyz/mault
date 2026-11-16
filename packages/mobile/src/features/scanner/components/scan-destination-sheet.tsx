import { useTranslation } from "react-i18next";
import { OptionSheet } from "@/components/ui/option-sheet";
import { NO_STORAGE_LOCATION_OPTION, SORT_DESTINATION_OPTION } from "@/lib/constants/scanner";
import type { ScanDestinationSheetProps } from "@/lib/interfaces/scanner";

export function ScanDestinationSheet({
  visible,
  scanDestination,
  offersSortWithRules,
  onClose,
}: ScanDestinationSheetProps) {
  const { t } = useTranslation();
  const descriptionKeyPrefix = offersSortWithRules ? "scan.destination.description" : "scan.destination.batchDescription";
  const description = !scanDestination.canStore
    ? t(`${descriptionKeyPrefix}Locked`)
    : scanDestination.storageLocations.length === 0
      ? t(`${descriptionKeyPrefix}NoLocations`)
      : t(descriptionKeyPrefix);
  const selectedOption =
    scanDestination.destination.kind === "sort"
      ? offersSortWithRules
        ? SORT_DESTINATION_OPTION
        : NO_STORAGE_LOCATION_OPTION
      : (scanDestination.destination.storageLocationGuid ?? NO_STORAGE_LOCATION_OPTION);
  const chooseDestination = (value: string) => {
    onClose();
    if (value === SORT_DESTINATION_OPTION) scanDestination.setDestination({ kind: "sort" });
    else
      scanDestination.setDestination({
        kind: "storage",
        storageLocationGuid: value === NO_STORAGE_LOCATION_OPTION ? null : value,
      });
  };
  return (
    <OptionSheet
      visible={visible}
      title={t("scan.destination.title")}
      description={description}
      options={[
        ...scanDestination.storageLocations.map((location) => ({ value: location.guid, label: location.name })),
        {
          value: NO_STORAGE_LOCATION_OPTION,
          label: t("scan.destination.noLocation"),
          description: t(
            offersSortWithRules ? "scan.destination.noLocationDescription" : "scan.destination.batchNoLocationDescription",
          ),
        },
        ...(offersSortWithRules
          ? [
              {
                value: SORT_DESTINATION_OPTION,
                label: t("scan.destination.sort"),
                description: t("scan.destination.sortDescription"),
              },
            ]
          : []),
      ]}
      selected={[selectedOption]}
      onSelect={chooseDestination}
      onClose={onClose}
    />
  );
}
