import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Switch } from "@/components/ui/switch";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import {
  exportToCardKingdom,
  exportToCsv,
  exportToManabox,
  exportToMoxfield,
  exportToTcgplayer,
} from "@/features/cards/lib/export-formats";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  formatElapsed,
  formatUsd,
} from "@/features/scanner/components/scan-stats";
import { computeStats } from "@/features/scanner/lib/compute-stats";
import type { ScannedCard } from "@magic-vault/shared";
import { IconChevronDown, IconDownload } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface ExportOption {
  key: string;
  label: string;
  fn: (cards: ScannedCard[], collection: string) => void;
}

interface SessionSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cards: ScannedCard[];
  elapsedMs: number;
  collectionName: string;
  onMarkDownloaded: (scanIds: string[]) => void;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
        {label}
      </p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

export function SessionSummaryDialog({
  open,
  onOpenChange,
  cards,
  elapsedMs,
  collectionName,
  onMarkDownloaded,
}: SessionSummaryDialogProps) {
  const { t } = useTranslation("cards");
  const [includeDownloaded, setIncludeDownloaded] = useState(false);
  const previouslyDownloadedCount = useMemo(
    () => cards.filter((c) => c.isDownloaded).length,
    [cards],
  );
  const exportCards = useMemo(
    () => (includeDownloaded ? cards : cards.filter((c) => !c.isDownloaded)),
    [cards, includeDownloaded],
  );
  const stats = useMemo(() => computeStats(cards), [cards]);
  const slug = collectionName.replace(/\s+/g, "-").toLowerCase();
  const { activeCollection } = useCollections();
  const { fieldDefinitions } = useBinConfigs();

  const isMtg = activeCollection?.game?.key === "mtg";
  const exportOptions: ExportOption[] = isMtg
    ? [
        { key: "manabox", label: "Manabox", fn: exportToManabox },
        { key: "moxfield", label: "Moxfield", fn: exportToMoxfield },
        { key: "tcgplayer", label: "TCGPlayer", fn: exportToTcgplayer },
        {
          key: "cardkingdom",
          label: "Card Kingdom Buylist",
          fn: exportToCardKingdom,
        },
      ]
    : [
        { key: "tcgplayer", label: "TCGPlayer", fn: exportToTcgplayer },
        {
          key: "csv",
          label: "CSV",
          fn: (c, collection) => exportToCsv(c, collection, fieldDefinitions),
        },
      ];

  const cardsPerHour =
    elapsedMs > 0 ? Math.round((cards.length / elapsedMs) * 3_600_000) : null;

  const summaryCells: { label: string; value: string }[] = [
    { label: t("sessionSummaryDialog.totalCards"), value: String(cards.length) },
    { label: t("sessionSummaryDialog.unique"), value: stats ? String(stats.uniqueCount) : "-" },
  ];
  if (stats?.hasPricing) {
    summaryCells.push(
      { label: t("sessionSummaryDialog.totalValue"), value: formatUsd(stats.totalValue) },
      { label: t("sessionSummaryDialog.avgValue"), value: formatUsd(stats.avgValue) },
    );
  }
  summaryCells.push(
    { label: t("sessionSummaryDialog.duration"), value: formatElapsed(elapsedMs) },
    {
      label: t("sessionSummaryDialog.cardsPerHour"),
      value: cardsPerHour != null ? String(cardsPerHour) : "-",
    },
  );

  function handleDownload(option: ExportOption) {
    option.fn(exportCards, slug);
    onMarkDownloaded(exportCards.map((c) => c.scanId));
    onOpenChange(false);
  }

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-md"
      title={t("sessionSummaryDialog.title")}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("sessionSummaryDialog.close")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button disabled={exportCards.length === 0} />}
            >
              <IconDownload className="size-4" />
              {t("sessionSummaryDialog.download", {
                count: exportCards.length,
              })}
              <IconChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {exportOptions.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() => handleDownload(option)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border bg-input/20 dark:bg-input/30 divide-y divide-border">
            <div className="grid grid-cols-3 divide-x divide-y divide-border">
              {summaryCells.map((cell) => (
                <StatCell
                  key={cell.label}
                  label={cell.label}
                  value={cell.value}
                />
              ))}
            </div>
            {stats?.mostValuable && (
              <div className="px-2.5 py-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide shrink-0">
                  {t("sessionSummaryDialog.mostValuable")}
                </p>
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {stats.mostValuable.name}
                  </p>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {formatUsd(stats.mostValuable.price)}
                  </p>
                </div>
              </div>
            )}
          </div>
          {stats && (
            <div
              className={
                stats.rarities.length > 0
                  ? "grid grid-cols-2 gap-3"
                  : "grid grid-cols-1 gap-3"
              }
            >
              {stats.rarities.length > 0 && (
                <div className="rounded-lg border bg-input/20 dark:bg-input/30 p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    {t("sessionSummaryDialog.byRarity")}
                  </p>
                  <div className="flex flex-col gap-1">
                    {stats.rarities.map((r) => (
                      <div
                        key={r.key}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <div
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: `var(--${r.key})` }}
                          />
                          <span>{r.label}</span>
                        </div>
                        <span className="text-muted-foreground">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="rounded-lg border bg-input/20 dark:bg-input/30 p-2.5">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                  {t("sessionSummaryDialog.topSets")}
                </p>
                <div className="flex flex-col gap-1">
                  {stats.sets.slice(0, 5).map((s) => (
                    <div
                      key={s.code}
                      className="flex items-center justify-between text-xs gap-1"
                    >
                      <span
                        className="truncate text-muted-foreground"
                        title={s.name}
                      >
                        {s.name}
                      </span>
                      <span className="shrink-0">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {previouslyDownloadedCount > 0 && (
            <label className="flex items-center justify-between gap-1.5 text-sm text-muted-foreground">
              {t("sessionSummaryDialog.includePreviouslyDownloaded")}
              <Switch
                size="sm"
                checked={includeDownloaded}
                onCheckedChange={setIncludeDownloaded}
              />
            </label>
          )}
        </div>
    </DynamicDialog>
  );
}
