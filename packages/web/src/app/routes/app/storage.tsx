import { Callout } from "@/components/callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { StorageUpgradeNote } from "@/features/storage/components/storage-upgrade-note";
import { StorageLocationCards } from "@/features/storage/components/storage-location-cards";
import { StorageLocationList } from "@/features/storage/components/storage-location-list";
import { StorageLocationNameDialog } from "@/features/storage/components/storage-location-name-dialog";
import { StorageSearchResults } from "@/features/storage/components/storage-search-results";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePriceSource } from "@/hooks/use-price-source";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { IconBox, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export default function StoragePage() {
  const { t } = useTranslation("storage");
  const { locations, isLoading, isMutating, create, rename, remove } =
    useStorageLocations();
  const { format } = usePriceSource();
  const { isLocked } = useStorageAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(
    searchQuery.trim(),
    SEARCH_DEBOUNCE_MS,
  );
  const isSearching = searchQuery.trim().length > 0;

  const selectedGuid = searchParams.get("location") ?? locations[0]?.guid;
  const selected = locations.find((l) => l.guid === selectedGuid);

  const select = (guid: string) =>
    setSearchParams({ location: guid }, { replace: true });

  const openLocation = (guid: string) => {
    setSearchQuery("");
    select(guid);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <div className="grid flex-1 min-h-0 grid-cols-12 overflow-hidden">
        <section className="col-span-4 flex h-full flex-col gap-2 overflow-hidden border-r bg-sidebar/70 p-2 lg:col-span-3">
          {!isLocked && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCreateOpen(true)}
              disabled={isMutating}
            >
              <IconPlus />
              {t("page.newLocation")}
            </Button>
          )}
          {!isLoading && locations.length > 0 && (
            <Input
              type="search"
              placeholder={t("search.placeholder")}
              aria-label={t("search.placeholder")}
              data-hotkey-search
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          )}
          <StorageLocationList
            locations={locations}
            selectedGuid={isSearching ? undefined : selected?.guid}
            isLoading={isLoading}
            onSelect={openLocation}
          />
        </section>

        <section className="relative col-span-8 flex max-h-full flex-col gap-4 overflow-y-auto p-4 pt-14 lg:col-span-9">
          {selected && !isSearching && (
            <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label={t("page.rename")}
                title={t("page.rename")}
                disabled={isMutating}
                onClick={() => setRenameOpen(true)}
              >
                <IconEdit />
              </Button>
              <Button
                variant="outline-destructive"
                size="icon"
                aria-label={t("page.delete")}
                title={t("page.delete")}
                disabled={isMutating}
                onClick={() => setDeleteOpen(true)}
              >
                <IconTrash />
              </Button>
            </div>
          )}

          {isLocked && (
            <Callout variant="info" className="shrink-0">
              {t(
                locations.length > 0
                  ? "upgrade.lockedWithLocations"
                  : "upgrade.locked",
              )}{" "}
              <StorageUpgradeNote />
            </Callout>
          )}

          {isLoading ? (
            <ListSkeleton />
          ) : locations.length === 0 ? (
            <EmptyState
              icon={IconBox}
              title={t("page.emptyTitle")}
              description={t("page.emptyDescription")}
            />
          ) : isSearching ? (
            debouncedQuery ? (
              <StorageSearchResults
                query={debouncedQuery}
                onOpenLocation={openLocation}
              />
            ) : (
              <ListSkeleton />
            )
          ) : (
            selected && (
              <>
                <div className="min-w-0">
                  <h1 className="truncate font-heading text-lg font-semibold">
                    {selected.name}
                  </h1>
                  <p className="text-xs tabular-nums text-foreground/70">
                    {t("page.summary", {
                      count: selected.cardCount,
                      value: format(selected.totalValue),
                    })}
                  </p>
                </div>
                <StorageLocationCards location={selected} />
              </>
            )
          )}
        </section>
      </div>

      <StorageLocationNameDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t("page.newLocation")}
        submitLabel={t("nameDialog.create")}
        onSubmit={async (name) => {
          const guid = await create(name);
          if (guid) select(guid);
          return !!guid;
        }}
      />
      <StorageLocationNameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        initialName={selected?.name}
        title={t("page.rename")}
        submitLabel={t("nameDialog.save")}
        onSubmit={(name) =>
          selected ? rename(selected.guid, name) : Promise.resolve(false)
        }
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("page.deleteTitle", { name: selected?.name ?? "" })}
        description={t("page.deleteDescription")}
        confirm={{ type: "name", name: selected?.name ?? "" }}
        onConfirm={async () => {
          setDeleteOpen(false);
          if (selected && (await remove(selected.guid))) {
            setSearchParams({}, { replace: true });
          }
        }}
      />
    </div>
  );
}
