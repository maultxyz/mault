import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { ListPagination } from "@/components/list-pagination";
import { storageLocationCardPageQueryOptions } from "@/features/storage/api/storage-locations";
import {
  useCardGridDensity,
  useStorageCardViewMode,
} from "@/features/cards/api/use-card-view-preferences";
import { StorageCardGrid } from "@/features/storage/components/storage-card-grid";
import { StorageCardList } from "@/features/storage/components/storage-card-list";
import { StorageCardQueryToolbar } from "@/features/storage/components/storage-card-query-toolbar";
import { StorageCardSelectionBar } from "@/features/storage/components/storage-card-selection-bar";
import { loadStorageLocationCardReferences } from "@/features/storage/api/storage-locations";
import {
  storedCardKey,
  storedCardScanIds,
} from "@/features/storage/lib/stored-card-selection";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useScanSelection } from "@/hooks/use-scan-selection";
import type { SelectToggleOptions } from "@/lib/interfaces/cards";
import { STORAGE_PAGE_SEARCH_PARAM } from "@/lib/constants/storage";
import type { StorageLocationCardsProps } from "@/lib/interfaces/storage";
import type {
  StorageLocationCardReference,
  StorageLocationSearchResult,
} from "@magic-vault/shared";
import { IconCards, IconFilterOff } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setPageSize, usePageSize } from "@/lib/page-size-store";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function StorageLocationCards({
  location,
  cardQuery,
  onOpenCard,
}: StorageLocationCardsProps) {
  const { t } = useTranslation("storage");
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useStorageCardViewMode();
  const [density, setDensity] = useCardGridDensity();
  const requestedPage = Math.max(
    Number(searchParams.get(STORAGE_PAGE_SEARCH_PARAM)) || 1,
    1,
  );
  const preferredPageSize = usePageSize();
  const { data, isPending, isPlaceholderData } = useQuery(
    storageLocationCardPageQueryOptions(
      location.guid,
      cardQuery.cardsQuery,
      requestedPage,
      preferredPageSize,
    ),
  );
  const entries = useMemo(
    () =>
      (data?.cards ?? []).map((card) => ({
        ...card,
        locationGuid: location.guid,
        locationName: location.name,
      })),
    [data?.cards, location.guid, location.name],
  );
  const {
    selectedIds,
    setSelectedIds,
    selectItem,
    togglePage,
    isItemSelected,
    clearSelection,
  } = useScanSelection({
    pageItems: entries,
    keyOf: storedCardKey,
    scanIdsOf: storedCardScanIds,
  });
  const [collectionGuidByScanId, setCollectionGuidByScanId] = useState<
    Map<string, string>
  >(new Map());
  const rememberCollections = useCallback(
    (references: StorageLocationCardReference[]) =>
      setCollectionGuidByScanId((previous) => {
        const next = new Map(previous);
        for (const { scanId, collectionGuid } of references) {
          next.set(scanId, collectionGuid);
        }
        return next;
      }),
    [],
  );
  const rememberPageCollections = () => rememberCollections(entries);
  const selectedReferences = useMemo(
    () =>
      [...selectedIds].flatMap((scanId) => {
        const collectionGuid = collectionGuidByScanId.get(scanId);
        return collectionGuid ? [{ scanId, collectionGuid }] : [];
      }),
    [selectedIds, collectionGuidByScanId],
  );
  useHotkeys({
    clearSelection: selectedIds.size > 0 ? clearSelection : undefined,
  });
  const topRef = useRef<HTMLDivElement>(null);
  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? 1;
  const page = data?.page ?? 1;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const allSelected =
    total > 0 &&
    selectedIds.size >= total &&
    entries.every(isItemSelected);

  const toggleSelectedEntry = (
    entry: StorageLocationSearchResult,
    options: SelectToggleOptions,
  ) => {
    rememberPageCollections();
    selectItem(entry.scanId, options);
  };

  const togglePageSelected = () => {
    rememberPageCollections();
    togglePage();
  };

  const toggleSelectAll = async () => {
    if (allSelected) {
      clearSelection();
      return;
    }
    try {
      const references = await loadStorageLocationCardReferences(
        location.guid,
        cardQuery.cardsQuery,
      );
      rememberCollections(references);
      setSelectedIds(new Set(references.map((reference) => reference.scanId)));
    } catch (error) {
      console.error("Failed to select all stored cards:", error);
    }
  };

  const queriedCardsRef = useRef(cardQuery.cardsQuery);
  useEffect(() => {
    if (queriedCardsRef.current === cardQuery.cardsQuery) return;
    queriedCardsRef.current = cardQuery.cardsQuery;
    setSearchParams(
      (params) => {
        params.delete(STORAGE_PAGE_SEARCH_PARAM);
        return params;
      },
      { replace: true },
    );
  }, [cardQuery.cardsQuery, setSearchParams]);

  const changePageSize = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    goToPage(1);
  };

  const goToPage = (next: number) => {
    setSearchParams(
      (params) => {
        if (next > 1) params.set(STORAGE_PAGE_SEARCH_PARAM, String(next));
        else params.delete(STORAGE_PAGE_SEARCH_PARAM);
        return params;
      },
      { replace: true },
    );
    topRef.current?.scrollIntoView({ block: "start" });
  };

  if (location.cardCount === 0 && !isPending && total === 0) {
    return (
      <EmptyState
        size="compact"
        icon={IconCards}
        title={t("cards.emptyTitle")}
        description={t("cards.emptyDescription")}
      />
    );
  }

  const isLoading =
    isPending || (isPlaceholderData && data?.page !== requestedPage);

  return (
    <div ref={topRef} className="flex scroll-mt-20 flex-col gap-4">
      <div className="sticky top-[var(--storage-toolbar-top,0px)] z-50 -mx-4 border-b bg-background/80 px-4 py-2 backdrop-blur-2xl">
        <StorageCardQueryToolbar
          cardQuery={cardQuery}
          allSelected={allSelected}
          canSelectAll={total > 0}
          onToggleSelectAll={() => void toggleSelectAll()}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          density={density}
          onDensityChange={setDensity}
        />
      </div>
      {!isLoading && entries.length > 0 && (
        <ListPagination
          alignsEnd
          pagination={{
            page,
            pageCount,
            setPage: goToPage,
            from: start + 1,
            to: start + entries.length,
            total,
          }}
          pageSize={preferredPageSize}
          onPageSizeChange={changePageSize}
        />
      )}
      {isLoading ? (
        <ListSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState
          size="compact"
          icon={IconFilterOff}
          title={t("cards.noMatchesTitle")}
          description={t("cards.noMatchesDescription")}
        />
      ) : viewMode === "grid" ? (
        <StorageCardGrid
          entries={entries}
          density={density}
          onOpenCard={onOpenCard}
          isSelected={isItemSelected}
          onToggleSelect={toggleSelectedEntry}
        />
      ) : (
        <StorageCardList
          entries={entries}
          onOpenCard={onOpenCard}
          isSelected={isItemSelected}
          onToggleSelect={toggleSelectedEntry}
          onTogglePageSelect={togglePageSelected}
        />
      )}
      {!isLoading && entries.length > 0 && (
        <ListPagination
          alignsEnd
          pagination={{
            page,
            pageCount,
            setPage: goToPage,
            from: start + 1,
            to: start + entries.length,
            total,
          }}
          pageSize={preferredPageSize}
          onPageSizeChange={changePageSize}
        />
      )}
      {selectedReferences.length > 0 && (
        <StorageCardSelectionBar
          location={location}
          selectedReferences={selectedReferences}
          onClear={clearSelection}
        />
      )}
    </div>
  );
}
