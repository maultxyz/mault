import { useFoilOptions } from "@/features/cards/api/use-foil-options";
import {
  useCardDetailActions,
  useCardDetailCollection,
} from "@/features/cards/api/use-card-detail-scope";
import { HotkeyHint } from "@/components/hotkey-hint";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { HOTKEY_PRIORITY_OVERRIDE } from "@/lib/constants/hotkeys";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { CardPriceDetails } from "@/features/cards/components/card-price-details";
import { CardPurchaseLinks } from "@/features/cards/components/card-purchase-links";
import { DeleteDialog } from "@/components/delete-dialog";
import { FoilOverlay } from "@/components/foil-overlay";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useCardAcquisitionCost } from "@/features/business/api/use-business";
import { NumberInput } from "@/features/business/components/number-input";
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
import {
  useScanBackImage,
  useScanImage,
} from "@/features/cards/api/use-scan-image";
import { CapturedImageThumb } from "@/features/cards/components/captured-image-thumb";
import { CardCorrectionSearch } from "@/features/cards/components/card-correction-search";
import { CardSearchResultTile } from "@/features/cards/components/card-search-result-tile";
import { CardStorageLocationSection } from "@/features/storage/components/card-storage-location-section";
import { MoveToLocationDialog } from "@/features/storage/components/move-to-location-dialog";
import { useCardDetailMoveActions } from "@/features/cards/api/use-card-detail-move-actions";
import { CardScanOriginList } from "@/features/cards/components/card-scan-origin-list";
import { CardDetailsList } from "@/features/cards/components/card-details-list";
import { CardImageViewer } from "@/features/cards/components/card-image-viewer";
import { StorageDeleteWarning } from "@/features/cards/components/storage-delete-warning";
import { CardTechnicalDetails } from "@/features/cards/components/card-technical-details";
import { OcrRegionCrops } from "@/features/cards/components/ocr-region-crops";
import { OcrRegionOverlay } from "@/features/cards/components/ocr-region-overlay";
import { CardDetailActionsSheet } from "@/features/cards/components/card-detail-actions-sheet";
import { DetailSection } from "@/features/cards/components/detail-section";
import { CardTagsMenu } from "@/features/cards/components/card-tags-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  MORE_DETAIL_OPTIONS_ACCORDION_VALUE,
  REVIEW_LAYOUT_WITH_SCAN_COLUMNS_CLASS,
  REVIEW_LAYOUT_WITHOUT_SCAN_COLUMNS_CLASS,
  SIMILAR_MATCHES_ACCORDION_VALUE,
} from "@/lib/constants/cards";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { CardDrawerContext } from "@/lib/card-drawer-context";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import {
  CARD_OCR_REGIONS_STORAGE_KEY,
  CARD_TECHNICAL_DETAILS_STORAGE_KEY,
} from "@/lib/constants/storage-keys";
import { cn } from "@/lib/utils";
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  cardFoilTypeOptions,
  DEFAULT_CARD_CONDITION,
  DEFAULT_CARD_LANGUAGE,
  isCardLanguage,
  OCR_REGIONS_BY_GAME_KEY,
  scanLanguage,
  isCardCondition,
  tcgplayerConditionPriceFor,
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
  IconBox,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconChevronDown,
  IconDots,
  IconFolders,
  IconLanguage,
  IconLayoutGrid,
  IconPencil,
  IconRosette,
  IconSparkles,
  IconSwitchHorizontal,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import {
  cardDiagnosticsQueryOptions,
  cardScanOriginQueryOptions,
} from "@/features/collections/api/collections";
import {
  padFixedOcrRegions,
  toOcrOverlayRegions,
} from "@/features/cards/lib/ocr-read-regions";
import { nextCycledOption } from "@/features/cards/lib/cycle-option";
import { useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import type {
  CardCorrectionOptions,
  CardDetailAttributePicker,
  CardDetailMoveTarget,
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
  isDownloaded = false,
  storageLocation,
  isFoil = false,
  foilType,
  condition,
  language,
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
  onReviewed,
  extraActions,
  onRemoveShortcut,
}: CardDetailPanelProps) {
  const { t } = useTranslation("cards");
  const isMobile = useIsMobile();
  const inCardDrawer = useContext(CardDrawerContext);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [attributePicker, setAttributePicker] =
    useState<CardDetailAttributePicker | null>(null);
  const [moveTarget, setMoveTarget] = useState<CardDetailMoveTarget | null>(
    null,
  );
  const [editing, setEditing] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const [showOcrRegions, setShowOcrRegions] = usePersistedFlag(
    CARD_OCR_REGIONS_STORAGE_KEY,
  );
  const [showTechnicalDetails, handleTechnicalDetailsChange] = usePersistedFlag(
    CARD_TECHNICAL_DETAILS_STORAGE_KEY,
  );
  const ocrRegionsVisible = reviewMode || showOcrRegions;
  const [viewerOpen, setViewerOpen] = useState(false);

  const [candidates, setCandidates] = useState<PlayingCardWithDistance[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [areMatchesOpen, setAreMatchesOpen] = useState(false);
  const prevScanIdRef = useRef<string | undefined>(undefined);
  const prevCardIdRef = useRef<string | undefined>(undefined);
  const candidateStripRef = useRef<HTMLDivElement>(null);

  const { addCard } = useScannedCards();
  const {
    correctCard,
    confirmCard,
    markCardReviewed,
    setCardFoilType,
    setCardCondition,
    setCardLanguage,
  } = useCardDetailActions();
  const { priceOf, format, conditionMultipliers, source } = usePriceSource();
  const canConfirm =
    !!scanId &&
    (lowConfidenceMatch || !!alternativeMatches?.length) &&
    !wasCorrected;
  const collection = useCardDetailCollection();
  const moveActions = useCardDetailMoveActions({
    scanId,
    collectionGuid: collection?.guid,
    canEdit: !extraActions,
    onMovedToCollection: onClose,
  });
  const foilOptions = useFoilOptions();
  const { data: scanOrigin } = useQuery({
    ...cardScanOriginQueryOptions(collection?.guid, scanId ?? ""),
    enabled: !!collection?.guid && !!scanId,
  });
  const hasScanOrigin =
    !!scanId &&
    !!scanOrigin &&
    (!!scanOrigin.scannedAt || !!scanOrigin.scannedBy || !!scanOrigin.device);
  const { acquisitionCost, saveCardAcquisitionCost } =
    useCardAcquisitionCost(scanId);
  const scanDraft = useScanDraft({
    scanId,
    savedFoilType: foilType ?? (isFoil ? t("foil") : null),
    savedCondition: toCardCondition(condition),
    savedLanguage: scanLanguage({ language, card: currentCard ?? {} }),
    savedAcquisitionCost: acquisitionCost?.cost ?? null,
    setCardFoilType,
    setCardCondition,
    setCardLanguage,
    setCardAcquisitionCost: saveCardAcquisitionCost,
  });
  const currentFoilType = scanDraft.foilType;
  const currentCondition = scanDraft.condition;
  const currentLanguage = scanDraft.language;
  const languageOptions: string[] = isCardLanguage(currentLanguage)
    ? [...CARD_LANGUAGES]
    : [currentLanguage, ...CARD_LANGUAGES];
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
      setAreMatchesOpen(!isMobile && !isReviewed && !wasCorrected);
      setEditing(false);
    } else if (currentCard.id !== prevCardIdRef.current) {
      setCandidates((prev) =>
        prev.some((c) => c.id === currentCard.id)
          ? prev
          : [...prev, currentCard],
      );
      setSelectedId(currentCard.id);
    }
    prevCardIdRef.current = currentCard.id;
  }, [
    scanId,
    currentCard,
    alternativeMatches,
    isReviewed,
    wasCorrected,
    isMobile,
  ]);

  const { data: capturedImageUrl, isLoading: isCapturedImageLoading } =
    useScanImage(collection?.guid, scanId);
  const { data: capturedBackImageUrl } = useScanBackImage(collection?.guid, scanId);
  const [backSideScanId, setBackSideScanId] = useState<string | null>(null);
  const showsCapturedBackSide = !!capturedBackImageUrl && backSideScanId === scanId;
  const shownCapturedImageUrl = showsCapturedBackSide
    ? capturedBackImageUrl
    : capturedImageUrl;
  const shownOcrRegionsVisible = ocrRegionsVisible && !showsCapturedBackSide;
  const toggleCapturedSideLabel = showsCapturedBackSide
    ? t("cardDetailPanel.showFrontSide")
    : t("cardDetailPanel.showBackSide");
  const showCapturedImageSlot =
    !!scanId && (isCapturedImageLoading || !!capturedImageUrl);
  const { data: scanDiagnostics } = useQuery({
    ...cardDiagnosticsQueryOptions(collection?.guid, scanId),
    enabled:
      !!collection?.guid && !!scanId && !!capturedImageUrl && ocrRegionsVisible,
  });
  const gameOcrRegions =
    OCR_REGIONS_BY_GAME_KEY[collection?.game?.key ?? ""] ?? [];
  const fixedOcrRegions = padFixedOcrRegions(gameOcrRegions);
  const readOcrRegions = scanDiagnostics?.ocr?.regions?.length
    ? toOcrOverlayRegions(scanDiagnostics.ocr.regions, gameOcrRegions)
    : fixedOcrRegions;

  const stopEditing = useCallback(() => setEditing(false), []);

  const correctionSearchRef = useRef<HTMLDivElement>(null);
  const focusCorrectionSearch = () => {
    const input = correctionSearchRef.current?.querySelector("input");
    if (!input) return;
    input.scrollIntoView({ block: "center" });
    input.focus({ preventScroll: true });
    input.select();
  };
  const leaveCorrectionSearch = () => {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      correctionSearchRef.current?.contains(active)
    ) {
      active.blur();
    }
  };

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
      if (reviewMode) onReviewed?.(scanId);
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
      onReviewed,
      goToNextInReview,
      runAfterCommit,
    ],
  );

  const handleSelectCandidate = useCallback(
    (card: PlayingCardWithDistance) => {
      setSelectedId(card.id);
      setAreMatchesOpen(false);
      if (scanId) correctCard(scanId, card);
    },
    [scanId, correctCard],
  );

  const selectedCard =
    candidates.find((c) => c.id === selectedId) ?? currentCard;
  const hasMultipleCandidates = candidates.length > 1;
  const isMatchChosen = isReviewed || wasCorrected;
  const isViewing = !!currentCard && !editing;

  const startEditing = () => setEditing(true);
  const openCorrection = reviewMode ? focusCorrectionSearch : startEditing;

  const foilTriggerRef = useRef<HTMLButtonElement>(null);
  const conditionTriggerRef = useRef<HTMLButtonElement>(null);
  const languageTriggerRef = useRef<HTMLButtonElement>(null);
  const foilSelectId = useId();
  const conditionSelectId = useId();
  const languageSelectId = useId();
  const conditionPrice = selectedCard
    ? priceOf(
        selectedCard,
        { isFoil: draftIsFoil, foilType: currentFoilType },
        currentCondition,
      )
    : null;
  const isTcgplayerConditionPrice =
    source === "tcgplayer" &&
    !!selectedCard &&
    tcgplayerConditionPriceFor(
      selectedCard,
      { isFoil: draftIsFoil, foilType: currentFoilType },
      currentCondition,
    ) != null;
  const cardFoilOptions = cardFoilTypeOptions(
    foilOptions,
    selectedCard,
    currentFoilType,
  );
  const conditionHandler = (value: CardCondition) =>
    isViewing && scanId ? () => scanDraft.setCondition(value) : undefined;

  const toggleFoil = () => {
    if (!scanId) return;
    scanDraft.setFoilType(currentFoilType ? null : cardFoilOptions[0]);
  };

  const acceptMatchInReview = (chosenCard: PlayingCard | undefined) => {
    if (
      scanId &&
      chosenCard &&
      currentCard &&
      chosenCard.id !== currentCard.id
    ) {
      handleSelect(chosenCard);
      return;
    }
    if (scanId) {
      if (canConfirm) confirmCard(scanId);
      else markCardReviewed(scanId);
      onReviewed?.(scanId);
    }
    runAfterCommit(goToNextInReview);
  };

  const acceptInReview = () => acceptMatchInReview(selectedCard);

  const highlightCandidate = (offset: number) => {
    const selectedIndex = candidates.findIndex((c) => c.id === selectedId);
    const highlighted =
      candidates[
        (selectedIndex + offset + candidates.length) % candidates.length
      ];
    if (!highlighted) return;
    setSelectedId(highlighted.id);
    setAreMatchesOpen(true);
    requestAnimationFrame(() =>
      candidateStripRef.current
        ?.querySelector('[aria-pressed="true"]')
        ?.scrollIntoView({ block: "nearest", inline: "nearest" }),
    );
  };
  const canCycleScanAttributes = reviewMode && isViewing && !!scanId;
  const canHighlightCandidates =
    reviewMode && isViewing && hasMultipleCandidates;

  const requestRemove =
    onRemoveShortcut ??
    (onRemove ? () => setConfirmRemoveOpen(true) : undefined);

  useHotkeys(
    {
      cardPrevious: isViewing && hasPrev ? onPrev : undefined,
      cardNext: isViewing && hasNext ? onNext : undefined,
      cardCorrect: isViewing ? openCorrection : undefined,
      cardToggleFoil:
        !reviewMode && isViewing && scanId ? toggleFoil : undefined,
      reviewCycleFoil: canCycleScanAttributes
        ? () =>
            scanDraft.setFoilType(
              nextCycledOption([null, ...cardFoilOptions], currentFoilType),
            )
        : undefined,
      reviewCycleCondition: canCycleScanAttributes
        ? () =>
            scanDraft.setCondition(
              nextCycledOption(CARD_CONDITIONS, currentCondition),
            )
        : undefined,
      reviewCycleLanguage: canCycleScanAttributes
        ? () =>
            scanDraft.setLanguage(
              nextCycledOption(languageOptions, currentLanguage),
            )
        : undefined,
      cardConditionNM: conditionHandler("NM"),
      cardConditionLP: conditionHandler("LP"),
      cardConditionMP: conditionHandler("MP"),
      cardConditionHP: conditionHandler("HP"),
      cardConditionDMG: conditionHandler("DMG"),
      cardClose: editing ? stopEditing : onClose,
      reviewAccept: reviewMode && isViewing ? acceptInReview : undefined,
      reviewPreviousMatch: canHighlightCandidates
        ? () => highlightCandidate(-1)
        : undefined,
      reviewNextMatch: canHighlightCandidates
        ? () => highlightCandidate(1)
        : undefined,
      cardRemove: isViewing ? requestRemove : undefined,
    },
    true,
    HOTKEY_PRIORITY_OVERRIDE,
  );

  const capturedImage = shownCapturedImageUrl ? (
    <CapturedImageThumb
      src={shownCapturedImageUrl}
      alt={
        showsCapturedBackSide
          ? t("cardDetailPanel.capturedBackSideAlt")
          : t("cardPicker.scannedAlt")
      }
    />
  ) : (
    <Skeleton className="h-full w-full rounded-none" />
  );

  const imageWidthClass = reviewMode ? "w-full" : "w-56 max-md:w-full";

  const cardImages = (
    <>
      {showCapturedImageSlot && (
        <figure className="flex min-w-0 flex-col gap-1.5">
          <div className={cn("flex items-center justify-between gap-1.5", imageWidthClass)}>
            <figcaption className="text-xs text-foreground/70">
              {showsCapturedBackSide
                ? t("cardDetailPanel.capturedBackSide")
                : t("cardDetailPanel.capturedScan")}
            </figcaption>
            {capturedBackImageUrl && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={toggleCapturedSideLabel}
                      aria-pressed={showsCapturedBackSide}
                      onClick={() =>
                        setBackSideScanId(showsCapturedBackSide ? null : (scanId ?? null))
                      }
                    >
                      <IconSwitchHorizontal />
                    </Button>
                  }
                />
                <TooltipContent>{toggleCapturedSideLabel}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            disabled={!shownCapturedImageUrl}
            aria-label={t("cardDetailPanel.enlargeImage")}
            title={t("cardDetailPanel.enlargeImage")}
            className={cn(
              "relative aspect-[2.5/3.5] rounded-lg overflow-hidden border cursor-zoom-in disabled:cursor-default hover:border-primary/60 transition-colors",
              imageWidthClass,
            )}
          >
            {capturedImage}
            {shownOcrRegionsVisible && capturedImageUrl && (
              <OcrRegionOverlay regions={readOcrRegions} />
            )}
          </button>
          {shownOcrRegionsVisible && capturedImageUrl && (
            <OcrRegionCrops
              src={capturedImageUrl}
              regions={readOcrRegions}
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
          {ocrRegionsVisible && selectedCard?.image?.normal && (
            <OcrRegionOverlay regions={fixedOcrRegions} />
          )}
        </div>
        {ocrRegionsVisible && selectedCard?.image?.normal && (
          <OcrRegionCrops
            regions={fixedOcrRegions}
            src={selectedCard.image.normal}
            className={cn(imageWidthClass, "mt-1.5")}
          />
        )}
      </figure>
    </>
  );

  const hasDisplayToggles = !reviewMode && (!!capturedImageUrl || !!scanId);
  const displayToggles = !reviewMode && (
    <>
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
    </>
  );

  const similarMatches = hasMultipleCandidates && (
    <Accordion
      value={areMatchesOpen ? [SIMILAR_MATCHES_ACCORDION_VALUE] : []}
      onValueChange={(value) =>
        setAreMatchesOpen(value.includes(SIMILAR_MATCHES_ACCORDION_VALUE))
      }
    >
      <AccordionItem
        value={SIMILAR_MATCHES_ACCORDION_VALUE}
        className="border-b-0"
      >
        <AccordionTrigger className="py-1 text-xs font-medium tracking-wide text-foreground/70 uppercase">
          <span className="flex items-center gap-1.5">
            {t("cardDetailPanel.similarMatches")}
            <Badge variant="outline">{candidates.length}</Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent className="gap-2 pb-0">
          {!isMatchChosen && (
            <p className="text-sm text-foreground/70">
              {t("cardPicker.multipleMatches")}
            </p>
          )}
          {reviewMode && !isMobile && (
            <p className="flex items-center gap-1 text-xs text-foreground/70">
              <HotkeyHint id="reviewPreviousMatch" />
              <HotkeyHint id="reviewNextMatch" />
              {t("review.pickMatch")}
            </p>
          )}
          <div
            ref={candidateStripRef}
            className="flex gap-2 overflow-x-auto p-1"
          >
            {candidates.map((c) => (
              <CardSearchResultTile
                key={c.id}
                card={c}
                isSelected={c.id === selectedId}
                reviewLayout={reviewMode}
                onClick={() =>
                  reviewMode ? acceptMatchInReview(c) : handleSelectCandidate(c)
                }
                className="w-56 shrink-0 max-md:w-36"
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  const correctionSection = reviewMode && scanId && currentCard && (
    <DetailSection title={t("cardPicker.correctCard")}>
      <div ref={correctionSearchRef} className="flex flex-col gap-2">
        <CardCorrectionSearch
          key={`${scanId}:${currentCard.id}`}
          inline
          initialQuery={currentCard.name}
          collectionGuid={collection?.guid}
          onSelect={handleSelect}
          onCancel={leaveCorrectionSearch}
        />
        {!isMobile && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground/70">
            <span className="inline-flex items-center gap-1">
              <HotkeyHint id="cardCorrect" />
              {t("review.jumpToSearch")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>{t("review.keys.enter")}</Kbd>
              {hasNext ? t("review.correctNext") : t("review.correctFinish")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>{t("review.keys.shiftEnter")}</Kbd>
              {t("review.correctStay")}
            </span>
          </p>
        )}
      </div>
    </DetailSection>
  );

  const scanAttributeControls = (
    <div className="flex flex-wrap gap-6 items-start max-md:grid max-md:grid-cols-2 max-md:gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={foilSelectId}>
          {t("foil")}
          {reviewMode && !isMobile && <HotkeyHint id="reviewCycleFoil" />}
        </Label>
        <Select
          value={currentFoilType ?? "none"}
          onValueChange={(value) => {
            if (scanId) {
              scanDraft.setFoilType(value === "none" ? null : value);
            }
          }}
          disabled={!scanId}
          onOpenChangeComplete={(open) => {
            if (!open) foilTriggerRef.current?.blur();
          }}
        >
          <SelectTrigger
            id={foilSelectId}
            ref={foilTriggerRef}
            className="w-40 max-md:w-full"
          >
            <SelectValue placeholder={t("foilNone")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("foilNone")}</SelectItem>
            {cardFoilOptions.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={conditionSelectId}>
          {t("condition.label")}
          {reviewMode && !isMobile && <HotkeyHint id="reviewCycleCondition" />}
        </Label>
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
            id={conditionSelectId}
            ref={conditionTriggerRef}
            className="w-40 max-md:w-full"
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
              {isTcgplayerConditionPrice
                ? t("condition.marketPriceHint", {
                    price: format(conditionPrice),
                    condition: currentCondition,
                  })
                : t("condition.priceHint", {
                    price: format(conditionPrice),
                    percent: conditionMultipliers[currentCondition],
                  })}
            </p>
          )}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={languageSelectId}>
          {t("language")}
          {reviewMode && !isMobile && <HotkeyHint id="reviewCycleLanguage" />}
        </Label>
        <Select
          value={currentLanguage}
          onValueChange={(value) => {
            if (scanId && value) scanDraft.setLanguage(value);
          }}
          disabled={!scanId}
          onOpenChangeComplete={(open) => {
            if (!open) languageTriggerRef.current?.blur();
          }}
        >
          <SelectTrigger
            id={languageSelectId}
            ref={languageTriggerRef}
            className="w-40 max-md:w-full"
          >
            <SelectValue>
              {LANGUAGE_LABELS[currentLanguage] ?? currentLanguage}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {LANGUAGE_LABELS[option] ?? option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const cardName =
    selectedCard?.name ?? t("cardDetailPanel.cardDetailsFallback");
  const headerPrice = editing ? null : conditionPrice;
  const typeLine = selectedCard?.typeLine ?? "";

  return (
    <div className="flex h-full overflow-x-hidden">
      {shownCapturedImageUrl && (
        <CardImageViewer
          open={viewerOpen}
          onOpenChange={setViewerOpen}
          capturedImageUrl={shownCapturedImageUrl}
          showOcrRegions={shownOcrRegionsVisible}
          onShowOcrRegionsChange={reviewMode ? undefined : setShowOcrRegions}
          ocrRegions={readOcrRegions}
        />
      )}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {!inCardDrawer && (
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
              {!isMobile && displayToggles}
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
        )}
        <div className="@container flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-6 max-md:p-4 max-md:gap-5">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2 max-md:flex-wrap max-md:gap-y-1">
                <h2 className="font-semibold text-base truncate max-md:whitespace-normal max-md:line-clamp-2">
                  {cardName}
                </h2>
                {headerPrice != null && (
                  <span className="shrink-0 text-base font-semibold tabular-nums">
                    {format(headerPrice)}
                  </span>
                )}
                {!(reviewMode && !isMobile) &&
                  total != null &&
                  currentIndex != null && (
                    <span className="text-xs text-foreground/70 shrink-0">
                      {currentIndex + 1} / {total}
                    </span>
                  )}
                {reviewMode && (
                  <Badge variant="outline" className="shrink-0">
                    {t("review.badge")}
                  </Badge>
                )}
                {scanId ? (
                  <CardTagsMenu
                    scanId={scanId}
                    isDownloaded={isDownloaded}
                    isReviewed={isReviewed}
                    wasCorrected={wasCorrected}
                    useSheet={inCardDrawer}
                  />
                ) : (
                  (isReviewed || wasCorrected) && (
                    <Badge variant="success" className="shrink-0">
                      <IconCheck />
                      {t("technicalDetails.reviewed")}
                    </Badge>
                  )
                )}
                {scanId && currentFoilType && (
                  <Badge variant="secondary" className="shrink-0">
                    {currentFoilType}
                  </Badge>
                )}
                {scanId && currentCondition !== DEFAULT_CARD_CONDITION && (
                  <Badge variant="secondary" className="shrink-0">
                    {t(`condition.names.${currentCondition}`)}
                  </Badge>
                )}
                {scanId &&
                  currentLanguage !==
                    (selectedCard?.lang || DEFAULT_CARD_LANGUAGE) && (
                    <Badge variant="secondary" className="shrink-0">
                      {LANGUAGE_LABELS[currentLanguage] ?? currentLanguage}
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
                <p className="text-sm text-foreground/70 truncate">
                  {typeLine}
                </p>
              )}
            </div>
            {inCardDrawer && currentCard && !editing && (
              <Button
                variant="ghost"
                size="icon"
                className="-mt-1 -mr-2 shrink-0"
                aria-label={t("cardDetailPanel.actions")}
                onClick={() => setActionsOpen(true)}
              >
                <IconDots />
              </Button>
            )}
            {!inCardDrawer && currentCard && !editing && scanId && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="-mt-1 -mr-2 shrink-0"
                      aria-label={t("cardDetailPanel.actions")}
                    />
                  }
                >
                  <IconDots />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <IconSparkles />
                      {t("foil")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={currentFoilType ?? "none"}
                        onValueChange={(value: string) =>
                          scanDraft.setFoilType(value === "none" ? null : value)
                        }
                      >
                        <DropdownMenuRadioItem value="none">
                          {t("foilNone")}
                        </DropdownMenuRadioItem>
                        {cardFoilOptions.map((type) => (
                          <DropdownMenuRadioItem key={type} value={type}>
                            {type}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <IconRosette />
                      {t("condition.label")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuRadioGroup
                        value={currentCondition}
                        onValueChange={(value: string) => {
                          if (isCardCondition(value)) {
                            scanDraft.setCondition(value);
                          }
                        }}
                      >
                        {CARD_CONDITIONS.map((option) => (
                          <DropdownMenuRadioItem key={option} value={option}>
                            {t(`condition.names.${option}`)}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <IconLanguage />
                      {t("language")}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                      <DropdownMenuRadioGroup
                        value={currentLanguage}
                        onValueChange={(value: string) =>
                          scanDraft.setLanguage(value)
                        }
                      >
                        {languageOptions.map((option) => (
                          <DropdownMenuRadioItem key={option} value={option}>
                            {LANGUAGE_LABELS[option] ?? option}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {(moveActions.canMoveToLocation ||
                    moveActions.canMoveToCollection) && (
                    <DropdownMenuSeparator />
                  )}
                  {moveActions.canMoveToLocation && (
                    <DropdownMenuItem
                      disabled={moveActions.isMoving}
                      onClick={() => setMoveTarget("location")}
                    >
                      <IconBox />
                      {t("cardDetailPanel.moveToLocation")}
                    </DropdownMenuItem>
                  )}
                  {moveActions.canMoveToCollection && (
                    <DropdownMenuItem
                      disabled={moveActions.isMoving}
                      onClick={() => setMoveTarget("collection")}
                    >
                      <IconFolders />
                      {t("cardDetailPanel.moveToCollection")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {currentCard && !editing ? (
            <>
              {reviewMode ? (
                <div
                  className={cn(
                    "grid items-start gap-6",
                    scanId &&
                      (showCapturedImageSlot
                        ? REVIEW_LAYOUT_WITH_SCAN_COLUMNS_CLASS
                        : REVIEW_LAYOUT_WITHOUT_SCAN_COLUMNS_CLASS),
                  )}
                >
                  <div className="flex min-w-0 flex-col gap-6">
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
                    {similarMatches}
                  </div>
                  <div className="flex min-w-0 flex-col gap-6">
                    {correctionSection}
                    {scanId && scanAttributeControls}
                  </div>
                </div>
              ) : (
                similarMatches
              )}

              <div
                className={cn(
                  "grid gap-6",
                  !reviewMode && "@3xl:grid-cols-[auto_minmax(0,1fr)]",
                )}
              >
                {!reviewMode && (
                  <div className="flex flex-wrap gap-3 items-start @3xl:flex-col @6xl:flex-row max-md:grid max-md:grid-cols-2">
                    {cardImages}
                  </div>
                )}

                {selectedCard && (
                  <div className="flex flex-col gap-6 min-w-0">
                    <DetailSection title={t("cardDetailPanel.details")}>
                      <div className="flex flex-col gap-4">
                        <CardDetailsList card={selectedCard} />
                        {selectedCard.text && (
                          <p className="rounded-md bg-muted p-3 text-sm whitespace-pre-line leading-relaxed">
                            {selectedCard.text}
                          </p>
                        )}
                      </div>
                    </DetailSection>

                    <DetailSection title={t("cardDetailPanel.prices")}>
                      <div className="flex flex-col gap-4">
                        <CardPriceDetails
                          card={selectedCard}
                          isFoil={draftIsFoil}
                          foilType={currentFoilType}
                          condition={currentCondition}
                        />
                        <CardPurchaseLinks card={selectedCard} />
                        {scanId && acquisitionCost && (
                          <Field
                            className="w-40"
                            data-invalid={
                              !!scanDraft.acquisitionCostError || undefined
                            }
                          >
                            <FieldLabel htmlFor="card-price-paid">
                              {t("cardDetailPanel.pricePaid", {
                                currency: acquisitionCost.currency,
                              })}
                            </FieldLabel>
                            <NumberInput
                              id="card-price-paid"
                              min={0}
                              step={0.01}
                              placeholder={t("cardDetailPanel.pricePaidEmpty")}
                              value={scanDraft.acquisitionCost}
                              onChange={scanDraft.setAcquisitionCost}
                              aria-invalid={!!scanDraft.acquisitionCostError}
                            />
                            {scanDraft.acquisitionCostError && (
                              <FieldError
                                errors={[
                                  { message: scanDraft.acquisitionCostError },
                                ]}
                              />
                            )}
                          </Field>
                        )}
                      </div>
                    </DetailSection>

                    {scanId && (
                      <CardStorageLocationSection
                        scanId={scanId}
                        collectionGuid={collection?.guid}
                        canEdit={!extraActions}
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

              {isMobile && hasDisplayToggles && (
                <Accordion>
                  <AccordionItem
                    value={MORE_DETAIL_OPTIONS_ACCORDION_VALUE}
                    className="border-b-0"
                  >
                    <AccordionTrigger className="py-1 text-xs font-medium tracking-wide text-foreground/70 uppercase">
                      {t("cardDetailPanel.moreOptions")}
                    </AccordionTrigger>
                    <AccordionContent className="flex flex-col items-start gap-3 pb-0 text-xs text-foreground/70">
                      {displayToggles}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              {!reviewMode && showTechnicalDetails && scanId && (
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
        {currentCard && !editing && inCardDrawer ? (
          <div className="shrink-0 border-t bg-background/80 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-2xl">
            <div className="flex items-center gap-1.5">
              <Button
                size="icon"
                variant="outline"
                onClick={onPrev}
                disabled={!hasPrev}
                aria-label={t("cardDetailPanel.previousCard")}
              >
                <IconChevronLeft />
              </Button>
              {reviewMode ? (
                <Button className="flex-1" onClick={acceptInReview}>
                  <IconCheck className="size-4" />
                  {hasNext ? t("review.acceptNext") : t("review.acceptFinish")}
                </Button>
              ) : (
                <span className="flex-1 text-center text-xs text-foreground/70 tabular-nums">
                  {total != null && currentIndex != null
                    ? `${currentIndex + 1} / ${total}`
                    : null}
                </span>
              )}
              <Button
                size="icon"
                variant="outline"
                onClick={onNext}
                disabled={!hasNext}
                aria-label={t("cardDetailPanel.nextCard")}
              >
                <IconChevronRight />
              </Button>
            </div>
          </div>
        ) : currentCard && !editing ? (
          <div className="shrink-0 bg-background/80 backdrop-blur-2xl p-2 border-t">
            <div className="flex flex-wrap gap-2 items-center w-full max-md:gap-1.5 max-md:[&>*]:flex-1">
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
                  onClick={() => {
                    if (!scanId) return;
                    setAreMatchesOpen(false);
                    confirmCard(scanId);
                  }}
                  title={t("cardDetailPanel.markCorrectTitle")}
                >
                  <IconCheck className="size-4" />
                  {t("cardDetailPanel.markCorrect")}
                </Button>
              )}
              {!reviewMode && (
                <Button variant="outline" onClick={startEditing}>
                  <IconPencil className="size-4" />
                  {t("cardPicker.correctCard")}
                  <HotkeyHint id="cardCorrect" />
                </Button>
              )}
              {extraActions?.map((action) => (
                <Button
                  key={action.key}
                  variant={action.destructive ? "destructive" : "outline"}
                  disabled={action.disabled}
                  onClick={action.onSelect}
                >
                  {action.icon}
                  {action.label}
                  {action.hotkeyId && <HotkeyHint id={action.hotkeyId} />}
                </Button>
              ))}
              {onRemove && (
                <Button
                  variant="destructive"
                  onClick={
                    storageLocation
                      ? () => setConfirmRemoveOpen(true)
                      : onRemove
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
            </div>
          </div>
        )}
      </div>
      {inCardDrawer && (
        <CardDetailActionsSheet
          open={actionsOpen}
          onOpenChange={setActionsOpen}
          title={cardName}
          actions={[
            ...(canConfirm && !reviewMode
              ? [
                  {
                    key: "mark-correct",
                    label: t("cardDetailPanel.markCorrect"),
                    icon: <IconCheck />,
                    onSelect: () => {
                      if (!scanId) return;
                      setAreMatchesOpen(false);
                      confirmCard(scanId);
                    },
                  },
                ]
              : []),
            {
              key: "correct",
              label: t("cardPicker.correctCard"),
              icon: <IconPencil />,
              onSelect: reviewMode
                ? () => requestAnimationFrame(focusCorrectionSearch)
                : startEditing,
            },
            ...(scanId
              ? [
                  {
                    key: "foil",
                    label: `${t("foil")}: ${currentFoilType ?? t("foilNone")}`,
                    icon: <IconSparkles />,
                    onSelect: () => setAttributePicker("foil"),
                  },
                  {
                    key: "condition",
                    label: `${t("condition.label")}: ${t(`condition.names.${currentCondition}`)}`,
                    icon: <IconRosette />,
                    onSelect: () => setAttributePicker("condition"),
                  },
                  {
                    key: "language",
                    label: `${t("language")}: ${LANGUAGE_LABELS[currentLanguage] ?? currentLanguage}`,
                    icon: <IconLanguage />,
                    onSelect: () => setAttributePicker("language"),
                  },
                ]
              : []),
            ...(moveActions.canMoveToLocation
              ? [
                  {
                    key: "move-to-location",
                    label: t("cardDetailPanel.moveToLocation"),
                    icon: <IconBox />,
                    disabled: moveActions.isMoving,
                    onSelect: () => setMoveTarget("location"),
                  },
                ]
              : []),
            ...(moveActions.canMoveToCollection
              ? [
                  {
                    key: "move-to-collection",
                    label: t("cardDetailPanel.moveToCollection"),
                    icon: <IconFolders />,
                    disabled: moveActions.isMoving,
                    onSelect: () => setMoveTarget("collection"),
                  },
                ]
              : []),
            ...(reviewMode && onShowReviewGrid
              ? [
                  {
                    key: "review-grid",
                    label: t("reviewGrid.layoutGrid"),
                    icon: <IconLayoutGrid />,
                    onSelect: onShowReviewGrid,
                  },
                ]
              : []),
            ...(extraActions ?? []),
            ...(onRemove
              ? [
                  {
                    key: "remove",
                    label: t("cardPicker.remove"),
                    icon: <IconTrash />,
                    destructive: true,
                    onSelect: storageLocation
                      ? () => setConfirmRemoveOpen(true)
                      : onRemove,
                  },
                ]
              : []),
          ]}
        />
      )}
      {inCardDrawer && (
        <CardDetailActionsSheet
          open={attributePicker != null}
          onOpenChange={(open) => {
            if (!open) setAttributePicker(null);
          }}
          title={
            attributePicker === "foil"
              ? t("foil")
              : attributePicker === "condition"
                ? t("condition.label")
                : t("language")
          }
          actions={
            attributePicker === "foil"
              ? [null, ...cardFoilOptions].map((type) => ({
                  key: type ?? "none",
                  label: type ?? t("foilNone"),
                  icon: type === currentFoilType ? <IconCheck /> : null,
                  onSelect: () => scanDraft.setFoilType(type),
                }))
              : attributePicker === "condition"
                ? CARD_CONDITIONS.map((option) => ({
                    key: option,
                    label: t(`condition.names.${option}`),
                    icon: option === currentCondition ? <IconCheck /> : null,
                    onSelect: () => scanDraft.setCondition(option),
                  }))
                : languageOptions.map((option) => ({
                    key: option,
                    label: LANGUAGE_LABELS[option] ?? option,
                    icon: option === currentLanguage ? <IconCheck /> : null,
                    onSelect: () => scanDraft.setLanguage(option),
                  }))
          }
        />
      )}
      {scanId && (
        <MoveToLocationDialog
          open={moveTarget != null}
          count={1}
          excludedLocationGuid={moveActions.storageLocationGuid}
          isMoving={moveActions.isMoving}
          showLocations={moveTarget !== "collection"}
          sourceCollectionGuid={collection?.guid}
          onOpenChange={(open) => {
            if (!open) setMoveTarget(null);
          }}
          onMove={moveActions.moveToLocation}
          onMoveToCollection={
            moveTarget === "collection"
              ? moveActions.moveToCollection
              : undefined
          }
        />
      )}
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
