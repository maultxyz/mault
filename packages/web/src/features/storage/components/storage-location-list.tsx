import { Skeleton } from "@/components/ui/skeleton";
import { StorageLocationRow } from "@/features/storage/components/storage-location-row";
import { STORAGE_LIST_SKELETON_COUNT } from "@/lib/constants/storage";
import type { StorageLocationListProps } from "@/lib/interfaces/storage";

export function StorageLocationList({
  locations,
  selectedGuid,
  isLoading,
  onSelect,
}: StorageLocationListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col overflow-hidden rounded-lg border">
        {Array.from({ length: STORAGE_LIST_SKELETON_COUNT }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-13 rounded-none border-b last:border-b-0"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
      {locations.map((location) => (
        <StorageLocationRow
          key={location.guid}
          location={location}
          isSelected={location.guid === selectedGuid}
          onSelect={() => onSelect(location.guid)}
        />
      ))}
    </div>
  );
}
