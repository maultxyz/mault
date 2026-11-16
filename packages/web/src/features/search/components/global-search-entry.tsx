import { HotkeyHint } from "@/components/hotkey-hint";
import { GLOBAL_SEARCH_ARIA_KEY_SHORTCUTS, SEARCH_ENTRY_CLASS } from "@/lib/constants/search";
import { openGlobalSearch } from "@/lib/global-search-store";
import type { GlobalSearchEntryProps } from "@/lib/interfaces/search";
import { cn } from "@/lib/utils";
import { IconSearch } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function GlobalSearchEntry({ className }: GlobalSearchEntryProps) {
  const { t } = useTranslation("search");
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-keyshortcuts={GLOBAL_SEARCH_ARIA_KEY_SHORTCUTS}
      onClick={() => openGlobalSearch()}
      className={cn(SEARCH_ENTRY_CLASS, className)}
    >
      <IconSearch className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-left">{t("placeholder")}</span>
      <span className="max-md:hidden">
        <HotkeyHint id="openGlobalSearch" />
      </span>
    </button>
  );
}
