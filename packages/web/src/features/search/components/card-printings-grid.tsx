import { LoadErrorCallout } from "@/components/load-error-callout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cardPrintingsQueryOptions } from "@/features/search/api/global-search";
import { CardPrintingTile } from "@/features/search/components/card-printing-tile";
import {
  CARD_PRINTINGS_GRID_CLASS,
  CARD_PRINTINGS_SKELETON_TILES,
} from "@/lib/constants/search";
import { catalogPrintingLabel } from "@magic-vault/shared";
import type { CardPrintingsGridProps } from "@/lib/interfaces/search";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function CardPrintingsGrid({ game, openedCardId, selectedCardId, onSelect }: CardPrintingsGridProps) {
  const { t } = useTranslation("search");
  const headingId = useId();
  const [hasChosenPrinting, setHasChosenPrinting] = useState(false);
  const printingsQuery = useInfiniteQuery(cardPrintingsQueryOptions(game, openedCardId));
  const printings = printingsQuery.data?.pages.flatMap((page) => page.cards) ?? [];
  const totalCount = printingsQuery.data?.pages[0]?.totalCount ?? 0;
  const selectedPrinting = printings.find((printing) => printing.id === selectedCardId);

  if (printingsQuery.isSuccess && totalCount <= 1) return null;

  return (
    <section aria-labelledby={headingId} aria-busy={printingsQuery.isPending} className="flex flex-col gap-2">
      <h2 id={headingId} className="font-heading text-base font-semibold text-foreground md:text-sm">
        {printingsQuery.isSuccess ? t("printings.titleWithCount", { count: totalCount }) : t("printings.title")}
      </h2>
      <p role="status" className="sr-only">
        {hasChosenPrinting && selectedPrinting
          ? t("printings.selected", { printing: catalogPrintingLabel(selectedPrinting) })
          : ""}
      </p>
      {printingsQuery.isError ? (
        <LoadErrorCallout message={t("printings.loadFailed")} onRetry={() => void printingsQuery.refetch()} />
      ) : printingsQuery.isPending ? (
        <div className={CARD_PRINTINGS_GRID_CLASS} aria-hidden="true">
          {Array.from({ length: CARD_PRINTINGS_SKELETON_TILES }).map((_, index) => (
            <div key={index} className="flex flex-col gap-1.5 p-1.5 md:gap-1 md:p-1">
              <Skeleton className="aspect-[2.5/3.5] w-full rounded-md" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <ul className={CARD_PRINTINGS_GRID_CLASS}>
            {printings.map((printing) => (
              <CardPrintingTile
                key={printing.id}
                printing={printing}
                isSelected={printing.id === selectedCardId}
                onSelect={(printing) => {
                  setHasChosenPrinting(true);
                  onSelect(printing);
                }}
              />
            ))}
          </ul>
          {printingsQuery.hasNextPage && (
            <Button
              variant="outline"
              className="self-center"
              disabled={printingsQuery.isFetchingNextPage}
              onClick={() => void printingsQuery.fetchNextPage()}
            >
              {t("printings.showMore")}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
