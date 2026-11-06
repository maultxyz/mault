import { CardThumbnail } from "@/components/card-thumbnail";
import { Checkbox } from "@/components/ui/checkbox";
import { MOBILE_LIST_CLASS, MOBILE_LIST_ROW_CLASS } from "@/lib/constants/nav";
import type { StoragePickListRowsProps } from "@/lib/interfaces/storage";
import { cn } from "@/lib/utils";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MobileStoragePickList({
  rows,
  showLocation,
  onCheckedChange,
}: StoragePickListRowsProps) {
  const { t } = useTranslation("storage");

  return (
    <div className={MOBILE_LIST_CLASS}>
      {rows.map((row) =>
        row.kind === "missing" ? (
          <div
            key={`missing-${row.line.name}`}
            className={cn(MOBILE_LIST_ROW_CLASS, "active:bg-transparent")}
          >
            <IconAlertTriangle className="size-4 shrink-0 text-warning-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {row.line.name}
              </span>
              <span className="block truncate text-xs font-normal text-foreground/70">
                {t("pickList.missingCount", { count: row.missingCount })}
              </span>
            </span>
          </div>
        ) : (
          <label
            key={row.entry.scanId}
            className={cn(
              MOBILE_LIST_ROW_CLASS,
              "cursor-pointer",
              row.isPicked && "text-foreground/70",
            )}
          >
            <Checkbox
              checked={row.isPicked}
              onCheckedChange={(checked) =>
                onCheckedChange(row.entry.scanId, checked === true)
              }
            />
            <CardThumbnail
              image={row.entry.card.image}
              isFoil={row.entry.isFoil}
              className="w-10 rounded-sm"
            />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate font-semibold",
                  row.isPicked && "line-through",
                )}
              >
                {row.entry.card.name}
              </span>
              <span className="block truncate text-xs font-normal text-foreground/70">
                {[
                  ...(showLocation ? [row.entry.locationName] : []),
                  t("cards.position", { position: row.entry.position }),
                  row.entry.card.setName,
                ].join(" · ")}
              </span>
            </span>
          </label>
        ),
      )}
    </div>
  );
}
