import { Command, CommandInput, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardSearch } from "@/features/cards/api/use-card-search";
import { useCollectionCardSearchLanguage } from "@/features/cards/api/use-collection-card-search-language";
import { useQuickAddCards } from "@/features/cards/api/use-quick-add-cards";
import { QuickAddLog } from "@/features/cards/components/quick-add-log";
import { QuickAddOptions } from "@/features/cards/components/quick-add-options";
import { QuickAddResultItem } from "@/features/cards/components/quick-add-result-item";
import {
  matchesQuickAddCollectorNumber,
  parseQuickAddLine,
  storedLocationOrNone,
  storedTextOrEmpty,
} from "@/features/cards/lib/quick-add-line";
import { useCollections } from "@/features/collections/api/use-collections";
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  usePersistedFlag,
  usePersistedState,
} from "@/hooks/use-persisted-state";
import { QUICK_ADD_NO_LOCATION } from "@/lib/constants/cards";
import { SEARCH_RESULT_SKELETON_ROWS } from "@/lib/constants/search";
import {
  QUICK_ADD_COLLECTION_STORAGE_KEY,
  QUICK_ADD_CONDITION_STORAGE_KEY,
  QUICK_ADD_FOIL_STORAGE_KEY,
  QUICK_ADD_LOCATION_STORAGE_KEY,
} from "@/lib/constants/storage-keys";
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants/timing";
import type { QuickAddPanelProps } from "@/lib/interfaces/cards";
import {
  CATALOG_SEARCH_MIN_QUERY_LENGTH,
  cardSearchResultKey,
  toCardCondition,
  type PlayingCard,
} from "@magic-vault/shared";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";

