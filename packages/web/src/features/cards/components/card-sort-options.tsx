import type {
  CardSortOptionProps,
  CardSortOptionsProps,
} from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import {
  cardSortDirectionForField,
  DEFAULT_CARD_SORT,
  nextCardSortKeyForField,
  type CardSortDirection,
  type FieldMeta,
} from "@magic-vault/shared";
import { IconArrowDown, IconArrowUp, IconCheck } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

function sortDirectionLabel(
  type: FieldMeta["type"],
  direction: CardSortDirection,
  t: TFunction<"cards">,
): string {
  if (type === "string") {
    return direction === "asc"
      ? t("cardToolbar.sortAscString")
      : t("cardToolbar.sortDescString");
  }
  return direction === "asc"
    ? t("cardToolbar.sortAscDefault")
    : t("cardToolbar.sortDescDefault");
}

function SortOption({
  label,
  directionLabel,
  direction,
  active,
  onSelect,
  ref,
}: CardSortOptionProps) {
  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={active}
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-left transition-colors max-md:min-h-12 max-md:px-3 max-md:text-base",
        active ? "bg-primary/15 font-medium" : "hover:bg-muted",
      )}
    >
      <span>
        {label}
        {directionLabel && <span className="sr-only">, {directionLabel}</span>}
      </span>
      {direction ? (
        <span className="flex shrink-0 items-center gap-1" aria-hidden="true">
          {directionLabel}
          {direction === "asc" ? (
            <IconArrowUp className="size-3.5" />
          ) : (
            <IconArrowDown className="size-3.5" />
          )}
        </span>
      ) : (
        active && <IconCheck className="size-3.5 shrink-0" />
      )}
    </button>
  );
}

export function CardSortOptions({
  sortKey,
  onSortChange,
  sortableFields,
  defaultSortLabel,
}: CardSortOptionsProps) {
  const { t } = useTranslation("cards");
  const optionListRef = useRef<HTMLDivElement>(null);
  const activeOptionRef = useRef<HTMLButtonElement>(null);
  const isScanOrderActive = !sortKey || sortKey === DEFAULT_CARD_SORT;

  useEffect(() => {
    const optionList = optionListRef.current;
    const activeOption = activeOptionRef.current;
    if (!optionList || !activeOption) return;
    optionList.scrollTop =
      activeOption.offsetTop -
      (optionList.clientHeight - activeOption.offsetHeight) / 2;
  }, []);

  return (
    <div
      ref={optionListRef}
      className="relative flex max-h-56 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-xl bg-muted p-1"
    >
      <SortOption
        ref={isScanOrderActive ? activeOptionRef : undefined}
        label={defaultSortLabel ?? t("cardToolbar.scanOrder")}
        active={isScanOrderActive}
        onSelect={() => onSortChange(DEFAULT_CARD_SORT)}
      />
      {sortableFields.map((field) => {
        const direction = cardSortDirectionForField(sortKey, field.field);
        return (
          <SortOption
            key={field.field}
            ref={direction ? activeOptionRef : undefined}
            label={field.label}
            directionLabel={
              direction ? sortDirectionLabel(field.type, direction, t) : undefined
            }
            direction={direction}
            active={direction !== null}
            onSelect={() =>
              onSortChange(nextCardSortKeyForField(sortKey, field.field))
            }
          />
        );
      })}
    </div>
  );
}
