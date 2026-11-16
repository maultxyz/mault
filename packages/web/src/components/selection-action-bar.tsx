import { Button } from "@/components/ui/button";
import { SELECTION_ACTION_BAR_BUTTON_CLASS } from "@/lib/constants/card-grid";
import type { SelectionActionBarProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function SelectionActionBar({
  selectedCount,
  selectionLabel,
  onClear,
  children,
  className,
}: SelectionActionBarProps) {
  const { t } = useTranslation("cards");

  return (
    <div
      className={cn(
        "sticky bottom-4 z-50 mx-auto mb-4 flex w-fit max-w-full shrink-0 items-center gap-3 rounded-lg bg-foreground py-1.5 pr-1.5 pl-3 text-xs text-background shadow-popover ring-1 ring-border animate-in fade-in-0 slide-in-from-bottom-4 duration-150 motion-reduce:animate-none",
        className,
      )}
    >
      <span role="status" className="shrink-0 font-medium">
        {selectionLabel ?? t("cardGrid.cardsSelected", { count: selectedCount })}
      </span>
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant="ghost"
          className={SELECTION_ACTION_BAR_BUTTON_CLASS}
          onClick={onClear}
        >
          {t("cardGrid.clear")}
        </Button>
        {children}
      </div>
    </div>
  );
}
