import { CompactPrice } from "@/components/compact-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StorageLocationActionsMenu } from "@/features/storage/components/storage-location-actions-menu";
import { useShiftClick } from "@/hooks/use-shift-click";
import { modifierClickSelectHandlers } from "@/lib/modifier-click-select";
import type { StorageLocationRowProps } from "@/lib/interfaces/storage";
import { cn } from "@/lib/utils";
import { storageLocationFillText } from "@/features/storage/lib/storage-location-fill";
import { useTranslation } from "react-i18next";

export function StorageLocationRow({
  location,
  isSelected,
  onSelect,
  actions,
  isChecked = false,
  onToggleChecked,
  planCount = 0,
}: StorageLocationRowProps) {
  const { t } = useTranslation("storage");
  const { onMouseDown: onCheckboxMouseDown, consumeShift } = useShiftClick();

  return (
    <div
      role="presentation"
      className="relative flex items-center gap-1"
      {...modifierClickSelectHandlers(onToggleChecked)}
    >
      {onToggleChecked && (
        <span
          role="presentation"
          className="flex shrink-0 items-center pl-1.5"
          onMouseDown={onCheckboxMouseDown}
        >
          <Checkbox
            checked={isChecked}
            aria-label={t("bulk.select", { name: location.name })}
            onCheckedChange={() => onToggleChecked(consumeShift())}
          />
        </span>
      )}
      <Button
        variant={isSelected || isChecked ? "selected" : "ghost"}
        aria-current={isSelected || undefined}
        className={cn(
          "h-auto min-w-0 flex-1 flex-col items-start justify-start gap-0.5 p-2 text-start",
          actions && "pr-9",
        )}
        onClick={onSelect}
      >
        <div className="flex w-full min-w-0 items-center gap-1.5">
          <p className="min-w-0 truncate text-sm font-medium">
            {location.name}
          </p>
          {planCount > 0 && (
            <Badge variant="outline">
              {t("planUses.rowBadge", { count: planCount })}
            </Badge>
          )}
        </div>
        <div className="flex w-full items-center justify-between gap-2 text-xs tabular-nums text-foreground/70">
          <span>
            {storageLocationFillText(location, t) ??
              t("page.cardCount", { count: location.cardCount })}
          </span>
          <CompactPrice value={location.totalValue} />
        </div>
      </Button>
      {actions && (
        <StorageLocationActionsMenu
          location={location}
          disabled={actions.disabled}
          className="absolute top-1 right-1"
          onShare={actions.onShare}
          onRename={actions.onRename}
          onDelete={actions.onDelete}
        />
      )}
    </div>
  );
}
