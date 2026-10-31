import { HotkeyHint } from "@/components/hotkey-hint";
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
import type {
  ForcedSetOptionProps,
  ForcedSetPickerProps,
} from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconCheck, IconStack3 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

export function ForcedSetPicker({ open, onOpenChange }: ForcedSetPickerProps) {
  const { t } = useTranslation("scanner");
  const { forceSetCodes, setForceSetCodes } = useScannedCards();
  const { activeCollection } = useCollections();
  const [query, setQuery] = useState("");
  const { data: sets = [], isLoading } = useQuery({
    ...cardSetsQueryOptions(activeCollection?.guid),
    enabled: !!activeCollection?.guid && (open || forceSetCodes.length > 0),
  });

  const setName = (code: string) =>
    sets.find((set) => set.code === code)?.name ?? code.toUpperCase();
  const buttonLabel =
    forceSetCodes.length === 0
      ? t("scannerControls.anySet")
      : forceSetCodes.length === 1
        ? forceSetCodes[0].toUpperCase()
        : t("scannerControls.setCount", { count: forceSetCodes.length });
  const tooltip = t("scannerControls.setTooltip", {
    set:
      forceSetCodes.length === 0
        ? t("scannerControls.anySet")
        : forceSetCodes.map(setName).join(", "),
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

  const chooseAnySet = () => {
    setForceSetCodes([]);
    onOpenChange(false);
    setQuery("");
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  variant={
                    forceSetCodes.length > 0 ? "outline-selected" : "outline"
                  }
                  aria-label={tooltip}
                >
                  <IconStack3 />
                  <span className="max-w-32 truncate">{buttonLabel}</span>
                </Button>
              }
            />
          }
        />
        <TooltipContent>
          {tooltip}
          <HotkeyHint id="scanPickSet" />
        </TooltipContent>
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim() && filtered[0]) {
              e.preventDefault();
              toggle(filtered[0].code);
            }
          }}
        />
        <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
          <SetOption
            label={t("scannerControls.anySet")}
            active={forceSetCodes.length === 0}
            onSelect={chooseAnySet}
          />
          {isLoading && <ListSkeleton className="py-1" />}
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
              active={forceSetCodes.includes(set.code)}
              onSelect={() => toggle(set.code)}
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
      aria-pressed={active}
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
