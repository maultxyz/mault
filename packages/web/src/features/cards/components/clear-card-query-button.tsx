import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ClearCardQueryButtonProps } from "@/lib/interfaces/cards";
import { IconFilterOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ClearCardQueryButton({
  searchQuery,
  activeFilterCount,
  onClear,
  className,
}: ClearCardQueryButtonProps) {
  const { t } = useTranslation("cards");
  const hasQuery = !!searchQuery.trim() || activeFilterCount > 0;
  const label = t("cardToolbar.clearSearchAndFilters");

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("shrink-0", className)}
      aria-label={label}
      title={label}
      disabled={!hasQuery}
      onClick={onClear}
    >
      <IconFilterOff />
    </Button>
  );
}
