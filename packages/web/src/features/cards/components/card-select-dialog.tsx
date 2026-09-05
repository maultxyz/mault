import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { searchCards } from "@/features/cards/api/card-search";
import type { CardSelectDialogProps } from "@/features/cards/types";
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
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconPencil,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

function formatManaCost(manaCost: string): string {
  return manaCost.replace(/[{}]/g, " ").trim().replace(/\s+/g, " ");
}

export function CardSelectDialog({
  trigger,
  title,
  description,
  scanId,
  onRemove,
  currentCard,
  alternativeMatches,
  capturedImageUrl,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: CardSelectDialogProps) {
  const { t } = useTranslation("cards");
  const resolvedTitle = title ?? t("cardSelectDialog.defaultTitle");
  const resolvedDescription = description ?? t("cardSelectDialog.defaultDescription");
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const [editing, setEditing] = useState(!currentCard);
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");
  const [selectedSet, setSelectedSet] = useState<string | null>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [candidates, setCandidates] = useState<PlayingCardWithDistance[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const prevScanIdRef = useRef<string | undefined>(undefined);

  const { addCard, correctCard } = useScannedCards();
  const { activeCollection } = useCollections();

  useEffect(() => {
    if (!open || !currentCard) return;
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
  }, [open, scanId, currentCard, alternativeMatches]);

  useEffect(() => {
    if (!open || editing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && hasPrev) onPrev?.();
      if (e.key === "ArrowRight" && hasNext) onNext?.();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, editing, hasPrev, hasNext, onPrev, onNext]);

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
      if (scanId) {
        correctCard(scanId, card);
      } else {
        addCard({ ...card, distance: 0 });
      }
      handleOpenChange(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scanId, addCard, correctCard],
  );

  const handleSelectCandidate = useCallback(
    (card: PlayingCardWithDistance) => {
      setSelectedId(card.id);
      if (scanId) correctCard(scanId, card);
    },
    [scanId, correctCard],
  );

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isControlled) setInternalOpen(isOpen);
      controlledOnOpenChange?.(isOpen);
      if (!isOpen) {
        setQuery("");
        setDebouncedQuery("");
        setSelectedSet("all");
        setEditing(!currentCard);
        prevScanIdRef.current = undefined;
        setCandidates([]);
        setSelectedId(undefined);
      }
    },
    [isControlled, controlledOnOpenChange, currentCard],
  );

  const handleRemove = useCallback(() => {
    onRemove?.();
    handleOpenChange(false);
  }, [onRemove, handleOpenChange]);

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

  const dialogTitle = selectedCard && !editing ? selectedCard.name : resolvedTitle;
  const dialogDescription =
    selectedCard && !editing ? selectedCard.typeLine : resolvedDescription;

  const hasNav = onPrev !== undefined || onNext !== undefined;

  return (
    <>
      <DynamicDialog
        trigger={trigger}
        title={dialogTitle}
        description={dialogDescription}
        open={open}
        onOpenChange={handleOpenChange}
        className="sm:max-w-lg max-h-[85vh] flex flex-col gap-2"
        footerClassName="flex-col-reverse"
        footer={
          currentCard && !editing ? (
            <>
              <Button variant="destructive" onClick={handleRemove}>
                <IconTrash className="size-4" />
                {t("cardSelectDialog.remove")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(true);
                  if (selectedCard) handleInputChange(selectedCard.name);
                }}
              >
                <IconPencil className="size-4" />
                {t("cardSelectDialog.correctCard")}
              </Button>
            </>
          ) : undefined
        }
      >
        {currentCard && !editing ? (
          <div className="flex flex-col gap-4 overflow-y-auto">
            {hasMultipleCandidates && (
              <div className="flex flex-col gap-2">
                {capturedImageUrl && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-12 aspect-[2.5/3.5] rounded overflow-hidden border shrink-0">
                      <img
                        src={capturedImageUrl}
                        alt={t("cardSelectDialog.scannedAlt")}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {t("cardSelectDialog.selectCorrectVersion")}
                    </p>
                  </div>
                )}
                {!capturedImageUrl && (
                  <p className="text-xs text-muted-foreground font-medium">
                    {t("cardSelectDialog.multipleMatches")}
                  </p>
                )}
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {candidates.map((c) => {
                    const isSelected = c.id === selectedId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCandidate(c)}
                        className={cn(
                          "shrink-0 flex flex-col gap-1 items-center cursor-pointer group",
                        )}
                      >
                        <div
                          className={cn(
                            "w-28 aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 transition-all",
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
                              "text-[10px] font-medium",
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
            <div className={cn("flex gap-3", hasMultipleCandidates && "pt-0")}>
              {!hasMultipleCandidates && (
                <div className="shrink-0 flex flex-col gap-2 items-center">
                  <div className="w-28 aspect-[2.5/3.5] rounded-lg overflow-hidden border">
                    <img
                      src={selectedCard?.image?.normal || ""}
                      alt={selectedCard?.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {capturedImageUrl && (
                    <>
                      <p className="text-[10px] text-muted-foreground">
                        {t("cardSelectDialog.scanned")}
                      </p>
                      <div className="w-28 aspect-[2.5/3.5] rounded-lg overflow-hidden border">
                        <img
                          src={capturedImageUrl}
                          alt={t("cardSelectDialog.scannedAlt")}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
              {selectedCard && (
                <div className="flex flex-col gap-1.5 min-w-0 text-xs flex-1">
                  {selectedCard.manaCost && (
                    <p className="text-muted-foreground">
                      {t("cardSelectDialog.manaCost", { cost: formatManaCost(selectedCard.manaCost) })}
                    </p>
                  )}
                  {selectedCard.text && (
                    <p className="whitespace-pre-line leading-relaxed">
                      {selectedCard.text}
                    </p>
                  )}
                  {selectedCard.power != null &&
                    selectedCard.toughness != null && (
                      <p className="font-semibold">
                        {selectedCard.power}/{selectedCard.toughness}
                      </p>
                    )}
                  <div className="flex items-center gap-1.5 text-muted-foreground flex-wrap">
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
                  {(selectedCard.price != null ||
                    selectedCard.priceFoil != null) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {selectedCard.price != null && (
                        <span>
                          {t("cardSelectDialog.regularPrice", {
                            price: formatUsd(selectedCard.price),
                          })}
                        </span>
                      )}
                      {selectedCard.priceFoil != null && (
                        <span>
                          {t("cardSelectDialog.foilPrice", {
                            price: formatUsd(selectedCard.priceFoil),
                          })}
                        </span>
                      )}
                    </div>
                  )}
                  {selectedCard.artist && (
                    <p className="text-muted-foreground">
                      {t("cardSelectDialog.artBy", { artist: selectedCard.artist })}
                    </p>
                  )}
                  {selectedCard.sourceUrl && (
                    <a
                      href={selectedCard.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline w-fit"
                    >
                      {t("cardSelectDialog.viewSource")}
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <IconSearch className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                <Input
                  placeholder={t("cardSelectDialog.searchPlaceholder")}
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="pl-7"
                />
              </div>
              {sets.length > 1 && (
                <Select
                  value={selectedSet}
                  onValueChange={(value) => setSelectedSet(value)}
                >
                  <SelectTrigger className="w-40 shrink-0">
                    <SelectValue placeholder={t("cardSelectDialog.allSets")}>
                      {selectedSet === "all"
                        ? t("cardSelectDialog.allSetsCount", {
                            count: results.length,
                          })
                        : sets.find((s) => s.code === selectedSet)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t("cardSelectDialog.allSetsCount", { count: results.length })}
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
                    {t("cardSelectDialog.startTyping")}
                  </p>
                )}
              {!loading &&
                filteredResults.length === 0 &&
                query.trim().length >= 2 && (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    {t("cardSelectDialog.noCardsFound")}
                  </p>
                )}
              {!loading && filteredResults.length > 0 && (
                <div className="grid grid-cols-3 gap-1">
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
          </>
        )}
      </DynamicDialog>
      {open &&
        hasNav &&
        !editing &&
        createPortal(
          <div className="fixed inset-0 pointer-events-none flex items-center justify-between px-4 z-[60]">
            <Button
              size="icon"
              onClick={onPrev}
              disabled={!hasPrev}
              className="pointer-events-auto"
            >
              <IconChevronLeft className="size-5" />
            </Button>
            <Button
              size="icon"
              onClick={onNext}
              disabled={!hasNext}
              className="pointer-events-auto"
            >
              <IconChevronRight className="size-5" />
            </Button>
          </div>,
          document.body,
        )}
    </>
  );
}
