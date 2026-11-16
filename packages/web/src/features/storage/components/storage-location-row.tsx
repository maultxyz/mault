import { CompactPrice } from "@/components/compact-value";
import { Button } from "@/components/ui/button";
import { StorageLocationActionsMenu } from "@/features/storage/components/storage-location-actions-menu";
import type { StorageLocationRowProps } from "@/lib/interfaces/storage";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function StorageLocationRow({
  location,
  isSelected,
  onSelect,
  actions,
}: StorageLocationRowProps) {
  const { t } = useTranslation("storage");

  return (
    <div className="relative">
      <Button
        variant={isSelected ? "selected" : "ghost"}
        aria-current={isSelected || undefined}
        className={cn(
          "h-auto w-full flex-col items-start justify-start gap-0.5 p-2 text-start",
          actions && "pr-9",
        )}
        onClick={onSelect}
      >
        <p className="w-full truncate text-sm font-medium">
          {location.name}
        </p>
        <div className="flex w-full items-center justify-between gap-2 text-xs tabular-nums text-foreground/70">
          <span>{t("page.cardCount", { count: location.cardCount })}</span>
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
