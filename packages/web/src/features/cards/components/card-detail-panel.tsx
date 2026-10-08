import { useFoilOptions } from "@/features/cards/api/use-foil-options";
import { useCardResultKeyboardNav } from "@/features/cards/api/use-card-result-keyboard-nav";
import { HotkeyHint } from "@/components/hotkey-hint";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { HOTKEY_PRIORITY_OVERRIDE } from "@/lib/constants/hotkeys";
import { EmptyState } from "@/components/empty-state";
import { CardTileSkeletonGrid } from "@/components/card-tile-skeleton-grid";
import { CardPriceDetails } from "@/features/cards/components/card-price-details";
import { FoilOverlay } from "@/components/foil-overlay";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { BinLocationDiagram } from "@/features/bins/components/bin-location-diagram";
import { useCardSearch } from "@/features/cards/api/use-card-search";
import { useScanImage } from "@/features/cards/api/use-scan-image";
import { CapturedImageThumb } from "@/features/cards/components/captured-image-thumb";
import { CardStorageLocationSection } from "@/features/storage/components/card-storage-location-section";
import { CardDetailsList } from "@/features/cards/components/card-details-list";
import { CardImageViewer } from "@/features/cards/components/card-image-viewer";
import { CardTechnicalDetails } from "@/features/cards/components/card-technical-details";
import { OcrRegionCrops } from "@/features/cards/components/ocr-region-crops";
import { DetailSection } from "@/features/cards/components/detail-section";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { CARD_TECHNICAL_DETAILS_STORAGE_KEY } from "@/lib/constants/storage-keys";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import { cn } from "@/lib/utils";
import {
  type PlayingCard,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import {
  IconCheck,
  IconChevronUp,
  IconChevronDown,
  IconLoader2,
  IconPencil,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  CardCorrectionOptions,
  CardDetailPanelProps,
} from "@/lib/interfaces/cards";

export function CardDetailPanel({
  scanId,
  onClose,
  onRemove,
  currentCard,
  alternativeMatches,
  needsReview = false,
  wasCorrected = false,
  isFoil = false,
  foilType,
  binNumber,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  total,
  copyIndex,
  copyCount,
  reviewMode = false,
  onReviewComplete,
}: CardDetailPanelProps) {
  const { t } = useTranslation("cards");
  const [editing, setEditing] = useState(false);
  const [showOcrRegions, setShowOcrRegions] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(() => {
    try {
      return (
        localStorage.getItem(CARD_TECHNICAL_DETAILS_STORAGE_KEY) === "true"
      );
    } catch {
      return false;
    }
  });
  const handleTechnicalDetailsChange = (checked: boolean) => {
    setShowTechnicalDetails(checked);
    try {
      localStorage.setItem(CARD_TECHNICAL_DETAILS_STORAGE_KEY, String(checked));
    } catch {}
  };
  const [viewerOpen, setViewerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState<string | null>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [candidates, setCandidates] = useState<PlayingCardWithDistance[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const prevScanIdRef = useRef<string | undefined>(undefined);

  const { addCard, correctCard, confirmCard, setCardFoilType } =
    useScannedCards();
  const canConfirm =
    !!scanId && (needsReview || !!alternativeMatches?.length) && !wasCorrected;
  const { activeCollection } = useCollections();
  const foilOptions = useFoilOptions();
  const currentFoilType = foilType ?? (isFoil ? t("foil") : null);

  useEffect(() => {
    if (!currentCard) return;
    if (scanId !== prevScanIdRef.current) {
      prevScanIdRef.current = scanId;
      const ids = new Set<string>();
      const all: PlayingCardWithDistance[] = [];
      for (const c of [currentCard, ...(alternativeMatches ?? [])]) {
        if (!ids.has(c.id)) {
          ids.add(c.id);
          all.push(c);
        }
      }
      setCandidates(all);
      setSelectedId(currentCard.id);
      setEditing(false);
      setQuery("");
      setDebouncedQuery("");
      setSelectedSet("all");
    }
  }, [scanId, currentCard, alternativeMatches]);

  const { data: capturedImageUrl, isLoading: isCapturedImageLoading } =
    useScanImage(activeCollection?.guid, scanId);
  const showCapturedImageSlot =
    !!scanId && (isCapturedImageLoading || !!capturedImageUrl);

  const {
    results,
    sets,
    totalCount,
    loading,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useCardSearch(
    debouncedQuery,
    activeCollection?.guid,
    selectedSet && selectedSet !== "all" ? selectedSet : undefined,
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedSet("all");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => setDebouncedQuery(value),
      SEARCH_DEBOUNCE_MS,
    );
  };

  const stopEditing = useCallback(() => {
    setEditing(false);
    setQuery("");
    setDebouncedQuery("");
    setSelectedSet("all");
  }, []);

  const goToNextInReview = useCallback(() => {
    if (hasNext) onNext?.();
    else onReviewComplete?.();
  }, [hasNext, onNext, onReviewComplete]);

  const handleSelect = useCallback(
    (card: PlayingCard, { stay }: CardCorrectionOptions = { stay: false }) => {
      if (!scanId) {
        addCard({ ...card, distance: 0, confidence: 1 });
        onClose();
        return;
      }
      correctCard(scanId, card);
      if (reviewMode && !stay) {
        goToNextInReview();
        return;
      }
      setCandidates((prev) =>
        prev.some((c) => c.id === card.id)
          ? prev
          : [...prev, { ...card, distance: 0, confidence: 1 }],
      );
      setSelectedId(card.id);
      stopEditing();
    },
    [
      scanId,
      addCard,
      correctCard,
      onClose,
      stopEditing,
      reviewMode,
      goToNextInReview,
    ],
  );

  const handleSelectCandidate = useCallback(
    (card: PlayingCardWithDistance) => {
      setSelectedId(card.id);
      if (scanId) correctCard(scanId, card);
    },
    [scanId, correctCard],
  );

  const selectedCard =
    candidates.find((c) => c.id === selectedId) ?? currentCard;
  const hasMultipleCandidates = candidates.length > 1;
  const isViewing = !!currentCard && !editing;

  const startEditing = () => {
    setEditing(true);
    if (selectedCard) handleInputChange(selectedCard.name);
  };

  const { inputRef, gridRef, onInputKeyDown, onResultKeyDown } =
    useCardResultKeyboardNav({
      onSelect: (index, options) => {
        const card = results[index];
        if (card) handleSelect(card, options);
      },
      onCancel: stopEditing,
    });

  const foilTriggerRef = useRef<HTMLButtonElement>(null);

  const toggleFoil = () => {
    if (!scanId) return;
    setCardFoilType(scanId, currentFoilType ? null : foilOptions[0]);
  };

  const acceptInReview = () => {
    if (canConfirm && scanId) confirmCard(scanId);
    goToNextInReview();
  };

  useHotkeys(
    {
      cardPrevious: isViewing && hasPrev ? onPrev : undefined,
      cardNext: isViewing && hasNext ? onNext : undefined,
      cardCorrect: isViewing ? startEditing : undefined,
      cardToggleFoil: isViewing && scanId ? toggleFoil : undefined,
      cardClose: editing ? stopEditing : onClose,
      reviewAccept: reviewMode && isViewing ? acceptInReview : undefined,
    },
    true,
    HOTKEY_PRIORITY_OVERRIDE,
  );

  const capturedImage = capturedImageUrl ? (
    <CapturedImageThumb
      src={capturedImageUrl}
      alt={t("cardPicker.scannedAlt")}
    />
  ) : (
    <Skeleton className="h-full w-full rounded-none" />
  );

  const cardName =
    selectedCard?.name ?? t("cardDetailPanel.cardDetailsFallback");
  const typeLine = selectedCard?.typeLine ?? "";

  return (
    <div className="flex h-full overflow-x-hidden">
      {capturedImageUrl && (
        <CardImageViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          capturedImageUrl={capturedImageUrl}
          showOcrRegions={showOcrRegions}
          onShowOcrRegionsChange={setShowOcrRegions}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-2xl border-b p-2 flex items-center justify-between gap-2">
          <ButtonGroup>
            <Button
              size="icon"
              variant="outline"
              onClick={onPrev}
              disabled={!hasPrev}
              aria-label={t("cardDetailPanel.previousCard")}
            >
              <IconChevronUp />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={onNext}
              disabled={!hasNext}
              aria-label={t("cardDetailPanel.nextCard")}
            >
              <IconChevronDown />
            </Button>
          </ButtonGroup>
          <div className="flex items-center gap-4 shrink-0 text-xs text-foreground/70">
            {capturedImageUrl && (
              <div className="flex items-center gap-2">
                <span>{t("cardDetailPanel.showOcrRegions")}</span>
                <Switch
                  size="sm"
                  aria-label={t("cardDetailPanel.showOcrRegions")}
                  checked={showOcrRegions}
                  onCheckedChange={setShowOcrRegions}
                />
              </div>
            )}
            {scanId && (
              <div className="flex items-center gap-2">
                <span>{t("technicalDetails.toggle")}</span>
                <Switch
                  size="sm"
                  aria-label={t("technicalDetails.toggle")}
                  checked={showTechnicalDetails}
                  onCheckedChange={handleTechnicalDetailsChange}
                />
              </div>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              aria-label={t("cardDetailPanel.backToList")}
            >
              <IconX />
            </Button>
          </div>
        </div>
        <div className="@container flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-6">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2">
              <h2 className="font-semibold text-base truncate">{cardName}</h2>
              {total != null && currentIndex != null && (
                <span className="text-xs text-foreground/70 shrink-0">
                  {currentIndex + 1} / {total}
                </span>
              )}
              {reviewMode && (
                <Badge variant="outline" className="shrink-0">
                  {t("review.badge")}
                </Badge>
              )}
              {copyCount != null && copyCount > 1 && (
                <Badge variant="secondary" className="shrink-0">
                  {t("cardDetailPanel.copyOf", {
                    index: (copyIndex ?? 0) + 1,
                    count: copyCount,
                  })}
                </Badge>
              )}
            </div>
            {typeLine && (
              <p className="text-sm text-foreground/70 truncate">{typeLine}</p>
            )}
          </div>
          {currentCard && !editing ? (
            <>
              {hasMultipleCandidates && (
                <DetailSection title={t("cardDetailPanel.similarMatches")}>
                  <p className="text-sm text-foreground/70">
                    {t("cardPicker.multipleMatches")}
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {candidates.map((c) => {
                      const isSelected = c.id === selectedId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCandidate(c)}
                          className="shrink-0 flex flex-col gap-1 items-center cursor-pointer group"
                        >
                          <div
                            className={cn(
                              "w-24 aspect-[2.5/3.5] rounded-md overflow-hidden border-2 transition-all",
                              isSelected
                                ? "border-primary shadow-md"
                                : "border-border group-hover:border-primary/60",
                            )}
                          >
                            <img
                              src={c.image?.small || c.image?.normal || ""}
                              alt={c.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            {isSelected && (
                              <IconCheck className="size-3 text-primary shrink-0" />
                            )}
                            <p
                              className={cn(
                                "text-xs font-medium",
                                isSelected
                                  ? "text-primary"
                                  : "text-foreground/70",
                              )}
                            >
                              {c.set.toUpperCase()} #{c.collectorNumber}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </DetailSection>
              )}

              <div className="grid gap-6 @3xl:grid-cols-[auto_minmax(0,1fr)]">
                <div className="flex flex-wrap gap-3 items-start @3xl:flex-col @6xl:flex-row">
                  {showCapturedImageSlot && (
                    <figure className="flex flex-col gap-1.5">
                      <figcaption className="text-xs text-foreground/70">
                        {t("cardDetailPanel.capturedScan")}
                      </figcaption>
                      <button
                        type="button"
                        onClick={() => setViewerOpen(true)}
                        disabled={!capturedImageUrl}
                        aria-label={t("cardDetailPanel.enlargeImage")}
                        title={t("cardDetailPanel.enlargeImage")}
                        className="w-56 aspect-[2.5/3.5] rounded-lg overflow-hidden border cursor-zoom-in disabled:cursor-default hover:border-primary/60 transition-colors"
                      >
                        {capturedImage}
                      </button>
                    </figure>
                  )}
                  <figure className="flex flex-col gap-1.5">
                    {showCapturedImageSlot && (
                      <figcaption className="text-xs text-foreground/70">
                        {t("cardDetailPanel.matchedCard")}
                      </figcaption>
                    )}
                    <div className="relative w-56 aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm">
                      <img
                        src={selectedCard?.image?.normal || ""}
                        alt={selectedCard?.name}
                        className="w-full h-full object-cover"
                      />
                      {isFoil && <FoilOverlay />}
                    </div>
                  </figure>
                </div>

                {selectedCard && (
                  <div className="flex flex-col gap-6 min-w-0">
                    {showOcrRegions && capturedImageUrl && (
                      <DetailSection title={t("cardDetailPanel.ocrRegions")}>
                        <OcrRegionCrops
                          src={capturedImageUrl}
                          className="max-w-lg"
                        />
                      </DetailSection>
                    )}

                    <DetailSection title={t("cardDetailPanel.prices")}>
                      <CardPriceDetails card={selectedCard} isFoil={isFoil} />
                    </DetailSection>

                    <DetailSection title={t("cardDetailPanel.details")}>
                      <CardDetailsList card={selectedCard} />
                    </DetailSection>

                    {scanId && (
                      <CardStorageLocationSection
                        scanId={scanId}
                        collectionGuid={activeCollection?.guid}
                      />
                    )}

                    {selectedCard.text && (
                      <DetailSection title={t("cardDetailPanel.cardText")}>
                        <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-line leading-relaxed">
                          {selectedCard.text}
                        </p>
                      </DetailSection>
                    )}

                    <DetailSection title={t("cardDetailPanel.thisScan")}>
                      <div className="flex flex-wrap gap-6 items-start">
                        <div className="flex flex-col gap-1.5">
                          <Label>{t("foil")}</Label>
                          <Select
                            value={currentFoilType ?? "none"}
                            onValueChange={(value) => {
                              if (scanId) {
                                setCardFoilType(
                                  scanId,
                                  value === "none" ? null : value,
                                );
                              }
                            }}
                            disabled={!scanId}
                            onOpenChangeComplete={(open) => {
                              if (!open) foilTriggerRef.current?.blur();
                            }}
                          >
                            <SelectTrigger
                              ref={foilTriggerRef}
                              className="w-40"
                            >
                              <SelectValue placeholder={t("foilNone")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                {t("foilNone")}
                              </SelectItem>
                              {foilOptions.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {binNumber != null && (
                          <div className="flex flex-col gap-1.5">
                            <Label>{t("cardDetailPanel.binLocation")}</Label>
                            <div className="w-48 rounded-lg border">
                              <BinLocationDiagram
                                binNumber={binNumber}
                                inverted={false}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </DetailSection>
                  </div>
                )}
              </div>

              {showTechnicalDetails && scanId && (
                <CardTechnicalDetails
                  scanId={scanId}
                  card={currentCard}
                  needsReview={needsReview}
                  wasCorrected={wasCorrected}
                />
              )}
            </>
          ) : (
            <>
              {showCapturedImageSlot && (
                <div className="flex items-center gap-4">
                  <div className="w-56 aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm shrink-0">
                    {capturedImage}
                  </div>
                  <p className="text-sm text-foreground/70 leading-snug">
                    {t("cardDetailPanel.searchForCorrectVersion")}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-foreground/70" />
                  <Input
                    placeholder={t("cardPicker.searchPlaceholder")}
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    ref={inputRef}
                    className="pl-7"
                    autoFocus
                  />
                </div>
                {sets.length > 1 && (
                  <Select
                    value={selectedSet}
                    onValueChange={(value) => setSelectedSet(value)}
                  >
                    <SelectTrigger className="w-40 shrink-0">
                      <SelectValue placeholder={t("cardPicker.allSets")}>
                        {selectedSet === "all"
                          ? t("cardPicker.allSetsCount", {
                              count: totalCount,
                            })
                          : sets.find((s) => s.code === selectedSet)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("cardPicker.allSetsCount", {
                          count: totalCount,
                        })}
                      </SelectItem>
                      {sets.map((s) => (
                        <SelectItem key={s.code} value={s.code}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <ScrollArea className="flex-1 overflow-y-auto min-h-48 border rounded-lg p-1 bg-sidebar">
                {loading && (
                  <CardTileSkeletonGrid className="grid-cols-4 @3xl:grid-cols-5 gap-1.5" />
                )}
                {!loading &&
                  results.length === 0 &&
                  query.trim().length === 0 && (
                    <p className="text-center text-sm text-foreground/70 py-8">
                      {t("cardPicker.startTyping")}
                    </p>
                  )}
                {!loading &&
                  results.length === 0 &&
                  query.trim().length >= 2 && (
                    <EmptyState
                      size="compact"
                      icon={IconSearch}
                      title={t("cardPicker.noCardsFound")}
                    />
                  )}
                {!loading && results.length > 0 && (
                  <div
                    ref={gridRef}
                    className="grid grid-cols-4 @3xl:grid-cols-5 gap-1.5"
                  >
                    {results.map((card) => (
                      <Button
                        key={card.id}
                        onKeyDown={onResultKeyDown}
                        variant="ghost"
                        className="relative w-full h-auto aspect-[2.5/3.5] p-0 rounded-md overflow-hidden group"
                        onClick={(e) =>
                          handleSelect(card, { stay: e.shiftKey })
                        }
                      >
                        {card.image?.small ? (
                          <img
                            src={card.image.small}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded-md shrink-0" />
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-2xs leading-tight px-1 py-0.5 text-center truncate">
                          {card.set.toUpperCase()} #{card.collectorNumber}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
                {!loading && hasMore && (
                  <div className="flex justify-center py-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore && (
                        <IconLoader2 className="animate-spin" />
                      )}
                      {t("cardPicker.loadMore")}
                    </Button>
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
        {currentCard && !editing ? (
          <div className="shrink-0 bg-background/80 backdrop-blur-2xl p-2 border-t">
            <div className="flex flex-wrap gap-2 items-center w-full">
              {reviewMode && (
                <Button onClick={acceptInReview}>
                  <IconCheck className="size-4" />
                  {hasNext ? t("review.acceptNext") : t("review.acceptFinish")}
                  <HotkeyHint id="reviewAccept" />
                </Button>
              )}
              {canConfirm && !reviewMode && (
                <Button
                  variant="outline"
                  onClick={() => scanId && confirmCard(scanId)}
                  title={t("cardDetailPanel.markCorrectTitle")}
                >
                  <IconCheck className="size-4" />
                  {t("cardDetailPanel.markCorrect")}
                </Button>
              )}
              <Button variant="outline" onClick={startEditing}>
                <IconPencil className="size-4" />
                {t("cardPicker.correctCard")}
                <HotkeyHint id="cardCorrect" />
              </Button>
              <Button variant="destructive" onClick={() => onRemove?.()}>
                <IconTrash className="size-4" />
                {t("cardPicker.remove")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="shrink-0 bg-background/80 backdrop-blur-2xl p-2 border-t">
            <div className="flex items-center w-full">
              <Button variant="outline" onClick={stopEditing}>
                {t("cardDetailPanel.cancel")}
                <HotkeyHint id="cardClose" />
              </Button>
              {reviewMode && scanId && (
                <p className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/70">
                  <span className="inline-flex items-center gap-1">
                    <Kbd>{t("review.keys.enter")}</Kbd>
                    {hasNext
                      ? t("review.correctNext")
                      : t("review.correctFinish")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Kbd>{t("review.keys.shiftEnter")}</Kbd>
                    {t("review.correctStay")}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
