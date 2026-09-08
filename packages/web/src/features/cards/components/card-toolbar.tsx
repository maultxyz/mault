import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Input } from "@/components/ui/input";
import { DynamicPopover } from "@/components/ui/responsive-popover";
import { WatcherStack } from "@/components/ui/watcher-stack";
import { CardFilterPopover } from "@/features/cards/components/card-filter-popover";
import type { CardToolbarProps } from "@/features/cards/types";
import { cn } from "@/lib/utils";
import type { FieldMeta } from "@magic-vault/shared";
import {
  IconArrowsSort,
  IconCheck,
  IconCheckbox,
  IconDownload,
  IconTrash,
} from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";

function sortLabels(
  type: FieldMeta["type"],
  t: TFunction<"cards">,
): [asc: string, desc: string] {
  return type === "string"
    ? [t("cardToolbar.sortAscString"), t("cardToolbar.sortDescString")]
    : [t("cardToolbar.sortAscDefault"), t("cardToolbar.sortDescDefault")];
}

function sortValueLabel(
  sortKey: string | null,
  sortableFields: FieldMeta[],
  t: TFunction<"cards">,
): string {
  if (!sortKey || sortKey === "scan-desc") return t("cardToolbar.scanOrder");
  const i = sortKey.lastIndexOf("-");
  const field = sortKey.slice(0, i);
  const dir = sortKey.slice(i + 1);
  const meta = sortableFields.find((f) => f.field === field);
  if (!meta) return "";
  const [asc, desc] = sortLabels(meta.type, t);
  return `${meta.label} (${dir === "asc" ? asc : desc})`;
}

function SortOption({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-left transition-colors",
        active ? "bg-primary/15 font-medium" : "hover:bg-muted",
      )}
    >
      <span>{label}</span>
      {active && <IconCheck className="size-3.5 shrink-0" />}
    </button>
  );
}

export function CardToolbar({
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  sortableFields,
  onExport,
  onClearAll,
  hasCards,
  activeFilters,
  onFiltersChange,
  activeFilterCount,
  watchers,
  allSelected,
  onToggleSelectAll,
  availableRarities,
  availableColors,
  cardCount,
}: CardToolbarProps) {
  const { t } = useTranslation("cards");
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  const handleClear = () => {
    onClearAll?.();
  };

  return (
    <div className="flex flex-row gap-2 items-center w-full">
      {watchers && watchers.length > 0 && <WatcherStack watchers={watchers} />}
      <Input
        placeholder={t("cardToolbar.searchPlaceholder")}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1 min-w-0"
      />
      <DynamicPopover
        trigger={
          <Button
            variant={
              sortKey && sortKey !== "scan-desc" ? "secondary" : "outline"
            }
            size="icon"
            className="shrink-0"
            title={sortValueLabel(sortKey, sortableFields, t)}
          >
            <IconArrowsSort className="size-4" />
          </Button>
        }
        side="bottom"
        align="end"
      >
        <div className="flex flex-col gap-0.5 min-w-40">
          <SortOption
            label={t("cardToolbar.scanOrder")}
            active={!sortKey || sortKey === "scan-desc"}
            onSelect={() => onSortChange("scan-desc")}
          />
          {sortableFields.map((field) => {
            const [asc, desc] = sortLabels(field.type, t);
            return (
              <Fragment key={field.field}>
                <SortOption
                  label={`${field.label} (${asc})`}
                  active={sortKey === `${field.field}-asc`}
                  onSelect={() => onSortChange(`${field.field}-asc`)}
                />
                <SortOption
                  label={`${field.label} (${desc})`}
                  active={sortKey === `${field.field}-desc`}
                  onSelect={() => onSortChange(`${field.field}-desc`)}
                />
              </Fragment>
            );
          })}
        </div>
      </DynamicPopover>
      <CardFilterPopover
        activeFilters={activeFilters}
        onFiltersChange={onFiltersChange}
        activeFilterCount={activeFilterCount}
        availableRarities={availableRarities ?? []}
        availableColors={availableColors ?? []}
      />
      {onToggleSelectAll && (
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleSelectAll}
          disabled={!hasCards}
          className="shrink-0"
          title={
            allSelected
              ? t("cardToolbar.deselectAll")
              : t("cardToolbar.selectAll")
          }
        >
          <IconCheckbox className="size-4" />
        </Button>
      )}
      {(onExport || onClearAll) && (
        <ButtonGroup>
          <Button
            variant="outline"
            size="icon"
            onClick={onExport}
            disabled={!hasCards}
            className="shrink-0"
            title={t("cardToolbar.sessionSummaryExport")}
            data-tour="export-collection"
          >
            <IconDownload className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setClearAllDialogOpen(true)}
            disabled={!hasCards}
            className="shrink-0"
            title={t("cardToolbar.clearAllCardsTitle")}
          >
            <IconTrash className="size-4" />
          </Button>
        </ButtonGroup>
      )}
      <DeleteDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
        title={t("cardToolbar.deleteScannedCardsTitle")}
        description={t("cardToolbar.deleteScannedCardsDescription")}
        confirm={cardCount > 100 ? { type: "keyword" } : { type: "simple" }}
        confirmLabel={t("cardToolbar.clearAll")}
        onConfirm={handleClear}
      />
    </div>
  );
}
