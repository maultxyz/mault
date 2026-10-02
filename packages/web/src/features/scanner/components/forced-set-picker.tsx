import { ListSkeleton } from "@/components/list-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cardSetsQueryOptions } from "@/features/cards/api/card-sets";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScannedCards } from "@/features/scanner/api/use-scanned-cards";
import { CARD_SET_PICKER_LIMIT } from "@/lib/constants/scanner";
import type { ForcedSetOptionProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconCheck, IconStack3 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function ForcedSetPicker() {
  const { t } = useTranslation("scanner");
  const { forceSetCode, setForceSetCode } = useScannedCards();
  const { activeCollection } = useCollections();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data: sets = [], isLoading } = useQuery({
    ...cardSetsQueryOptions(activeCollection?.guid),
    enabled: !!activeCollection?.guid && (open || !!forceSetCode),
  });

  const selected = sets.find((set) => set.code === forceSetCode);
  const selectedLabel = forceSetCode
    ? (selected?.name ?? forceSetCode.toUpperCase())
    : t("scannerControls.anySet");
  const tooltip = t("scannerControls.setTooltip", { set: selectedLabel });

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

  const choose = (code: string | null) => {
    setForceSetCode(code);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant={forceSetCode ? "outline-selected" : "outline"}
                  size="icon"
                  aria-label={tooltip}
                >
                  <IconStack3 />
                </Button>
              }
            />
          }
        />
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-72 gap-2 p-2">
        <p className="px-1 text-xs text-foreground/70">
          {t("scannerControls.setHint")}
        </p>
        <Input
          autoFocus
          placeholder={t("scannerControls.setSearchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
          <SetOption
            label={t("scannerControls.anySet")}
            active={!forceSetCode}
            onSelect={() => choose(null)}
          />
          {isLoading && (
            <ListSkeleton className="py-1" />
          )}
          {!isLoading && filtered.length === 0 && (
            <p className="px-2 py-3 text-center text-xs text-foreground/70">
              {t("scannerControls.noSets")}
            </p>
          )}
          {filtered.map((set) => (
            <SetOption
              key={set.code}
              label={set.name}
              detail={set.code.toUpperCase()}
              active={set.code === forceSetCode}
              onSelect={() => choose(set.code)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SetOption({ label, detail, active, onSelect }: ForcedSetOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
        active ? "bg-primary/15 font-medium" : "hover:bg-muted",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {detail && <span className="shrink-0 text-foreground/70">{detail}</span>}
      {active && <IconCheck className="size-3.5 shrink-0" />}
    </button>
  );
}
