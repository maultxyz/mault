import { ListPagination } from "@/components/list-pagination";
import { SidebarListSkeleton } from "@/components/sidebar-list-skeleton";
import { StorageLocationRow } from "@/features/storage/components/storage-location-row";
import { useStoragePlanCounts } from "@/features/storage/api/use-storage-plan-uses";
import { STORAGE_LIST_SKELETON_COUNT } from "@/lib/constants/storage";
import type { StorageLocationListProps } from "@/lib/interfaces/storage";

export function StorageLocationList({
  locations,
  pagination,
  selectedGuid,
  isLoading,
  onSelect,
  actions,
  checkedGuids,
  onToggleChecked,
}: StorageLocationListProps) {
  const planCounts = useStoragePlanCounts();
  if (isLoading) {
    return <SidebarListSkeleton rows={STORAGE_LIST_SKELETON_COUNT} />;
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {locations.map((location) => (
          <StorageLocationRow
            key={location.guid}
            location={location}
            isSelected={location.guid === selectedGuid}
            onSelect={() => onSelect(location.guid)}
            actions={actions}
            isChecked={checkedGuids?.has(location.guid) ?? false}
            planCount={planCounts.get(location.guid) ?? 0}
            onToggleChecked={
              onToggleChecked
                ? (shiftKey) => onToggleChecked(location.guid, shiftKey)
                : undefined
            }
          />
        ))}
      </div>
      <ListPagination pagination={pagination} compact />
    </>
  );
}
