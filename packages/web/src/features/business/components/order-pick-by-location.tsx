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
import { OrderRefLabel } from "@/features/business/components/order-ref-label";
import type { OrderPickByLocationProps } from "@/lib/interfaces/business";
import { useTranslation } from "react-i18next";

export function OrderPickByLocation({
  entries,
  orderBinOf,
  pickNameOf,
  pickedScanIds,
  canPick,
  onPickedChange,
}: OrderPickByLocationProps) {
  const { t } = useTranslation("business");
  const allScanIds = entries.map((entry) => entry.scanId);
  const pickedCount = allScanIds.filter((id) => pickedScanIds.has(id)).length;
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <Checkbox
                checked={pickedCount > 0 && pickedCount === allScanIds.length}
                indeterminate={pickedCount > 0 && pickedCount < allScanIds.length}
                disabled={!canPick}
                aria-label={t("orders.pickAll")}
                onCheckedChange={(checked) =>
                  onPickedChange(allScanIds, checked === true)
                }
              />
            </TableHead>
            <TableHead>{t("orders.locationColumn")}</TableHead>
            <TableHead>{t("table.card")}</TableHead>
            <TableHead>{t("table.condition")}</TableHead>
            {pickNameOf && <TableHead>{t("orders.batch.pickColumn")}</TableHead>}
            <TableHead>{t("table.orderRef")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.scanId}>
              <TableCell>
                <Checkbox
                  checked={pickedScanIds.has(entry.scanId)}
                  disabled={!canPick}
                  aria-label={
                    entry.orderRef == null
                      ? t("orders.pickCopy", { name: entry.card.name })
                      : t("orders.pickCopyForOrder", {
                          name: entry.card.name,
                          order: entry.orderRef,
                        })
                  }
                  onCheckedChange={(checked) =>
                    onPickedChange([entry.scanId], checked === true)
                  }
                />
              </TableCell>
              <TableCell className="text-sm">
                {entry.locationName
                  ? t("orders.locationAt", {
                      location: entry.locationName,
                      position: (entry.locationPosition ?? 0) + 1,
                    })
                  : t("orders.inCollection", {
                      collection: entry.collectionName,
                      bin: entry.binNumber ?? "-",
                    })}
              </TableCell>
              <TableCell className="max-w-80">
                <div className="flex items-center gap-2.5">
                  <CardThumbnail image={entry.card.image} className="w-10" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {entry.card.name}
                      {entry.isFoil && (
                        <span className="ml-1.5 text-xs font-normal text-foreground/70">
                          {t("table.foil")}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-foreground/70">
                      {t("orders.printing", {
                        setName: entry.card.setName,
                        set: entry.card.set.toUpperCase(),
                        number: entry.card.collectorNumber,
                      })}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>{entry.condition}</TableCell>
              {pickNameOf && (
                <TableCell className="max-w-48 truncate text-sm">{pickNameOf(entry)}</TableCell>
              )}
              <TableCell className="text-sm">
                <OrderRefLabel orderRef={entry.orderRef} binNumber={orderBinOf(entry)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