export function QuickAddPanel({
  initialCollectionGuid,
  initialLocationGuid,
  searchInputRef,
}: QuickAddPanelProps) {
  const { t } = useTranslation("cards");
  const { collections, activeCollection } = useCollections();
  const { isLocked: isStorageLocked } = useStorageAccess();
  const { locations } = useStorageLocations({ withList: !isStorageLocked });
  const [storedCollectionGuid, storeCollectionGuid] = usePersistedState(
    QUICK_ADD_COLLECTION_STORAGE_KEY,
    storedTextOrEmpty,
  );
  const [storedLocationGuid, storeLocationGuid] = usePersistedState(
    QUICK_ADD_LOCATION_STORAGE_KEY,
    storedLocationOrNone,
  );
  const [condition, setCondition] = usePersistedState(
    QUICK_ADD_CONDITION_STORAGE_KEY,
    toCardCondition,
  );
  const [isFoilByDefault, setFoilByDefault] = usePersistedFlag(
    QUICK_ADD_FOIL_STORAGE_KEY,
  );
  const [pickedCollectionGuid, setPickedCollectionGuid] = useState(
    initialCollectionGuid ?? storedCollectionGuid,
  );
  const [pickedLocationGuid, setPickedLocationGuid] = useState(
    initialLocationGuid ?? storedLocationGuid,
  );
  const [chosenLanguage, setChosenLanguage] = useState<string | null>(null);
  const collection =
    collections.find((c) => c.guid === pickedCollectionGuid) ??
    activeCollection ??
    collections[0];
  const location = isStorageLocked
    ? undefined
    : locations.find((l) => l.guid === pickedLocationGuid);
  const collectionLanguage = useCollectionCardSearchLanguage(collection?.guid);
  const language = chosenLanguage ?? collectionLanguage;

  const [line, setLine] = useState("");
  const [highlightedValue, setHighlightedValue] = useState("");
  const addsTopResultWhenSearchSettles = useRef(false);
  const syntaxHintId = useId();
  const debouncedLine = useDebouncedValue(line, SEARCH_DEBOUNCE_MS);
  const searchedLine = parseQuickAddLine(debouncedLine);
  const typedLine = parseQuickAddLine(line);
  const addsFoil = typedLine.isFoil || isFoilByDefault;
  const isSearchable =
    searchedLine.cardName.length >= CATALOG_SEARCH_MIN_QUERY_LENGTH;
  const { results, loading } = useCardSearch(
    searchedLine.cardName,
    collection?.guid,
    searchedLine.setCode,
    language,
  );
  const matchingResults = useMemo(
    () =>
      results.filter((card) =>
        matchesQuickAddCollectorNumber(card, searchedLine.collectorNumber),
      ),
    [results, searchedLine.collectorNumber],
  );
  const highlightedResultValue = matchingResults.some(
    (card) => cardSearchResultKey(card) === highlightedValue,
  )
    ? highlightedValue
    : matchingResults[0]
      ? cardSearchResultKey(matchingResults[0])
      : "";
  const searchHasSettled = debouncedLine === line && !loading;
  const { entries, announcement, addCards, undoEntry } = useQuickAddCards();

  const addResult = (card: PlayingCard) => {
    if (!collection) return;
    addsTopResultWhenSearchSettles.current = false;
    void addCards({
      collectionGuid: collection.guid,
      collectionName: collection.name,
      locationGuid: location?.guid,
      locationName: location?.name,
      card,
      quantity: typedLine.quantity,
      isFoil: addsFoil,
      condition,
    });
    setLine("");
    setHighlightedValue("");
    searchInputRef.current?.focus();
  };

  useEffect(() => {
    if (!addsTopResultWhenSearchSettles.current || !searchHasSettled) return;
    addsTopResultWhenSearchSettles.current = false;
    if (matchingResults[0]) addResult(matchingResults[0]);
  });

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    if (searchHasSettled) return;
    event.preventDefault();
    if (typedLine.cardName.length >= CATALOG_SEARCH_MIN_QUERY_LENGTH) {
      addsTopResultWhenSearchSettles.current = true;
    }
  };

  const emptyMessage = !isSearchable
    ? t("cardPicker.startTyping")
    : searchedLine.collectorNumber && results.length > 0
      ? t("quickAdd.noCollectorNumberMatch", {
          number: searchedLine.collectorNumber,
        })
      : t("cardPicker.noCardsFound");

  if (collections.length === 0) {
    return (
      <p className="text-sm text-foreground/70">{t("quickAdd.noCollections")}</p>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-h-0 flex-col gap-3">
        <QuickAddOptions
          collectionGuid={collection?.guid}
          onCollectionChange={(guid) => {
            setPickedCollectionGuid(guid);
            storeCollectionGuid(guid);
            setChosenLanguage(null);
          }}
          locationGuid={location?.guid ?? QUICK_ADD_NO_LOCATION}
          onLocationChange={(guid) => {
            setPickedLocationGuid(guid);
            storeLocationGuid(guid);
          }}
          showsLocations={!isStorageLocked}
          condition={condition}
          onConditionChange={setCondition}
          isFoilByDefault={isFoilByDefault}
          onFoilByDefaultChange={setFoilByDefault}
          language={language}
          onLanguageChange={setChosenLanguage}
        />
        <Command
          shouldFilter={false}
          label={t("quickAdd.searchLabel")}
          value={highlightedResultValue}
          onValueChange={setHighlightedValue}
          className="min-h-0 flex-1 rounded-lg bg-transparent p-0"
        >
          <CommandInput
            ref={searchInputRef}
            value={line}
            onValueChange={(next) => {
              addsTopResultWhenSearchSettles.current = false;
              setHighlightedValue("");
              setLine(next);
            }}
            onKeyDown={handleSearchKeyDown}
            placeholder={t("quickAdd.placeholder")}
            aria-describedby={syntaxHintId}
          />
          <p id={syntaxHintId} className="px-1 pt-2 text-xs text-foreground/70">
            {t("quickAdd.syntaxHint")}
          </p>
          <CommandList className="mt-2 max-h-[50dvh] min-h-64">
            {loading &&
              Array.from({ length: SEARCH_RESULT_SKELETON_ROWS }, (_, index) => (
                <div key={index} className="flex items-center gap-2 px-2 py-1.5">
                  <Skeleton className="aspect-[2.5/3.5] w-7" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            {!loading && matchingResults.length === 0 && (
              <p className="py-6 text-center text-sm text-foreground/70">
                {emptyMessage}
              </p>
            )}
            {!loading &&
              matchingResults.map((card) => (
                <QuickAddResultItem
                  key={cardSearchResultKey(card)}
                  card={card}
                  isFoil={addsFoil}
                  onSelect={() => addResult(card)}
                />
              ))}
          </CommandList>
        </Command>
      </div>
      <QuickAddLog entries={entries} onUndo={(entry) => void undoEntry(entry)} />
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
