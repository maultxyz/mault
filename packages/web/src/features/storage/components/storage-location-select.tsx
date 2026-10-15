import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import {
  EMPTY_BIN_NEW_LOCATION,
  EMPTY_BIN_NO_LOCATION,
} from "@/lib/constants/storage";
import type { StorageLocationSelectProps } from "@/lib/interfaces/storage";
import { useTranslation } from "react-i18next";

export function StorageLocationSelect({
  value,
  onChange,
  id,
  invalid,
  includeNone = true,
}: StorageLocationSelectProps) {
  const { t } = useTranslation("storage");
  const { locations } = useStorageLocations();

  const optionLabel = (option: string) => {
    if (option === EMPTY_BIN_NEW_LOCATION) return t("emptyDialog.newLocation");
    if (option === EMPTY_BIN_NO_LOCATION) return t("emptyDialog.noLocation");
    return locations.find((l) => l.guid === option)?.name ?? "";
  };

  return (
    <Select
      value={value || null}
      onValueChange={(next) => onChange(next ?? "")}
    >
      <SelectTrigger id={id} className="w-full" aria-invalid={invalid}>
        <SelectValue placeholder={t("emptyDialog.placeholder")}>
          {value ? optionLabel(value) : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {locations.map((location) => (
          <SelectItem key={location.guid} value={location.guid}>
            {location.name}
          </SelectItem>
        ))}
        <SelectItem value={EMPTY_BIN_NEW_LOCATION}>
          {t("emptyDialog.newLocation")}
        </SelectItem>
        {includeNone && (
          <SelectItem value={EMPTY_BIN_NO_LOCATION}>
            {t("emptyDialog.noLocation")}
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
