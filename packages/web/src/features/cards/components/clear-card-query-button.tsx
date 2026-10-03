import { Button } from "@/components/ui/button";
import type { ClearCardQueryButtonProps } from "@/lib/interfaces/cards";
import { IconFilterOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ClearCardQueryButton({
  searchQuery,
  activeFilterCount,
  onClear,
}: ClearCardQueryButtonProps) {
  const { t } = useTranslation("cards");
  if (!searchQuery.trim() && activeFilterCount === 0) return null;
  const label = t("cardToolbar.clearSearchAndFilters");

  return (
    <Button
      variant="outline"
      size="icon"
      className="shrink-0"
      aria-label={label}
      title={label}
      onClick={onClear}
    >
      <IconFilterOff />
    </Button>
  );
}
