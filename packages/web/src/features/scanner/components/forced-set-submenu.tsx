import { ListSkeleton } from "@/components/list-skeleton";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cardSetsQueryOptions } from "@/features/cards/api/card-sets";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { ScanOptionsSubmenuTrigger } from "@/features/scanner/components/scan-options-submenu-trigger";
import {
  CARD_SET_PICKER_LIMIT,
  SET_SEARCH_MENU_NAVIGATION_KEYS,
} from "@/lib/constants/scanner";
import type { ForcedSetSubmenuProps } from "@/lib/interfaces/scanner";
import { forcedSetSummary } from "@/features/scanner/lib/forced-set-summary";
import { IconStack3 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function ForcedSetSubmenu({ open, onOpenChange }: ForcedSetSubmenuProps) {
  const { t } = useTranslation("scanner");
  const { forceSetCodes, setForceSetCodes } = useScannedCards();
  const { activeCollection } = useCollections();
  const [query, setQuery] = useState("");
  const { data: sets = [], isLoading } = useQuery({
    ...cardSetsQueryOptions(activeCollection?.guid),
    enabled: !!activeCollection?.guid && open,
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? sets.filter(
          (set) =>
            set.name.toLowerCase().includes(needle) ||
            set.code.toLowerCase().includes(needle),
        )
      : sets;
    return matches.slice(0, CARD_SET_PICKER_LIMIT);
  }, [sets, query]);

  const toggle = (code: string) => {
    setForceSetCodes(
      forceSetCodes.includes(code)
        ? forceSetCodes.filter((selected) => selected !== code)
        : [...forceSetCodes, code],
    );
    setQuery("");
  };

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) setQuery("");
    onOpenChange(nextOpen);
  };

  return (
    <DropdownMenuSub open={open} onOpenChange={changeOpen}>
      <ScanOptionsSubmenuTrigger
        icon={<IconStack3 />}
        label={t("scannerControls.setMenu")}
        value={forcedSetSummary(forceSetCodes, t)}
      />
      <DropdownMenuSubContent className="w-72 p-2">
        <p className="px-1 pb-2 text-xs text-foreground/70">
          {t("scannerControls.setHint")}
        </p>
        <Input
          autoFocus
          aria-label={t("scannerControls.setSearchPlaceholder")}
          placeholder={t("scannerControls.setSearchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim() && filtered[0]) {
              e.preventDefault();
              e.stopPropagation();
              toggle(filtered[0].code);
              return;
            }
            if (!SET_SEARCH_MENU_NAVIGATION_KEYS.has(e.key)) {
              e.stopPropagation();
            }
          }}
        />
        <DropdownMenuSeparator className="my-2" />
        <div className="flex max-h-72 flex-col overflow-y-auto">
          <DropdownMenuCheckboxItem
            checked={forceSetCodes.length === 0}
            onCheckedChange={() => setForceSetCodes([])}
          >
            {t("scannerControls.anySet")}
          </DropdownMenuCheckboxItem>
          {isLoading && (
            <ListSkeleton
              rows={6}
              hasTrailing
              className="gap-0.5"
              rowClassName="px-2 py-1.5"
            />
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-foreground/70">
              {t("scannerControls.noSets")}
            </p>
          )}
          {filtered.map((set) => (
            <DropdownMenuCheckboxItem
              key={set.code}
              checked={forceSetCodes.includes(set.code)}
              onCheckedChange={() => toggle(set.code)}
            >
              <span className="min-w-0 flex-1 truncate">{set.name}</span>
              <span className="shrink-0 text-xs text-foreground/70">
                {set.code.toUpperCase()}
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
