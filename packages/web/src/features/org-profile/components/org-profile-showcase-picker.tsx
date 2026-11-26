import { CardImage } from "@/components/card-image";
import { EmptyState } from "@/components/empty-state";
import { ListPagination } from "@/components/list-pagination";
import { ListSearchInput } from "@/components/list-search-input";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { SkeletonStatus } from "@/components/skeleton-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionCardsPageQueryOptions } from "@/features/collections/api/collection-cards";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import {
  showcaseCardFromScannedCard,
  toggleShowcaseScanId,
} from "@/features/org-profile/lib/org-profile-form";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  ORG_PROFILE_PICKER_BASE_QUERY,
  ORG_PROFILE_PICKER_PAGE_SIZE,
  ORG_PROFILE_PICKER_SEARCH_MAX_LENGTH,
  ORG_PROFILE_PICKER_SKELETON_COUNT,
} from "@/lib/constants/org-profile";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type {
  OrgProfileShowcaseCardsById,
  OrgProfileShowcasePickerBodyProps,
  OrgProfileShowcasePickerProps,
} from "@/lib/interfaces/org-profile";
import { cn } from "@/lib/utils";
import { ORG_PROFILE_SHOWCASE_CARDS_MAX, type ScannedCard } from "@magic-vault/shared";
import { IconCards, IconCheck } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

function OrgProfileShowcasePickerBody({
  selectedScanIds,
  onDone,
}: OrgProfileShowcasePickerBodyProps) {
  const { t } = useTranslation("org-profile");
  const collectionLabelId = useId();
  const [draftScanIds, setDraftScanIds] = useState<string[]>(selectedScanIds);
  const [pickedCardsById, setPickedCardsById] = useState<OrgProfileShowcaseCardsById>({});
  const [chosenCollectionGuid, setChosenCollectionGuid] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const collections = useQuery(collectionsQueryOptions);
  const collectionList = collections.data ?? [];
  const collectionGuid =
    chosenCollectionGuid ??
    collectionList.find((collection) => collection.isActive)?.guid ??
    collectionList[0]?.guid;
  const selectedCollection = collectionList.find(
    (collection) => collection.guid === collectionGuid,
  );
  const cards = useQuery(
    collectionCardsPageQueryOptions(
      collectionGuid,
      { ...ORG_PROFILE_PICKER_BASE_QUERY, search: debouncedSearch },
      page,
      ORG_PROFILE_PICKER_PAGE_SIZE,
    ),
  );
  const items = cards.data?.items ?? [];
  const total = cards.data?.totalEntries ?? 0;
  const isFull = draftScanIds.length >= ORG_PROFILE_SHOWCASE_CARDS_MAX;
  const isLoadingCards =
    collections.isPending || (!!collectionGuid && cards.isPending);

  const toggle = (entry: ScannedCard) => {
    setDraftScanIds((previous) =>
      toggleShowcaseScanId(previous, entry.scanId, ORG_PROFILE_SHOWCASE_CARDS_MAX),
    );
    setPickedCardsById((previous) => ({
      ...previous,
      [entry.scanId]: showcaseCardFromScannedCard(entry),
    }));
  };

  return (
    <>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <span id={collectionLabelId} className="sr-only">
          {t("picker.collectionLabel")}
        </span>
        <Select
          value={collectionGuid ?? ""}
          onValueChange={(guid) => {
            if (!guid) return;
            setChosenCollectionGuid(guid);
            setPage(0);
          }}
        >
          <SelectTrigger aria-labelledby={collectionLabelId} className="w-full md:w-56">
            <SelectValue>
              {selectedCollection?.name ?? t("picker.chooseCollection")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {collectionList.map((collection) => (
              <SelectItem key={collection.guid} value={collection.guid}>
                {collection.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="min-w-0 flex-1">
          <ListSearchInput
            value={search}
            maxLength={ORG_PROFILE_PICKER_SEARCH_MAX_LENGTH}
            placeholder={t("picker.searchPlaceholder")}
            onChange={(value) => {
              setSearch(value);
              setPage(0);
            }}
          />
        </div>
      </div>
      <p role="status" className="text-xs text-foreground/70 tabular-nums">
        {t("picker.selectedCount", {
          current: draftScanIds.length,
          max: ORG_PROFILE_SHOWCASE_CARDS_MAX,
        })}
      </p>
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
        {collections.isError || cards.isError ? (
          <LoadErrorCallout
            message={t("picker.loadFailed")}
            onRetry={() =>
              void (collections.isError ? collections.refetch() : cards.refetch())
            }
          />
        ) : isLoadingCards ? (
          <SkeletonStatus className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: ORG_PROFILE_PICKER_SKELETON_COUNT }, (_, index) => (
              <Skeleton key={index} className="aspect-[2.5/3.5] w-full rounded-lg" />
            ))}
          </SkeletonStatus>
        ) : items.length === 0 ? (
          <EmptyState
            size="compact"
            icon={IconCards}
            title={debouncedSearch ? t("picker.noResults") : t("picker.empty")}
          />
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {items.map((entry) => {
              const isSelected = draftScanIds.includes(entry.scanId);
              return (
                <li key={entry.scanId} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!isSelected && isFull}
                    onClick={() => toggle(entry)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-lg p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                      isSelected && "bg-primary/10 ring-2 ring-primary",
                    )}
                  >
                    <span className="relative block aspect-[2.5/3.5] overflow-hidden rounded-md">
                      <CardImage
                        src={entry.card.image?.small || entry.card.image?.normal}
                        alt=""
                      />
                      {isSelected && (
                        <span
                          aria-hidden
                          className="absolute top-1 right-1 rounded-full bg-primary p-0.5 text-primary-foreground shadow-md"
                        >
                          <IconCheck className="size-3.5" />
                        </span>
                      )}
                    </span>
                    <span className="truncate text-2xs font-medium">{entry.card.name}</span>
                    <span className="truncate text-2xs uppercase text-foreground/70">
                      {entry.card.set}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <ListPagination
        compact
        alignsEnd
        pagination={{
          page: page + 1,
          pageCount: Math.max(1, Math.ceil(total / ORG_PROFILE_PICKER_PAGE_SIZE)),
          setPage: (nextPage) => setPage(nextPage - 1),
          from: page * ORG_PROFILE_PICKER_PAGE_SIZE + 1,
          to: page * ORG_PROFILE_PICKER_PAGE_SIZE + items.length,
          total,
        }}
      />
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>
          {t("picker.cancel")}
        </DialogClose>
        <Button
          type="button"
          onClick={() => onDone(draftScanIds, Object.values(pickedCardsById))}
        >
          {t("picker.done")}
        </Button>
      </DialogFooter>
    </>
  );
}

export function OrgProfileShowcasePicker({
  open,
  onOpenChange,
  selectedScanIds,
  onDone,
}: OrgProfileShowcasePickerProps) {
  const { t } = useTranslation("org-profile");
  return (
    <Dialog drawerOnMobile={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("picker.title")}</DialogTitle>
          <DialogDescription>
            {t("picker.description", { max: ORG_PROFILE_SHOWCASE_CARDS_MAX })}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <OrgProfileShowcasePickerBody selectedScanIds={selectedScanIds} onDone={onDone} />
        )}
      </DialogContent>
    </Dialog>
  );
}
