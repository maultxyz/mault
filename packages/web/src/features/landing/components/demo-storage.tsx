import { FoilOverlay } from "@/components/foil-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEMO_STORAGE_ENTRIES,
  searchDemoStorage,
} from "@/features/landing/lib/demo-storage-entries";
import { useTypewriter } from "@/hooks/use-typewriter";
import {
  DEMO_STORAGE_LOCATIONS,
  DEMO_STORAGE_SEARCH,
  DEMO_STORAGE_TYPING_DELAY_MS,
} from "@/lib/constants/landing";
import type {
  DemoStorageTableProps,
  FeatureSpotlightDemoProps,
} from "@/lib/interfaces/landing";
import { formatPrice } from "@magic-vault/shared";
import { IconBox } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

function DemoStorageTable({
  entries,
  showsLocation,
  onOpenLocation,
}: DemoStorageTableProps) {
  const { t } = useTranslation("storage");

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {showsLocation ? (
              <TableHead className="w-px">{t("cards.columns.location")}</TableHead>
            ) : (
              <TableHead className="w-12 text-right">
                {t("cards.columns.position")}
              </TableHead>
            )}
            <TableHead className="w-10">
              <span className="sr-only">{t("cards.columns.image")}</span>
            </TableHead>
            <TableHead>{t("cards.columns.name")}</TableHead>
            <TableHead className="text-right">
              {t("cards.columns.priceNow")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => {
            const price =
              (entry.isFoil ? entry.card.priceFoil : entry.card.price) ??
              entry.card.price;
            return (
              <TableRow
                key={`${entry.locationGuid}-${entry.position}`}
                className="animate-in fade-in duration-300 motion-reduce:animate-none"
              >
                {showsLocation ? (
                  <TableCell>
                    <Button
                      variant="outline"
                      className="max-w-28 sm:max-w-40"
                      title={t("search.openLocation")}
                      onClick={() => onOpenLocation(entry.locationGuid)}
                    >
                      <IconBox />
                      <span className="truncate">
                        {t("cardLocation.value", {
                          name: entry.locationName,
                          position: entry.position,
                        })}
                      </span>
                    </Button>
                  </TableCell>
                ) : (
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-foreground/70">
                    {t("cards.position", { position: entry.position })}
                  </TableCell>
                )}
                <TableCell>
                  <div className="relative aspect-[2.5/3.5] w-8 overflow-hidden rounded-md bg-muted">
                    <img
                      src={entry.card.image?.small ?? ""}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                    />
                    {entry.isFoil && <FoilOverlay />}
                  </div>
                </TableCell>
                <TableCell className="w-full max-w-0 truncate font-medium">
                  {entry.card.name}
                </TableCell>
                <TableCell className="text-right text-xs tabular-nums">
                  {price != null ? formatPrice(price, "tcgplayer") : "-"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function DemoStorage({ isRevealed }: FeatureSpotlightDemoProps) {
  const { t } = useTranslation("storage");
  const [selectedGuid, setSelectedGuid] = useState(
    DEMO_STORAGE_LOCATIONS[0].guid,
  );
  const [userQuery, setUserQuery] = useState<string | null>(null);
  const [hasTypingDelayPassed, setHasTypingDelayPassed] = useState(false);
  const autoTypedQuery = useTypewriter(
    DEMO_STORAGE_SEARCH,
    isRevealed && hasTypingDelayPassed && userQuery === null,
  );

  useEffect(() => {
    if (!isRevealed) return;
    const timeoutId = window.setTimeout(
      () => setHasTypingDelayPassed(true),
      DEMO_STORAGE_TYPING_DELAY_MS,
    );
    return () => window.clearTimeout(timeoutId);
  }, [isRevealed]);

  const searchQuery = userQuery ?? autoTypedQuery;
  const isSearching = searchQuery.trim().length > 0;
  const searchResults = isSearching ? searchDemoStorage(searchQuery) : [];
  const selectedLocation =
    DEMO_STORAGE_LOCATIONS.find((location) => location.guid === selectedGuid) ??
    DEMO_STORAGE_LOCATIONS[0];
  const selectedEntries = DEMO_STORAGE_ENTRIES.filter(
    (entry) => entry.locationGuid === selectedLocation.guid,
  );

  const openLocation = (locationGuid: string) => {
    setUserQuery("");
    setSelectedGuid(locationGuid);
  };

  return (
    <div className="grid w-full overflow-hidden rounded-lg border bg-background text-left md:grid-cols-[minmax(16rem,1fr)_minmax(0,2fr)]">
      <div className="flex flex-col gap-2 border-b bg-sidebar/70 p-2 md:border-r md:border-b-0">
        <Input
          type="search"
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
          value={searchQuery}
          onChange={(event) => setUserQuery(event.target.value)}
        />
        <div className="flex flex-col gap-2">
          {DEMO_STORAGE_LOCATIONS.map((location) => (
            <Button
              key={location.guid}
              variant={
                !isSearching && location.guid === selectedLocation.guid
                  ? "secondary"
                  : "ghost"
              }
              className="h-auto w-full flex-col items-start justify-start gap-0.5 p-2 text-start max-md:h-auto max-md:px-2"
              onClick={() => openLocation(location.guid)}
            >
              <p className="w-full truncate font-heading text-sm font-medium">
                {location.name}
              </p>
              <div className="flex w-full items-center justify-between gap-2 text-xs tabular-nums text-foreground/70">
                <span>
                  {t("page.cardCount", { count: location.cardCount })}
                </span>
                <span>{formatPrice(location.totalValue, "tcgplayer")}</span>
              </div>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex min-h-72 min-w-0 flex-col gap-3 p-3">
        {isSearching ? (
          <>
            <p className="text-xs text-foreground/70">
              {searchResults.length > 0
                ? t("search.count", { count: searchResults.length })
                : t("search.emptyDescription", { query: searchQuery.trim() })}
            </p>
            {searchResults.length > 0 && (
              <DemoStorageTable
                entries={searchResults}
                showsLocation
                onOpenLocation={openLocation}
              />
            )}
          </>
        ) : (
          <>
            <div className="min-w-0 border-b pb-2">
              <p className="truncate font-heading text-lg font-semibold">
                {selectedLocation.name}
              </p>
              <p className="text-xs tabular-nums text-foreground/70">
                {t("page.summary", {
                  count: selectedLocation.cardCount,
                  value: formatPrice(selectedLocation.totalValue, "tcgplayer"),
                })}
              </p>
            </div>
            <DemoStorageTable
              entries={selectedEntries}
              showsLocation={false}
              onOpenLocation={openLocation}
            />
          </>
        )}
      </div>
    </div>
  );
}
