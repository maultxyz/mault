import { Button } from "@/components/ui/button";
import { usePriceSource } from "@/hooks/use-price-source";
import type { StorageLocationRowProps } from "@/lib/interfaces/storage";
import { useTranslation } from "react-i18next";

export function StorageLocationRow({
  location,
  isSelected,
  onSelect,
}: StorageLocationRowProps) {
  const { t } = useTranslation("storage");
  const { format } = usePriceSource();

  return (
    <Button
      variant={isSelected ? "secondary" : "ghost"}
      className="h-auto w-full flex-col items-start justify-start gap-0.5 p-2 text-start"
      onClick={onSelect}
    >
      <p className="w-full truncate font-heading text-sm font-medium">
        {location.name}
      </p>
      <div className="flex w-full items-center justify-between gap-2 text-xs tabular-nums text-foreground/70">
        <span>{t("page.cardCount", { count: location.cardCount })}</span>
        <span>{format(location.totalValue)}</span>
      </div>
    </Button>
  );
}
