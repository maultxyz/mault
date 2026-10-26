import type { CardSortOptionsProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import type { FieldMeta } from "@magic-vault/shared";
import { IconCheck } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { Fragment } from "react";
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
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
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
}: CardSortOptionsProps) {
  const { t } = useTranslation("cards");

  return (
    <div className="flex flex-col gap-0.5">
      <SortOption
        label={t("cardToolbar.scanOrder")}
        active={!sortKey || sortKey === "scan-desc"}
        onSelect={() => onSortChange("scan-desc")}
      />
      {sortableFields.map((field) => {
        const [asc, desc] = sortLabels(field.type, t);
        return (
          <Fragment key={field.field}>
            <SortOption
              label={`${field.label} (${asc})`}
              active={sortKey === `${field.field}-asc`}
              onSelect={() => onSortChange(`${field.field}-asc`)}
            />
            <SortOption
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
