import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { Button } from "@/components/ui/button";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { StorageLocationCards } from "@/features/storage/components/storage-location-cards";
import { StorageLocationNameDialog } from "@/features/storage/components/storage-location-name-dialog";
import { cn } from "@/lib/utils";
import { IconBox, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export default function StoragePage() {
  const { t } = useTranslation("storage");
  const { locations, isLoading, isMutating, create, rename, remove } =
    useStorageLocations();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const selectedGuid = searchParams.get("location") ?? locations[0]?.guid;
  const selected = locations.find((l) => l.guid === selectedGuid);

  const select = (guid: string) =>
    setSearchParams({ location: guid }, { replace: true });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-4 p-4 md:p-6 w-full max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-lg font-semibold">
              {t("page.title")}
            </h1>
            <p className="text-xs text-foreground/70">{t("page.subtitle")}</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} disabled={isMutating}>
            <IconPlus />
            {t("page.newLocation")}
          </Button>
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : locations.length === 0 ? (
          <EmptyState
            icon={IconBox}
            title={t("page.emptyTitle")}
            description={t("page.emptyDescription")}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
            <ul className="divide-y self-start rounded-lg border">
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
                    <span className="shrink-0 text-xs tabular-nums text-foreground/70">
                      {t("page.cardCount", { count: location.cardCount })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {selected && (
              <section className="flex min-w-0 flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="truncate font-heading text-base font-semibold">
                    {selected.name}
                  </h2>
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
