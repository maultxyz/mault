import { Kbd } from "@/components/ui/kbd";
import { SEARCH_ENTRY_CLASS, SEARCH_PATH } from "@/lib/constants/search";
import type { GlobalSearchEntryProps } from "@/lib/interfaces/search";
import { cn } from "@/lib/utils";
import { IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export function GlobalSearchEntry({ className }: GlobalSearchEntryProps) {
  const { t } = useTranslation("search");
  return (
    <Link to={SEARCH_PATH} aria-keyshortcuts="/" className={cn(SEARCH_ENTRY_CLASS, className)}>
      <IconSearch className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{t("placeholder")}</span>
      <span className="max-md:hidden" aria-hidden="true">
        <Kbd>/</Kbd>
      </span>
    </Link>
  );
}
