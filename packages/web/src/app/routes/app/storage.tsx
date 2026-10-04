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
import { StorageLocationNameDialog } from "@/features/storage/components/storage-location-name-dialog";
import { StorageSearchResults } from "@/features/storage/components/storage-search-results";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePriceSource } from "@/hooks/use-price-source";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { cn } from "@/lib/utils";
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
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 min-h-0 flex-col gap-4 p-4 md:p-6">
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-semibold">
              {t("page.title")}
            </h1>
            <p className="text-xs text-foreground/70">{t("page.subtitle")}</p>
          </div>
          {!isLocked && (
            <Button onClick={() => setCreateOpen(true)} disabled={isMutating}>
              <IconPlus />
              {t("page.newLocation")}
            </Button>
          )}
        </div>

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

        {!isLoading && locations.length > 0 && (
          <Input
            type="search"
            className="shrink-0"
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            data-hotkey-search
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
          <div className="min-h-0 flex-1 overflow-y-auto">
            {debouncedQuery ? (
              <StorageSearchResults
                query={debouncedQuery}
                onOpenLocation={openLocation}
              />
            ) : (
              <ListSkeleton />
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto md:grid md:grid-cols-[16rem_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)] md:overflow-hidden">
            <ul className="shrink-0 divide-y self-start rounded-lg border md:max-h-full md:overflow-y-auto">
              {locations.map((location) => (
                <li key={location.guid}>
                  <button
                    type="button"
                    onClick={() => select(location.guid)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      location.guid === selected?.guid && "bg-muted",
                    )}
                  >
                    <span className="truncate font-medium">
                      {location.name}
                    </span>
                    <span className="flex shrink-0 flex-col items-end text-xs tabular-nums text-foreground/70">
                      <span>
                        {t("page.cardCount", { count: location.cardCount })}
                      </span>
                      <span>{format(location.totalValue)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {selected && (
              <section className="flex min-w-0 flex-col gap-3 md:h-full md:overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-background pb-1">
                  <div className="min-w-0">
                    <h2 className="truncate font-heading text-base font-semibold">
                      {selected.name}
                    </h2>
                    <p className="text-xs tabular-nums text-foreground/70">
                      {t("page.summary", {
                        count: selected.cardCount,
                        value: format(selected.totalValue),
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
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
                </div>
                <StorageLocationCards location={selected} />
              </section>
            )}
          </div>
        )}
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
