import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  checkCollectionName,
  collectionsQueryOptions,
} from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import { CollectionTile } from "@/features/collections/components/collection-tile";
import { CreateCollectionDialog } from "@/features/collections/components/create-collection-dialog";
import { EmptyCollectionDialog } from "@/features/collections/components/empty-collection-dialog";
import type { CollectionTarget } from "@/lib/interfaces/collections";
import { useOrg } from "@/features/companies/api/use-organization";
import { StatGroup } from "@/components/stat-group";
import { useCollectionLocks, useSessionViewersByGuid } from "@/lib/app-stream";
import { useQueryClient } from "@tanstack/react-query";
import {
  COLLECTION_SELECTION_ISLAND_BUTTON_CLASS,
  COLLECTION_SELECTION_ISLAND_CLASS,
  COLLECTIONS_GRID_CLASS,
  COLLECTIONS_SKELETON_COUNT,
} from "@/lib/constants/collections";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import { cn } from "@/lib/utils";
import {
  editCollectionSchema,
  type EditCollectionFormValues,
} from "@/schemas/collections.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconAlbum,
  IconEraser,
  IconLoader2,
  IconPlus,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { CollectionReports } from "@/features/business/components/collection-reports";
import {
  COLLECTIONS_PAGE_TABS,
  DEFAULT_COLLECTIONS_PAGE_TAB,
  REPORT_TAB_PARAM,
} from "@/lib/constants/business";
import type { CollectionsPageTab } from "@/lib/interfaces/business";

