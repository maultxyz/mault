import { CardThumbnail } from "@/components/card-thumbnail";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StoragePickListRowsProps } from "@/lib/interfaces/storage";
import { cn } from "@/lib/utils";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function StoragePickListTable({
  rows,
  showLocation,
  checkLabel,
  onCheckedChange,
}: StoragePickListRowsProps) {
  const { t } = useTranslation("storage");

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              <span className="sr-only">{checkLabel}</span>
            </TableHead>
            {showLocation && (
              <TableHead>{t("cards.columns.location")}</TableHead>
            )}
            <TableHead className="w-12 text-right">
              {t("cards.columns.position")}
            </TableHead>
            <TableHead className="w-10">
              <span className="sr-only">{t("cards.columns.image")}</span>
            </TableHead>
            <TableHead>{t("cards.columns.name")}</TableHead>
            <TableHead className="hidden sm:table-cell">
              {t("cards.columns.set")}
            </TableHead>
            <TableHead className="hidden lg:table-cell">
              {t("cards.columns.collection")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) =>
            row.kind === "missing" ? (
              <TableRow
                key={`missing-${row.line.name}`}
                className="hover:bg-transparent"
              >
                <TableCell>
                  <IconAlertTriangle className="size-4 text-warning" />
                </TableCell>
                {showLocation && (
                  <TableCell className="text-xs text-foreground/70">
                    {t("pickList.notStored")}
                  </TableCell>
                )}
                <TableCell />
                <TableCell />
                <TableCell className="font-medium">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{row.line.name}</span>
                    <span className="text-xs font-normal text-foreground/70">
                      {t("pickList.missingCount", { count: row.missingCount })}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell" />
                <TableCell className="hidden lg:table-cell" />
              </TableRow>
            ) : (
              <TableRow
                key={row.entry.scanId}
                className={cn(
                  "cursor-pointer",
                  row.isPicked && "text-foreground/70",
                )}
                onClick={() => onCheckedChange(row.entry.scanId, !row.isPicked)}
              >
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={row.isPicked}
                    aria-label={row.entry.card.name}
                    onCheckedChange={(checked) =>
                      onCheckedChange(row.entry.scanId, checked === true)
                    }
                  />
                </TableCell>
                {showLocation && (
                  <TableCell className="max-w-40 truncate">
                    {row.entry.locationName}
                  </TableCell>
                )}
                <TableCell className="text-right text-xs font-semibold tabular-nums text-foreground/70">
                  {row.entry.position}
                </TableCell>
                <TableCell>
                  <CardThumbnail
                    image={row.entry.card.image}
                    isFoil={row.entry.isFoil}
                  />
                </TableCell>
                <TableCell
                  className={cn(
                    "max-w-56 truncate font-medium",
                    row.isPicked && "line-through",
                  )}
                >
                  {row.entry.card.name}
                </TableCell>
                <TableCell className="hidden max-w-40 truncate text-xs text-foreground/70 sm:table-cell">
                  {`${row.entry.card.setName} (${row.entry.card.set.toUpperCase()})`}
                </TableCell>
                <TableCell className="hidden max-w-36 truncate text-xs text-foreground/70 lg:table-cell">
                  {row.entry.collectionName}
                </TableCell>
              </TableRow>
            ),
          )}
        </TableBody>
      </Table>
    </div>
  );
}
