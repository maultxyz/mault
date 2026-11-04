import type { CardSortOptionsProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import type { FieldMeta } from "@magic-vault/shared";
import { IconCheck } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { Fragment, useEffect, useRef, type Ref } from "react";
import { useTranslation } from "react-i18next";

function sortLabels(
  type: FieldMeta["type"],
  t: TFunction<"cards">,
): [asc: string, desc: string] {
  return type === "string"
    ? [t("cardToolbar.sortAscString"), t("cardToolbar.sortDescString")]
    : [t("cardToolbar.sortAscDefault"), t("cardToolbar.sortDescDefault")];
}

function SortOption({
  label,
  active,
  onSelect,
  ref,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-left transition-colors max-md:min-h-12 max-md:px-3 max-md:text-base",
        active ? "bg-primary/15 font-medium" : "hover:bg-muted",
      )}
    >
      <span>{label}</span>
      {active && <IconCheck className="size-3.5 shrink-0" />}
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
  const isScanOrderActive = !sortKey || sortKey === "scan-desc";

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
      className="relative flex max-h-56 flex-col gap-0.5 overflow-y-auto overscroll-contain rounded-lg p-1 ring-1 ring-border"
    >
      <SortOption
        ref={isScanOrderActive ? activeOptionRef : undefined}
        label={defaultSortLabel ?? t("cardToolbar.scanOrder")}
        active={isScanOrderActive}
        onSelect={() => onSortChange("scan-desc")}
      />
      {sortableFields.map((field) => {
        const [asc, desc] = sortLabels(field.type, t);
        return (
          <Fragment key={field.field}>
            <SortOption
              ref={
                sortKey === `${field.field}-asc` ? activeOptionRef : undefined
              }
              label={`${field.label} (${asc})`}
              active={sortKey === `${field.field}-asc`}
              onSelect={() => onSortChange(`${field.field}-asc`)}
            />
            <SortOption
              ref={
                sortKey === `${field.field}-desc` ? activeOptionRef : undefined
              }
              label={`${field.label} (${desc})`}
              active={sortKey === `${field.field}-desc`}
              onSelect={() => onSortChange(`${field.field}-desc`)}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