export default function CollectionsPage() {
  const { t } = useTranslation("collections");
  const {
    collections,
    activeCollection,
    isActivating,
    isMutating,
    updateCollection,
    activateCollection,
    deleteCollection,
    emptyCollection,
  } = useCollections();
  const { activeOrg } = useOrg();
  const { isLoading } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!activeOrg,
  });

  const { locks, currentUserId } = useCollectionLocks();
  const viewersByGuid = useSessionViewersByGuid();

  const [searchParams, setSearchParams] = useSearchParams();
  const tab =
    COLLECTIONS_PAGE_TABS.find(
      (value) => value === searchParams.get(REPORT_TAB_PARAM),
    ) ?? DEFAULT_COLLECTIONS_PAGE_TAB;
  const isCollectionsTab = tab === DEFAULT_COLLECTIONS_PAGE_TAB;
  const { t: tBusiness } = useTranslation("business");

  const [searchQuery, setSearchQuery] = useState("");
  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );

  const sortRank = (guid: string) => {
    if (guid === activeCollection?.guid) return 0;
    if (locks[guid]?.userId === currentUserId) return 1;
    if (locks[guid]) return 2;
    return 3;
  };
  const sortedCollections = [...filteredCollections].sort(
    (a, b) => sortRank(a.guid) - sortRank(b.guid),
  );
  const queryClient = useQueryClient();
  const [emptyChoice, setEmptyChoice] = useState<{
    targets: CollectionTarget[];
    bulk: boolean;
  } | null>(null);
  const [selectedGuids, setSelectedGuids] = useState<Set<string>>(new Set());
  const [lastToggledGuid, setLastToggledGuid] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"empty" | "delete" | null>(null);
  const liveSelectedGuids = collections
    .filter((c) => selectedGuids.has(c.guid))
    .map((c) => c.guid);
  const allVisibleSelected =
    sortedCollections.length > 0 &&
    sortedCollections.every((c) => selectedGuids.has(c.guid));

  const toggleSelect = (guid: string, shiftKey: boolean) => {
    const order = sortedCollections.map((c) => c.guid);
    const anchor = lastToggledGuid ? order.indexOf(lastToggledGuid) : -1;
    const target = order.indexOf(guid);
    setSelectedGuids((previous) => {
      const next = new Set(previous);
      if (shiftKey && anchor >= 0 && target >= 0) {
        const [from, to] =
          anchor < target ? [anchor, target] : [target, anchor];
        for (const g of order.slice(from, to + 1)) next.add(g);
      } else if (next.has(guid)) {
        next.delete(guid);
      } else {
        next.add(guid);
      }
      return next;
    });
    setLastToggledGuid(guid);
  };

  const runBulkAction = async () => {
    const action = bulkAction;
    const guids = liveSelectedGuids;
    setBulkAction(null);
    for (const guid of guids) {
      if (action === "delete") await deleteCollection(guid);
      else if (action === "empty") await emptyCollection(guid);
    }
    setSelectedGuids(new Set());
    void queryClient.invalidateQueries({
      queryKey: collectionsQueryOptions.queryKey,
    });
  };

  const liveCount = collections.filter((c) => !!locks[c.guid]).length;
  const stats = [
    {
      key: "collections",
      label: t("page.stats.collections"),
      value: collections.length.toLocaleString(),
    },
    {
      key: "live",
      label: t("page.stats.live"),
      value: liveCount.toLocaleString(),
    },
    {
      key: "cards",
      label: t("page.stats.cards"),
      value: collections
        .reduce((sum, c) => sum + c.cardCount, 0)
        .toLocaleString(),
    },
    {
      key: "games",
      label: t("page.stats.games"),
      value: new Set(
        collections.flatMap((c) => (c.game ? [c.game.guid] : [])),
      ).size.toLocaleString(),
    },
  ];

  const [editTarget, setEditTarget] = useState<{
    guid: string;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    guid: string;
    name: string;
  } | null>(null);
  const [emptyTarget, setEmptyTarget] = useState<{
    guid: string;
    name: string;
  } | null>(null);

  const editForm = useForm({
    resolver: zodResolver(editCollectionSchema),
    defaultValues: { name: editTarget?.name ?? "" },
    mode: "onChange",
  });

  const editNameValue = editForm.watch("name");
  const { data: editNameCheck } = useQuery({
    queryKey: ["collections", "check-name", editNameValue, editTarget?.guid],
    queryFn: () => checkCollectionName(editNameValue, editTarget?.guid),
    enabled: !!editTarget && !!editNameValue?.trim(),
    staleTime: 0,
  });

  useEffect(() => {
    if (!editTarget || !editNameValue?.trim()) return;
    if (
      editNameCheck?.success &&
      editNameCheck.data &&
      !editNameCheck.data.available
    ) {
      editForm.setError("name", {
        type: "taken",
        message: t("createDialog.duplicateName"),
      });
    } else {
      editForm.clearErrors("name");
    }
  }, [editTarget, editNameValue, editNameCheck, editForm, t]);

  const handleEditSubmit = useCallback(
    async (values: EditCollectionFormValues) => {
      if (!editTarget) return;
      await updateCollection(editTarget.guid, values.name);
      setEditTarget(null);
    },
    [editTarget, updateCollection],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteCollection(deleteTarget.guid);
    setDeleteTarget(null);
  }, [deleteTarget, deleteCollection]);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleEmpty = useCallback(async () => {
    if (!emptyTarget) return;
    await emptyCollection(emptyTarget.guid);
    setEmptyTarget(null);
  }, [emptyTarget, emptyCollection]);

  const handleEmptyOpenChange = useCallback((open: boolean) => {
    if (!open) setEmptyTarget(null);
  }, []);

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto",
        MOBILE_NAV_SCROLL_PADDING_CLASS,
      )}
    >
      <div className="sticky top-0 z-20 border-b bg-background/80 py-3 backdrop-blur-2xl md:py-4">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-heading text-lg font-semibold">
                {t("page.title")}
              </h1>
              <p className="text-xs text-foreground/70">{t("page.subtitle")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ResponsiveSegmented<CollectionsPageTab>
                label={t("page.title")}
                items={COLLECTIONS_PAGE_TABS.map((value) => ({
                  key: value,
                  label: tBusiness(`reports.tabs.${value}`),
                }))}
                value={tab}
                onChange={(value) =>
                  setSearchParams(
                    value === DEFAULT_COLLECTIONS_PAGE_TAB
                      ? {}
                      : { [REPORT_TAB_PARAM]: value },
                    { replace: true },
                  )
                }
              />
              {isCollectionsTab && (
                <CreateCollectionDialog
                  trigger={({ disabled }) => (
                    <Button disabled={disabled} data-tour="create-collection">
                      <IconPlus />
                      {t("newCollection")}
                    </Button>
                  )}
                />
              )}
            </div>
          </div>
          {isCollectionsTab && !isLoading && collections.length > 0 && (
            <>
              <StatGroup
                heading={t("page.stats.heading")}
                tiles={stats}
                live={liveCount > 0}
                gridClassName="grid-cols-2 sm:grid-cols-4"
              />
              <div className="relative">
                <IconSearch className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground/70" />
                <Input
                  type="search"
                  placeholder={t("page.searchPlaceholder")}
                  data-hotkey-search
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 md:p-6",
          isCollectionsTab &&
            liveSelectedGuids.length > 0 &&
            "pb-24 md:pb-24",
        )}
      >
        {!isCollectionsTab && <CollectionReports tab={tab} />}

        {isCollectionsTab && isLoading && (
          <div className={COLLECTIONS_GRID_CLASS}>
            {Array.from({ length: COLLECTIONS_SKELETON_COUNT }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border">
                <Skeleton className="h-40 rounded-none" />
                <div className="space-y-1.5 border-t p-3">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isCollectionsTab && !isLoading && collections.length === 0 && (
          <EmptyState
            icon={IconAlbum}
            title={t("noCollectionsYet")}
            description={t("page.emptyDescription")}
          />
        )}

        {isCollectionsTab &&
          !isLoading &&
          collections.length > 0 &&
          filteredCollections.length === 0 && (
            <EmptyState
              icon={IconAlbum}
              title={t("noMatchingCollections")}
              description={t("page.noSearchResultsDescription")}
            />
          )}

        {isCollectionsTab && sortedCollections.length > 0 && (
          <div className={COLLECTIONS_GRID_CLASS}>
            {sortedCollections.map((collection) => {
              const target = { guid: collection.guid, name: collection.name };
              const scannerLock = locks[collection.guid];
              return (
                <CollectionTile
                  key={collection.guid}
                  collection={collection}
                  isActive={collection.guid === activeCollection?.guid}
                  scannerLock={scannerLock}
                  isOwnSession={
                    !!scannerLock && scannerLock.userId === currentUserId
                  }
                  isSelected={selectedGuids.has(collection.guid)}
                  onToggleSelect={(shiftKey) =>
                    toggleSelect(collection.guid, shiftKey)
                  }
                  watchers={(viewersByGuid[collection.guid] ?? []).filter(
                    (v) =>
                      v.userId !== scannerLock?.userId &&
                      v.userId !== currentUserId,
                  )}
                  isActivating={isActivating}
                  isMutating={isMutating}
                  onActivate={() => activateCollection(collection.guid)}
                  onEdit={() => {
                    editForm.reset({ name: collection.name });
                    setEditTarget(target);
                  }}
                  onEmpty={() =>
                    setEmptyChoice({ targets: [target], bulk: false })
                  }
                  onDelete={() => setDeleteTarget(target)}
                />
              );
            })}
            {!searchQuery.trim() && (
              <CreateCollectionDialog
                trigger={({ disabled }) => (
                  <button
                    type="button"
                    disabled={disabled}
                    className="flex min-h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-foreground/70 transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none"
                  >
                    <span className="rounded-full border border-dashed p-3">
                      <IconPlus className="size-5" />
                    </span>
                    {t("newCollection")}
                  </button>
                )}
              />
            )}
          </div>
        )}
        {isCollectionsTab &&
          liveSelectedGuids.length > 0 &&
          createPortal(
            <div role="status" className={COLLECTION_SELECTION_ISLAND_CLASS}>
              <span className="font-medium">
                {t("selection.selected", { count: liveSelectedGuids.length })}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
                  onClick={() =>
                    setSelectedGuids(
                      allVisibleSelected
                        ? new Set()
                        : new Set([
                            ...selectedGuids,
                            ...sortedCollections.map((c) => c.guid),
                          ]),
                    )
                  }
                >
                  {allVisibleSelected
                    ? t("selection.deselectAll")
                    : t("selection.selectAll")}
                </Button>
                <Button
                  variant="ghost"
                  className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
                  onClick={() => setSelectedGuids(new Set())}
                >
                  {t("selection.clear")}
                </Button>
                <Button
                  variant="ghost"
                  className={COLLECTION_SELECTION_ISLAND_BUTTON_CLASS}
                  disabled={isMutating}
                  onClick={() =>
                    setEmptyChoice({
                      targets: collections
                        .filter((c) => selectedGuids.has(c.guid))
                        .map((c) => ({ guid: c.guid, name: c.name })),
                      bulk: true,
                    })
                  }
                >
                  <IconEraser />
                  {t("selection.empty")}
                </Button>
                <Button
                  variant="destructive"
                  className="bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90"
                  disabled={isMutating}
                  onClick={() => setBulkAction("delete")}
                >
                  <IconTrash />
                  {t("selection.delete")}
                </Button>
              </div>
            </div>,
            document.body,
          )}
        <DeleteDialog
          open={bulkAction !== null}
          onOpenChange={(open) => {
            if (!open) setBulkAction(null);
          }}
          title={
            bulkAction === "empty"
              ? t("selection.emptyTitle", { count: liveSelectedGuids.length })
              : t("selection.deleteTitle", { count: liveSelectedGuids.length })
          }
          description={
            bulkAction === "empty"
              ? t("selection.emptyDescription")
              : t("selection.deleteDescription")
          }
          confirm={{ type: "keyword" }}
          confirmLabel={
            bulkAction === "empty" ? t("emptyDialog.confirmLabel") : undefined
          }
          onConfirm={() => void runBulkAction()}
        />
        <EmptyCollectionDialog
          targets={emptyChoice?.targets ?? []}
          onOpenChange={(open) => {
            if (!open) setEmptyChoice(null);
          }}
          onChooseDelete={() => {
            const choice = emptyChoice;
            setEmptyChoice(null);
            if (!choice) return;
            if (choice.bulk) setBulkAction("empty");
            else setEmptyTarget(choice.targets[0]);
          }}
        />
        <DynamicDialog
          open={!!editTarget}
          onOpenChange={(open) => {
            if (!open) setEditTarget(null);
          }}
          title={t("editDialog.title")}
          description={t("editDialog.description")}
          trigger={<span />}
          footer={
            <>
              <Button variant="outline" onClick={() => setEditTarget(null)}>
                {t("createDialog.cancel")}
              </Button>
              <Button
                type="submit"
                form="edit-collection-form"
                disabled={!editForm.formState.isValid || isMutating}
              >
                {isMutating && <IconLoader2 className="size-4 animate-spin" />}
                {t("editDialog.submit")}
              </Button>
            </>
          }
          footerClassName="flex-col-reverse md:flex-row"
        >
          <form
            id="edit-collection-form"
            onSubmit={editForm.handleSubmit(handleEditSubmit)}
            className="flex flex-col gap-4"
          >
            <Controller
              name="name"
              control={editForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="edit-collection-name">
                    {t("createDialog.nameLabel")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="edit-collection-name"
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </form>
        </DynamicDialog>
        <DeleteDialog
          open={!!deleteTarget}
          onOpenChange={handleDeleteOpenChange}
          title={t("deleteCollection")}
          description={t("deleteDialog.description", {
            name: deleteTarget?.name ?? "",
          })}
          confirm={{ type: "name", name: deleteTarget?.name ?? "" }}
          onConfirm={handleDelete}
        />
        <DeleteDialog
          open={!!emptyTarget}
          onOpenChange={handleEmptyOpenChange}
          title={t("emptyCollection")}
          description={t("emptyDialog.description", {
            name: emptyTarget?.name ?? "",
          })}
          confirm={{ type: "name", name: emptyTarget?.name ?? "" }}
          confirmLabel={t("emptyDialog.confirmLabel")}
          onConfirm={handleEmpty}
        />
      </div>
    </div>
  );
}
