import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DeckImportPreviewTableProps } from "@/lib/interfaces/cards";
import { useTranslation } from "react-i18next";

export function DeckImportPreviewTable({
  rows,
  matchedRows,
}: DeckImportPreviewTableProps) {
  const { t } = useTranslation("cards");
  const matchedByLine = new Map(
    matchedRows.map((matchedRow) => [matchedRow.lineNumber, matchedRow]),
  );

  return (
    <div className="max-h-[45dvh] min-h-0 overflow-y-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-right">
              {t("importCsv.deckLink.table.quantity")}
            </TableHead>
            <TableHead>{t("importCsv.deckLink.table.card")}</TableHead>
            <TableHead>{t("importCsv.deckLink.table.set")}</TableHead>
            <TableHead>{t("importCsv.deckLink.table.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const matched = matchedByLine.get(row.lineNumber);
            const setCode = matched?.setCode ?? row.setCode;
            const collectorNumber =
              matched?.collectorNumber ?? row.collectorNumber;
            return (
              <TableRow key={row.lineNumber}>
                <TableCell className="text-right">{row.quantity}</TableCell>
                <TableCell>
                  <span className="flex items-center gap-1.5">
                    <span className="truncate">{matched?.name ?? row.name}</span>
                    {row.isFoil && (
                      <Badge variant="outline">
                        {t("importCsv.deckLink.table.foil")}
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell>
                  {setCode ? (
                    <span className="flex flex-col">
                      {matched?.setName && <span>{matched.setName}</span>}
                      <span className="text-foreground/70">
                        {[setCode.toUpperCase(), collectorNumber && `#${collectorNumber}`]
                          .filter(Boolean)
                          .join(" ")}
                      </span>
                    </span>
                  ) : (
                    <span className="text-foreground/70">
                      {t("importCsv.deckLink.table.anySet")}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={matched ? "success" : "warning"}>
                    {matched
                      ? t("importCsv.deckLink.table.matched")
                      : t("importCsv.deckLink.table.notFound")}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
