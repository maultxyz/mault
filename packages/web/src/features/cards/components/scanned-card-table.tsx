import { FoilOverlay } from "@/components/foil-overlay";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BinLocationDiagram } from "@/features/bins/components/bin-location-diagram";
import { reviewTooltip } from "@/features/cards/lib/review-tooltip";
import { RARITY_LABELS } from "@/lib/constants/rarity";
import { usePriceSource } from "@/hooks/use-price-source";
import type { ScannedCardTableProps } from "@/lib/interfaces/cards";
import { cn, matchPercent as getMatchPercent } from "@/lib/utils";
import {
  IconDownload,
  IconHelpCircle,
  IconSparkles,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScannedCardTable({
  rows,
  showQuantity = false,
  showBinLocation = true,
  onOpen,
  onToggleSelect,
  onTogglePageSelect,
}: ScannedCardTableProps) {
  const { t } = useTranslation("cards");
  const { priceOf, format } = usePriceSource();
  const selectable = !!onToggleSelect;
  const selectedCount = rows.filter((row) => row.isSelected).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;
  const someSelected = selectedCount > 0 && !allSelected;

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {selectable && (
            <TableHead className="w-8">
              {onTogglePageSelect && (
                <Checkbox
                  aria-label={t("scannedCardTable.selectPage")}
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={onTogglePageSelect}
                />
              )}
            </TableHead>
          )}
          <TableHead className="w-10">
            <span className="sr-only">{t("scannedCardTable.image")}</span>
          </TableHead>
          <TableHead>{t("scannedCardTable.name")}</TableHead>
          <TableHead className="hidden sm:table-cell">
            {t("scannedCardTable.set")}
          </TableHead>
          <TableHead className="hidden md:table-cell">
            {t("scannedCardTable.rarity")}
          </TableHead>
          {showQuantity && (
            <TableHead className="text-right">
              {t("scannedCardTable.quantity")}
            </TableHead>
          )}
          <TableHead className="text-right">
            {t("scannedCardTable.match")}
          </TableHead>
          <TableHead>{t("scannedCardTable.bin")}</TableHead>
          <TableHead className="text-right">
            {t("scannedCardTable.price")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const { card } = row;
          const matchPercent =
            card.distance != null ? getMatchPercent(card) : 0;
          const displayPrice = priceOf(card, row.isFoil);
          const rarityLabel =
            RARITY_LABELS[card.rarity] ??
            card.rarity.charAt(0).toUpperCase() + card.rarity.slice(1);

          return (
            <TableRow
              key={row.scanId}
              data-state={row.isSelected ? "selected" : undefined}
              onClick={onOpen ? () => onOpen(row) : undefined}
              className={cn(onOpen && "cursor-pointer")}
            >
              {onToggleSelect && (
                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => {
                    if (e.shiftKey) e.preventDefault();
                  }}
                >
                  <Checkbox
                    aria-label={t("scannedCardTable.selectRow", {
                      name: card.name,
                    })}
                    checked={!!row.isSelected}
                    onCheckedChange={(_, details) =>
                      onToggleSelect(row, {
                        shiftKey:
                          "shiftKey" in details.event &&
                          details.event.shiftKey === true,
                      })
                    }
                  />
                </TableCell>
              )}
              <TableCell>
                <div className="relative h-10 aspect-[2.5/3.5] overflow-hidden rounded-sm">
                  <img
                    src={card.image?.normal || ""}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {row.isFoil && <FoilOverlay />}
                </div>
              </TableCell>
              <TableCell className="max-w-64">
                <div className="flex min-w-0 items-center gap-1.5">
                  {onOpen ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(row);
                      }}
                      className="truncate text-left font-medium hover:underline focus-visible:underline outline-none"
                    >
                      {card.name}
                    </button>
                  ) : (
                    <span className="truncate font-medium">{card.name}</span>
                  )}
                  {(row.hasAlternatives || row.needsReview) && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full p-0.5",
                        row.wasCorrected ? "bg-success-strong" : "bg-warning-strong",
                      )}
                      title={reviewTooltip(
                        t,
                        !!row.needsReview,
                        !!row.wasCorrected,
                      )}
                    >
                      <IconHelpCircle className="size-3 text-white" />
                    </span>
                  )}
                  {row.isFoil && (
                    <span
                      className="shrink-0 rounded-full p-0.5 bg-gradient-to-br from-fuchsia-400 via-cyan-400 to-amber-300"
                      title={row.foilType ?? t("foil")}
                    >
                      <IconSparkles className="size-3 text-white" />
                    </span>
                  )}
                  {row.isDownloaded && (
                    <span className="shrink-0" title={t("downloaded")}>
                      <IconDownload className="size-3.5 text-foreground/70" />
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell
                className="hidden sm:table-cell text-xs text-foreground/70"
                title={card.setName}
              >
                <span className="uppercase">{card.set}</span> #
                {card.collectorNumber}
              </TableCell>
              <TableCell className="hidden md:table-cell text-xs">
                <div className="flex items-center gap-1.5">
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--${card.rarity})` }}
                  />
                  <span className="text-foreground/70">{rarityLabel}</span>
                </div>
              </TableCell>
              {showQuantity && (
                <TableCell className="text-right text-xs tabular-nums">
                  {row.quantity}
                </TableCell>
              )}
              <TableCell className="text-right">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Badge
                        variant={matchPercent >= 80 ? "default" : "destructive"}
                        className={cn(
                          "tabular-nums",
                          matchPercent < 80 && "bg-destructive text-white",
                        )}
                      >
                        {matchPercent.toFixed(2)}%
                      </Badge>
                    }
                  />
                  <TooltipContent>
                    {t("scannedCardItem.matchTooltip")}
                  </TooltipContent>
                </Tooltip>
              </TableCell>
              <TableCell>
                {row.binNumber != null && !showBinLocation && (
                  <Badge variant="secondary">
                    {t("scannedCardItem.bin", { number: row.binNumber })}
                  </Badge>
                )}
                {row.binNumber != null && showBinLocation && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Badge variant="secondary">
                          {t("scannedCardItem.bin", { number: row.binNumber })}
                        </Badge>
                      }
                    />
                    <TooltipContent side="top" className="p-0">
                      <BinLocationDiagram binNumber={row.binNumber} />
                    </TooltipContent>
                  </Tooltip>
                )}
              </TableCell>
              <TableCell className="text-right text-xs font-medium tabular-nums">
                {displayPrice != null ? format(displayPrice) : "-"}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
