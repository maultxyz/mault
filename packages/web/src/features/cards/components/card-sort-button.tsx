import { Button } from "@/components/ui/button";
import { DynamicPopover } from "@/components/ui/responsive-popover";
import type { CardSortButtonProps } from "@/lib/interfaces/cards";
import { cn } from "@/lib/utils";
import type { FieldMeta } from "@magic-vault/shared";
import { IconArrowsSort, IconCheck } from "@tabler/icons-react";
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

function sortValueLabel(
  sortKey: string | null,
  sortableFields: FieldMeta[],
  t: TFunction<"cards">,
): string {
  if (!sortKey || sortKey === "scan-desc") return t("cardToolbar.scanOrder");
  const i = sortKey.lastIndexOf("-");
  const field = sortKey.slice(0, i);
  const dir = sortKey.slice(i + 1);
  const meta = sortableFields.find((f) => f.field === field);
  if (!meta) return "";
  const [asc, desc] = sortLabels(meta.type, t);
  return `${meta.label} (${dir === "asc" ? asc : desc})`;
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
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs text-left transition-colors",
        active ? "bg-primary/15 font-medium" : "hover:bg-muted",
      )}
    >
      <span>{label}</span>
      {active && <IconCheck className="size-3.5 shrink-0" />}
    </button>
  );
}

export function CardSortButton({
  sortKey,
  onSortChange,
  sortableFields,
  className,
}: CardSortButtonProps) {
  const { t } = useTranslation("cards");

  return (
    <DynamicPopover
      trigger={
        <Button
          variant={sortKey && sortKey !== "scan-desc" ? "secondary" : "outline"}
          size="icon"
          className={cn("shrink-0", className)}
          title={sortValueLabel(sortKey, sortableFields, t)}
        >
          <IconArrowsSort className="size-4" />
        </Button>
      }
      side="bottom"
      align="end"
    >
      <div className="flex flex-col gap-0.5 min-w-40">
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
    </DynamicPopover>
  );
}
