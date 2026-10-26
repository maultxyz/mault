import { useFoilOptions } from "@/features/cards/api/use-foil-options";
import {
  useCardDetailActions,
  useCardDetailCollection,
} from "@/features/cards/api/use-card-detail-scope";
import { HotkeyHint } from "@/components/hotkey-hint";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { HOTKEY_PRIORITY_OVERRIDE } from "@/lib/constants/hotkeys";
import { CardPriceDetails } from "@/features/cards/components/card-price-details";
import { DeleteDialog } from "@/components/delete-dialog";
import { FoilOverlay } from "@/components/foil-overlay";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Label } from "@/components/ui/label";
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
import { useScanImage } from "@/features/cards/api/use-scan-image";
import { CapturedImageThumb } from "@/features/cards/components/captured-image-thumb";
import { CardCorrectionSearch } from "@/features/cards/components/card-correction-search";
import { CardStorageLocationSection } from "@/features/storage/components/card-storage-location-section";
import { CardScanOriginList } from "@/features/cards/components/card-scan-origin-list";
import { CardDetailsList } from "@/features/cards/components/card-details-list";
import { CardImageViewer } from "@/features/cards/components/card-image-viewer";
import { StorageDeleteWarning } from "@/features/cards/components/storage-delete-warning";
import { CardTechnicalDetails } from "@/features/cards/components/card-technical-details";
import { OcrRegionCrops } from "@/features/cards/components/ocr-region-crops";
import { OcrRegionOverlay } from "@/features/cards/components/ocr-region-overlay";
import { DetailSection } from "@/features/cards/components/detail-section";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import {
  CARD_OCR_REGIONS_STORAGE_KEY,
  CARD_TECHNICAL_DETAILS_STORAGE_KEY,
} from "@/lib/constants/storage-keys";
import { cn } from "@/lib/utils";
import {
  CARD_CONDITIONS,
  DEFAULT_CARD_CONDITION,
  isCardCondition,
  toCardCondition,
  type CardCondition,
  type PlayingCard,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import { usePriceSource } from "@/hooks/use-price-source";
import { usePersistedFlag } from "@/hooks/use-persisted-state";
import { SaveBar } from "@/components/save-bar";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useScanDraft } from "@/features/cards/api/use-scan-draft";
import {
  IconCheck,
  IconChevronUp,
  IconChevronDown,
  IconLayoutGrid,
  IconPencil,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { cardScanOriginQueryOptions } from "@/features/collections/api/collections";
import { useQuery } from "@tanstack/react-query";
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
  lowConfidenceMatch = false,
  wasCorrected = false,
  isReviewed = false,
  storageLocation,
  isFoil = false,
  foilType,
  condition,
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
  onShowReviewGrid,
  footerActions,
  onRemoveShortcut,
}: CardDetailPanelProps) {
  const { t } = useTranslation("cards");
  const [editing, setEditing] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [showOcrRegions, setShowOcrRegions] = usePersistedFlag(
    CARD_OCR_REGIONS_STORAGE_KEY,
  );
  const [showTechnicalDetails, handleTechnicalDetailsChange] =
    usePersistedFlag(CARD_TECHNICAL_DETAILS_STORAGE_KEY);
  const [viewerOpen, setViewerOpen] = useState(false);

  const [candidates, setCandidates] = useState<PlayingCardWithDistance[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const prevScanIdRef = useRef<string | undefined>(undefined);

  const { addCard } = useScannedCards();
  const {
    correctCard,
    confirmCard,
    markCardReviewed,
    setCardFoilType,
    setCardCondition,
  } = useCardDetailActions();
  const { priceOf, format, conditionMultipliers } = usePriceSource();
  const canConfirm =
    !!scanId && (lowConfidenceMatch || !!alternativeMatches?.length) && !wasCorrected;
  const collection = useCardDetailCollection();
  const foilOptions = useFoilOptions();
  const { data: scanOrigin } = useQuery({
    ...cardScanOriginQueryOptions(collection?.guid, scanId ?? ""),
    enabled: !!collection?.guid && !!scanId,
  });
  const hasScanOrigin =
    !!scanId && !!scanOrigin && (!!scanOrigin.scannedBy || !!scanOrigin.device);
  const scanDraft = useScanDraft({
    scanId,
    savedFoilType: foilType ?? (isFoil ? t("foil") : null),
    savedCondition: toCardCondition(condition),
    setCardFoilType,
    setCardCondition,
  });
  const currentFoilType = scanDraft.foilType;
  const currentCondition = scanDraft.condition;
  const draftIsFoil = currentFoilType != null;
  const { runAfterCommit } = scanDraft;

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
    }
  }, [scanId, currentCard, alternativeMatches]);

  const { data: capturedImageUrl, isLoading: isCapturedImageLoading } =
    useScanImage(collection?.guid, scanId);
  const showCapturedImageSlot =
    !!scanId && (isCapturedImageLoading || !!capturedImageUrl);

  const stopEditing = useCallback(() => setEditing(false), []);

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
        runAfterCommit(goToNextInReview);
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
      runAfterCommit,
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

  const startEditing = () => setEditing(true);

  const foilTriggerRef = useRef<HTMLButtonElement>(null);
  const conditionTriggerRef = useRef<HTMLButtonElement>(null);
  const conditionPrice = selectedCard
    ? priceOf(selectedCard, draftIsFoil, currentCondition)
    : null;
  const conditionHandler = (value: CardCondition) =>
    isViewing && scanId ? () => scanDraft.setCondition(value) : undefined;

  const toggleFoil = () => {
    if (!scanId) return;
    scanDraft.setFoilType(currentFoilType ? null : foilOptions[0]);
  };

  const acceptInReview = () => {
    if (scanId) {
      if (canConfirm) confirmCard(scanId);
      else markCardReviewed(scanId);
    }
    runAfterCommit(goToNextInReview);
  };

  const requestRemove =
    onRemoveShortcut ?? (onRemove ? () => setConfirmRemoveOpen(true) : undefined);

  useHotkeys(
    {
      cardPrevious: isViewing && hasPrev ? onPrev : undefined,
      cardNext: isViewing && hasNext ? onNext : undefined,
      cardCorrect: isViewing ? startEditing : undefined,
      cardToggleFoil: isViewing && scanId ? toggleFoil : undefined,
      cardConditionNM: conditionHandler("NM"),
      cardConditionLP: conditionHandler("LP"),
      cardConditionMP: conditionHandler("MP"),
      cardConditionHP: conditionHandler("HP"),
      cardConditionDMG: conditionHandler("DMG"),
      cardClose: editing ? stopEditing : onClose,
      reviewAccept: reviewMode && isViewing ? acceptInReview : undefined,
      cardRemove: isViewing ? requestRemove : undefined,
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

  const imageWidthClass = reviewMode ? "w-full" : "w-56";

  const cardImages = (
    <>
      {showCapturedImageSlot && (
        <figure className="flex min-w-0 flex-col gap-1.5">
          <figcaption className="text-xs text-foreground/70">
            {t("cardDetailPanel.capturedScan")}
          </figcaption>
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            disabled={!capturedImageUrl}
            aria-label={t("cardDetailPanel.enlargeImage")}
            title={t("cardDetailPanel.enlargeImage")}
            className={cn(
              "relative aspect-[2.5/3.5] rounded-lg overflow-hidden border cursor-zoom-in disabled:cursor-default hover:border-primary/60 transition-colors",
              imageWidthClass,
            )}
          >
            {capturedImage}
            {showOcrRegions && capturedImageUrl && <OcrRegionOverlay />}
          </button>
          {showOcrRegions && capturedImageUrl && (
            <OcrRegionCrops
              src={capturedImageUrl}
              className={cn(imageWidthClass, "mt-1.5")}
            />
          )}
        </figure>
      )}
      <figure className="flex min-w-0 flex-col gap-1.5">
        {showCapturedImageSlot && (
          <figcaption className="text-xs text-foreground/70">
            {t("cardDetailPanel.matchedCard")}
          </figcaption>
        )}
        <div
          className={cn(
            "relative aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm",
            imageWidthClass,
          )}
        >
          <img
            src={selectedCard?.image?.normal || ""}
            alt={selectedCard?.name}
            className="w-full h-full object-cover"
          />
          {draftIsFoil && <FoilOverlay />}
          {showOcrRegions && selectedCard?.image?.normal && (
            <OcrRegionOverlay />
          )}
        </div>
        {showOcrRegions && selectedCard?.image?.normal && (
          <OcrRegionCrops
            src={selectedCard.image.normal}
            className={cn(imageWidthClass, "mt-1.5")}
          />
        )}
      </figure>
    </>
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
          <ButtonGroup className="shrink-0">
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
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-foreground/70">
            {capturedImageUrl && (
              <div className="flex items-center gap-2 whitespace-nowrap">
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
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span>{t("technicalDetails.toggle")}</span>
                <Switch
                  size="sm"
                  aria-label={t("technicalDetails.toggle")}
                  checked={showTechnicalDetails}
                  onCheckedChange={handleTechnicalDetailsChange}
                />
              </div>
            )}
          </div>
          {reviewMode && onShowReviewGrid && (
            <Button
              variant="outline"
              className="shrink-0"
              onClick={onShowReviewGrid}
            >
              <IconLayoutGrid />
              {t("reviewGrid.layoutGrid")}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0"
            onClick={onClose}
            aria-label={t("cardDetailPanel.backToList")}
          >
            <IconX />
          </Button>
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
              {(isReviewed || wasCorrected) && (
                <Badge variant="success" className="shrink-0">
                  <IconCheck />
                  {t("technicalDetails.reviewed")}
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
              {reviewMode && (
                <div
                  className={cn(
                    "grid gap-4",
                    showCapturedImageSlot
                      ? "grid-cols-2 max-w-3xl"
                      : "max-w-sm",
                  )}
                >
                  {cardImages}
                </div>
              )}

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

              <div
                className={cn(
                  "grid gap-6",
                  !reviewMode && "@3xl:grid-cols-[auto_minmax(0,1fr)]",
                )}
              >
                {!reviewMode && (
                  <div className="flex flex-wrap gap-3 items-start @3xl:flex-col @6xl:flex-row">
                    {cardImages}
                  </div>
                )}

                {selectedCard && (
                  <div className="flex flex-col gap-6 min-w-0">
                    <DetailSection title={t("cardDetailPanel.prices")}>
                      <CardPriceDetails
                        card={selectedCard}
                        isFoil={draftIsFoil}
                      />
                    </DetailSection>

                    <DetailSection title={t("cardDetailPanel.details")}>
                      <div className="flex flex-col gap-4">
                        <CardDetailsList card={selectedCard} />
                        {selectedCard.text && (
                          <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-line leading-relaxed">
                            {selectedCard.text}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-6 items-start">
                          <div className="flex flex-col gap-1.5">
                            <Label>{t("foil")}</Label>
                            <Select
                              value={currentFoilType ?? "none"}
                              onValueChange={(value) => {
                                if (scanId) {
                                  scanDraft.setFoilType(
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
                          <div className="flex flex-col gap-1.5">
                            <Label>{t("condition.label")}</Label>
                            <Select
                              value={currentCondition}
                              onValueChange={(value) => {
                                if (scanId && isCardCondition(value)) {
                                  scanDraft.setCondition(value);
                                }
                              }}
                              disabled={!scanId}
                              onOpenChangeComplete={(open) => {
                                if (!open) conditionTriggerRef.current?.blur();
                              }}
                            >
                              <SelectTrigger
                                ref={conditionTriggerRef}
                                className="w-40"
                              >
                                <SelectValue>
                                  {t(`condition.names.${currentCondition}`)}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {CARD_CONDITIONS.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {t(`condition.names.${option}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {conditionPrice != null &&
                              currentCondition !== DEFAULT_CARD_CONDITION && (
                                <p className="text-2xs text-foreground/70">
                                  {t("condition.priceHint", {
                                    price: format(conditionPrice),
                                    percent:
                                      conditionMultipliers[currentCondition],
                                  })}
                                </p>
                              )}
                          </div>
                        </div>
                      </div>
                    </DetailSection>

                    {scanId && (
                      <CardStorageLocationSection
                        scanId={scanId}
                        collectionGuid={collection?.guid}
                        canRemove={!footerActions}
                      />
                    )}

                    {(hasScanOrigin || binNumber != null) && (
                      <DetailSection title={t("cardDetailPanel.thisScan")}>
                        <div className="flex flex-col gap-4">
                          {scanOrigin && hasScanOrigin && (
                            <CardScanOriginList origin={scanOrigin} />
                          )}
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
                    )}
                  </div>
                )}
              </div>

              {showTechnicalDetails && scanId && (
                <CardTechnicalDetails
                  scanId={scanId}
                  card={currentCard}
                  lowConfidenceMatch={lowConfidenceMatch}
                  wasCorrected={wasCorrected}
                  isReviewed={isReviewed}
                />
              )}
            </>
          ) : (
            <CardCorrectionSearch
              collectionGuid={collection?.guid}
              initialQuery={selectedCard?.name}
              capturedImage={showCapturedImageSlot ? capturedImage : undefined}
              onSelect={handleSelect}
              onCancel={stopEditing}
            />
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
              {footerActions}
              {onRemove && (
                <Button
                  variant="destructive"
                  onClick={
                    storageLocation ? () => setConfirmRemoveOpen(true) : onRemove
                  }
                >
                  <IconTrash className="size-4" />
                  {t("cardPicker.remove")}
                  <HotkeyHint id="cardRemove" />
                </Button>
              )}
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
      {onRemove && (
        <DeleteDialog
          open={confirmRemoveOpen}
          onOpenChange={setConfirmRemoveOpen}
          title={t("removeDialog.title", { name: cardName })}
          description={t("removeDialog.description")}
          confirmLabel={t("cardPicker.remove")}
          focusConfirm
          onConfirm={onRemove}
        >
          <StorageDeleteWarning
            storedCount={storageLocation ? 1 : 0}
            total={1}
            location={storageLocation}
            className="mt-4"
          />
        </DeleteDialog>
      )}
      <SaveBar
        show={scanDraft.isDirty}
        isSaving={scanDraft.isSaving}
        onSave={scanDraft.save}
        onDiscard={scanDraft.discard}
      />
      <UnsavedChangesGuard
        isDirty={scanDraft.isDirty}
        onDiscard={scanDraft.discard}
      />
    </div>
  );
}
