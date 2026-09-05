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
import { Switch } from "@/components/ui/switch";
import { BinLocationDiagram } from "@/features/bins/components/bin-location-diagram";
import { getCardById, searchCards } from "@/features/cards/api/card-search";
import { loadCardImage } from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { formatUsd } from "@/features/scanner/components/scan-stats";
import { cn } from "@/lib/utils";
import {
  QUERY_MIN_LENGTH,
  type PlayingCard,
  type PlayingCardWithDistance,
} from "@magic-vault/shared";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconLoader2,
  IconPencil,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

function formatManaCost(manaCost: string): string {
  return manaCost.replace(/[{}]/g, " ").trim().replace(/\s+/g, " ");
}

interface CardDetailPanelProps {
  scanId?: string;
  onClose: () => void;
  onRemove?: () => void;
  currentCard?: PlayingCardWithDistance;
  alternativeMatches?: PlayingCardWithDistance[];
  isFoil?: boolean;
  binNumber?: number;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  total?: number;
}

export function CardDetailPanel({
  scanId,
  onClose,
  onRemove,
  currentCard,
  alternativeMatches,
  isFoil = false,
  binNumber,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  currentIndex,
  total,
}: CardDetailPanelProps) {
  const { t } = useTranslation("cards");
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState<string | null>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [candidates, setCandidates] = useState<PlayingCardWithDistance[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const prevScanIdRef = useRef<string | undefined>(undefined);

  const { addCard, correctCard, toggleFoil } = useScannedCards();
  const { activeCollection } = useCollections();

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

  useEffect(() => {
    if (editing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editing, hasPrev, hasNext, onPrev, onNext, onClose]);

  const { data: capturedImageUrl } = useQuery({
    queryKey: ["collection-card-image", activeCollection?.guid, scanId],
    queryFn: () =>
      loadCardImage(activeCollection!.guid, scanId!).then(
        (r) => r.data?.capturedImageUrl,
      ),
    enabled: !!activeCollection?.guid && !!scanId,
    staleTime: Infinity,
  });

  const isQueryReady = debouncedQuery.trim().length >= QUERY_MIN_LENGTH;

  const { data: results = [], isFetching: loading } = useQuery({
    queryKey: ["scryfall", "search", debouncedQuery, activeCollection?.guid],
    queryFn: () =>
      searchCards(debouncedQuery, activeCollection?.guid).then(
        (r) => r.data ?? [],
      ),
    enabled: isQueryReady,
    staleTime: 60_000,
  });

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedSet("all");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 300);
  };

  const handleSelect = useCallback(
    (card: PlayingCard) => {
      if (scanId) correctCard(scanId, card);
      else addCard({ ...card, distance: 0 });
      onClose();
    },
    [scanId, addCard, correctCard, onClose],
  );

  const handleSelectCandidate = useCallback(
    (card: PlayingCardWithDistance) => {
      setSelectedId(card.id);
      if (scanId) correctCard(scanId, card);
    },
    [scanId, correctCard],
  );

  const sets = useMemo(() => {
    const setMap = new Map<string, string>();
    for (const card of results) {
      if (!setMap.has(card.set)) setMap.set(card.set, card.setName);
    }
    return Array.from(setMap.entries())
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [results]);

  const filteredResults = useMemo(() => {
    if (selectedSet === "all") return results;
    return results.filter((card) => card.set === selectedSet);
  }, [results, selectedSet]);

  const selectedCard =
    candidates.find((c) => c.id === selectedId) ?? currentCard;
  const hasMultipleCandidates = candidates.length > 1;

  const [isRefetching, setIsRefetching] = useState(false);
  const handleRefetch = useCallback(async () => {
    if (!scanId || !selectedCard) return;
    setIsRefetching(true);
    try {
      const result = await getCardById(selectedCard.id, activeCollection?.guid);
      if (!result.success || !result.data) {
        toast.error(result.message || t("cardDetailPanel.refetchError"));
        return;
      }
      correctCard(scanId, result.data);
      toast.success(t("cardDetailPanel.refetchSuccess"));
    } catch {
      toast.error(t("cardDetailPanel.refetchError"));
    } finally {
      setIsRefetching(false);
    }
  }, [scanId, selectedCard, activeCollection?.guid, correctCard, t]);

  const cardName =
    selectedCard?.name ?? t("cardDetailPanel.cardDetailsFallback");
  const typeLine = selectedCard?.typeLine ?? "";

  return (
    <div className="flex h-full">
      <div className="sticky top-0 p-2 shrink-0 flex flex-col gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="shrink-0 size-7"
          onClick={onClose}
          aria-label={t("cardDetailPanel.backToList")}
        >
          <IconX />
        </Button>
        <ButtonGroup orientation="vertical">
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
      </div>
      <div className="flex-1 flex flex-col min-w-0 border-l">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-2xl border-b p-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <h2 className="font-semibold text-base truncate">{cardName}</h2>
              {total != null && currentIndex != null && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {currentIndex + 1} / {total}
                </span>
              )}
            </div>
            {typeLine && (
              <p className="text-sm text-muted-foreground truncate">
                {typeLine}
              </p>
            )}
          </div>
        </div>
        <div className="p-6 flex flex-col gap-5">
          {currentCard && !editing ? (
            <>
              {hasMultipleCandidates && (
                <div className="flex flex-col gap-3">
                  {capturedImageUrl ? (
                    <div className="flex items-center gap-4">
                      <div className="w-40 aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm shrink-0">
                        <img
                          src={capturedImageUrl}
                          alt={t("cardDetailPanel.scannedAlt")}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug">
                        {t("cardDetailPanel.selectCorrectVersion")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground font-medium">
                      {t("cardDetailPanel.multipleMatches")}
                    </p>
                  )}
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {candidates.map((c) => {
                      const isSelected = c.id === selectedId;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCandidate(c)}
                          className="shrink-0 flex flex-col gap-1.5 items-center cursor-pointer group"
                        >
                          <div
                            className={cn(
                              "w-32 aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 transition-all",
                              isSelected
                                ? "border-primary shadow-md"
                                : "border-border group-hover:border-primary/60",
                            )}
                          >
                            <img
                              src={c.image?.normal || c.image?.small || ""}
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
                                  : "text-muted-foreground",
                              )}
                            >
                              {c.set.toUpperCase()} #{c.collectorNumber}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t" />
                </div>
              )}
              <div className="flex gap-6">
                {!hasMultipleCandidates && (
                  <div className="shrink-0 flex flex-col gap-3 items-center">
                    <div className="w-44 aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm">
                      <img
                        src={selectedCard?.image?.normal || ""}
                        alt={selectedCard?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {capturedImageUrl && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {t("cardDetailPanel.capturedScan")}
                        </p>
                        <div className="w-44 aspect-[2.5/3.5] rounded-lg overflow-hidden border">
                          <img
                            src={capturedImageUrl}
                            alt={t("cardDetailPanel.scannedAlt")}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedCard && (
                  <div className="flex flex-col gap-3 min-w-0 flex-1">
                    {selectedCard.manaCost && (
                      <p className="text-sm text-muted-foreground">
                        {formatManaCost(selectedCard.manaCost)}
                      </p>
                    )}
                    {selectedCard.text && (
                      <p className="text-sm whitespace-pre-line leading-relaxed">
                        {selectedCard.text}
                      </p>
                    )}
                    {selectedCard.power != null &&
                      selectedCard.toughness != null && (
                        <p className="text-sm font-semibold">
                          {selectedCard.power}/{selectedCard.toughness}
                        </p>
                      )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <div
                        className="size-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: `var(--${selectedCard.rarity})`,
                        }}
                      />
                      <span className="capitalize">{selectedCard.rarity}</span>
                      <span>·</span>
                      <span>
                        {selectedCard.setName} #{selectedCard.collectorNumber}
                      </span>
                    </div>
                    {binNumber != null && (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          {t("cardDetailPanel.binLocation")}
                        </p>
                        <div className="w-48 rounded-lg border">
                          <BinLocationDiagram
                            binNumber={binNumber}
                            inverted={false}
                          />
                        </div>
                      </div>
                    )}
                    {(selectedCard.price != null ||
                      selectedCard.priceFoil != null) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {selectedCard.price != null && (
                          <span>
                            {t("cardDetailPanel.regularPrice", {
                              price: formatUsd(selectedCard.price),
                            })}
                          </span>
                        )}
                        {selectedCard.priceFoil != null && (
                          <span>
                            {t("cardDetailPanel.foilPrice", {
                              price: formatUsd(selectedCard.priceFoil),
                            })}
                          </span>
                        )}
                      </div>
                    )}
                    {selectedCard.artist && (
                      <p className="text-xs text-muted-foreground">
                        {t("cardDetailPanel.artBy", {
                          artist: selectedCard.artist,
                        })}
                      </p>
                    )}
                    {selectedCard.sourceUrl && (
                      <a
                        href={selectedCard.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline w-fit"
                      >
                        {t("cardDetailPanel.viewSource")}
                      </a>
                    )}
                  </div>
                )}
              </div>
              <Label className="flex items-center gap-2 w-fit">
                <Switch
                  checked={isFoil}
                  onCheckedChange={(checked) => {
                    if (scanId) toggleFoil(scanId, checked);
                  }}
                  disabled={!scanId}
                />
                {t("cardDetailPanel.foil")}
              </Label>
              <div className="flex gap-3 pt-1">
                <Button
                  variant="outline"
                  onClick={handleRefetch}
                  disabled={isRefetching || !selectedCard}
                  title={t("cardDetailPanel.refetchCardDataTitle")}
                >
                  <IconRefresh
                    className={cn("size-4", isRefetching && "animate-spin")}
                  />
                  {isRefetching
                    ? t("cardDetailPanel.refetching")
                    : t("cardDetailPanel.refetchCardData")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditing(true);
                    if (selectedCard) handleInputChange(selectedCard.name);
                  }}
                >
                  <IconPencil className="size-4" />
                  {t("cardDetailPanel.correctCard")}
                </Button>
                <Button variant="destructive" onClick={() => onRemove?.()}>
                  <IconTrash className="size-4" />
                  {t("cardDetailPanel.remove")}
                </Button>
              </div>
            </>
          ) : (
            <>
              {capturedImageUrl && (
                <div className="flex items-center gap-4">
                  <div className="w-40 aspect-[2.5/3.5] rounded-lg overflow-hidden border shadow-sm shrink-0">
                    <img
                      src={capturedImageUrl}
                      alt={t("cardDetailPanel.scannedAlt")}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">
                    {t("cardDetailPanel.searchForCorrectVersion")}
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                  <Input
                    placeholder={t("cardDetailPanel.searchPlaceholder")}
                    value={query}
                    onChange={(e) => handleInputChange(e.target.value)}
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
                      <SelectValue placeholder={t("cardDetailPanel.allSets")}>
                        {selectedSet === "all"
                          ? t("cardDetailPanel.allSetsCount", {
                              count: results.length,
                            })
                          : sets.find((s) => s.code === selectedSet)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {t("cardDetailPanel.allSetsCount", {
                          count: results.length,
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
              <ScrollArea className="flex-1 overflow-y-auto min-h-0 max-h-[50vh] border rounded-lg p-1 bg-sidebar">
                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!loading &&
                  filteredResults.length === 0 &&
                  query.trim().length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      {t("cardDetailPanel.startTyping")}
                    </p>
                  )}
                {!loading &&
                  filteredResults.length === 0 &&
                  query.trim().length >= 2 && (
                    <p className="text-center text-sm text-muted-foreground py-8">
                      {t("cardDetailPanel.noCardsFound")}
                    </p>
                  )}
                {!loading && filteredResults.length > 0 && (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-1.5">
                    {filteredResults.map((card) => (
                      <Button
                        key={card.id}
                        variant="ghost"
                        className="relative w-full h-auto aspect-[2.5/3.5] p-0 rounded overflow-hidden group"
                        onClick={() => handleSelect(card)}
                      >
                        {card.image?.small ? (
                          <img
                            src={card.image.small}
                            alt={card.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-14 bg-muted rounded shrink-0" />
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[10px] leading-tight px-1 py-0.5 text-center truncate">
                          {card.set.toUpperCase()} #{card.collectorNumber}
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(false);
                  setQuery("");
                  setDebouncedQuery("");
                  setSelectedSet("all");
                }}
              >
                {t("cardDetailPanel.cancel")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
