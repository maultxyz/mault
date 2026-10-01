import { FoilOverlay } from "@/components/foil-overlay";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardSearch } from "@/features/cards/api/use-card-search";
import { useScanImage } from "@/features/cards/api/use-scan-image";
import { CapturedImageThumb } from "@/features/cards/components/captured-image-thumb";
import { CardDetailsList } from "@/features/cards/components/card-details-list";
import { DetailSection } from "@/features/cards/components/detail-section";
import { collectionCardPositionQueryOptions } from "@/features/collections/api/collection-cards";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { ALL_CARDS_QUERY } from "@/lib/constants/card-filters";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type {
  MobileCardDetailBodyProps,
  MobileCardDetailDrawerProps,
} from "@/lib/interfaces/scanner";
import type { PlayingCard } from "@magic-vault/shared";
import {
  IconLoader2,
  IconPencil,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function MobileCardDetailDrawer({
  collectionGuid,
  scanId,
  onClose,
}: MobileCardDetailDrawerProps) {
  const [shownScanId, setShownScanId] = useState(scanId);
  if (scanId && scanId !== shownScanId) setShownScanId(scanId);

  return (
    <Drawer
      open={!!scanId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DrawerContent className="data-[vaul-drawer-direction=bottom]:h-[90dvh] data-[vaul-drawer-direction=bottom]:max-h-[90dvh]">
        {shownScanId && (
          <MobileCardDetailBody
            key={shownScanId}
            collectionGuid={collectionGuid}
            scanId={shownScanId}
            onClose={onClose}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function MobileCardDetailBody({
  collectionGuid,
  scanId,
  onClose,
}: MobileCardDetailBodyProps) {
  const { t } = useTranslation("cards");
  const { correctCard, removeCard } = useScannedCards();
  const { data: position, isPending } = useQuery(
    collectionCardPositionQueryOptions(collectionGuid, scanId, ALL_CARDS_QUERY),
  );
  const entry = position?.entry.scanId === scanId ? position.entry : null;
  const { data: capturedImageUrl, isLoading: isCapturedImageLoading } =
    useScanImage(collectionGuid, scanId);

  const [correctedCard, setCorrectedCard] = useState<PlayingCard | null>(null);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const { results, loading, hasMore, isLoadingMore, loadMore } = useCardSearch(
    editing ? debouncedQuery : "",
    collectionGuid,
  );

  const card = correctedCard ?? entry?.card;
  const isMissing = !isPending && !entry && !correctedCard;

  useEffect(() => {
    if (isMissing) onClose();
  }, [isMissing, onClose]);

  if (!card) {
    return (
      <div className="flex flex-1 items-center justify-center text-foreground/70">
        <DrawerTitle className="sr-only">
          {t("cardDetailPanel.cardDetailsFallback")}
        </DrawerTitle>
        <IconLoader2 className="size-5 animate-spin" />
      </div>
    );
  }

  const handleSelect = (selected: PlayingCard) => {
    correctCard(scanId, selected);
    setCorrectedCard(selected);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex flex-col gap-3 px-4 pt-3 pb-3">
          <DrawerTitle className="text-base font-semibold">
            {t("cardPicker.correctCard")}
          </DrawerTitle>
          <div className="relative">
            <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-foreground/70" />
            <Input
              placeholder={t("cardPicker.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div
          data-vaul-no-drag
          className="flex-1 min-h-0 overflow-y-auto px-4 pb-4"
        >
          {loading && (
            <div className="flex items-center justify-center py-8">
              <IconLoader2 className="size-5 animate-spin text-foreground/70" />
            </div>
          )}
          {!loading && results.length === 0 && (
            <p className="text-center text-sm text-foreground/70 py-8">
              {query.trim().length === 0
                ? t("cardPicker.startTyping")
                : t("cardPicker.noCardsFound")}
            </p>
          )}
          {!loading && results.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="relative aspect-[2.5/3.5] rounded-md overflow-hidden border"
                >
                  {result.image?.small ? (
                    <img
                      src={result.image.small}
                      alt={result.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] leading-tight px-1 py-0.5 text-center truncate">
                    {result.set.toUpperCase()} #{result.collectorNumber}
                  </span>
                </button>
              ))}
            </div>
          )}
          {!loading && hasMore && (
            <div className="flex justify-center pt-3">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore && <IconLoader2 className="animate-spin" />}
                {t("cardPicker.loadMore")}
              </Button>
            </div>
          )}
        </div>
        <div className="shrink-0 border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setEditing(false);
              setQuery("");
            }}
          >
            {t("cardDetailPanel.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  const showCapturedImage = isCapturedImageLoading || !!capturedImageUrl;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="px-4 pt-3 pb-3">
        <DrawerTitle className="text-base font-semibold truncate">
          {card.name}
        </DrawerTitle>
        {card.typeLine && (
          <p className="text-sm text-foreground/70 truncate">{card.typeLine}</p>
        )}
      </div>
      <div
        data-vaul-no-drag
        className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 flex flex-col gap-5"
      >
        <div className="grid grid-cols-2 gap-3 items-start">
          {showCapturedImage && (
            <figure className="flex flex-col gap-1.5">
              <figcaption className="text-xs text-foreground/70">
                {t("cardDetailPanel.capturedScan")}
              </figcaption>
              <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden border">
                {capturedImageUrl ? (
                  <CapturedImageThumb
                    src={capturedImageUrl}
                    alt={t("cardPicker.scannedAlt")}
                  />
                ) : (
                  <Skeleton className="h-full w-full rounded-none" />
                )}
              </div>
            </figure>
          )}
          <figure className="flex flex-col gap-1.5">
            {showCapturedImage && (
              <figcaption className="text-xs text-foreground/70">
                {t("cardDetailPanel.matchedCard")}
              </figcaption>
            )}
            <div className="relative aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm">
              <img
                src={card.image?.normal || ""}
                alt={card.name}
                className="w-full h-full object-cover"
              />
              {entry?.isFoil && <FoilOverlay />}
            </div>
          </figure>
        </div>
        <DetailSection title={t("cardDetailPanel.details")}>
          <CardDetailsList card={card} />
        </DetailSection>
      </div>
      <div className="shrink-0 border-t p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setEditing(true);
            setQuery(card.name);
          }}
        >
          <IconPencil className="size-4" />
          {t("cardPicker.correctCard")}
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            removeCard(scanId);
            onClose();
          }}
        >
          <IconTrash className="size-4" />
          {t("cardPicker.remove")}
        </Button>
      </div>
    </div>
  );
}
