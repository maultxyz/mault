import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CardThumbnail } from "@/components/card-thumbnail";
import { formatDateTime } from "@/features/business/lib/format";
import { packingSlipSubtotal } from "@/features/business/lib/packing-slips";
import { usePriceSource } from "@/hooks/use-price-source";
import type { PackingSlipProps } from "@/lib/interfaces/business";
import { useTranslation } from "react-i18next";

export function PackingSlip({ slip, shopName, showsPrices }: PackingSlipProps) {
  const { t } = useTranslation("business");
  const { format } = usePriceSource();
  const subtotal = packingSlipSubtotal(slip);
  const showsPriceColumns = showsPrices && subtotal !== null;
  const itemCount = slip.rows.reduce((sum, row) => sum + row.quantity, 0);
  const showsImages = slip.rows.some((row) => row.image !== null);
  return (
    <section
      aria-label={t("orders.packingSlips.slipLabel", { order: slip.orderRef ?? slip.pickName })}
      className="flex flex-col gap-4 rounded-card bg-card p-6 print:break-after-page print:rounded-none print:p-0 print:last:break-after-auto"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-semibold">{shopName}</h2>
          <p className="text-sm text-foreground/70">{t("orders.packingSlips.title")}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium">
            {slip.orderRef
              ? t("orders.packingSlips.orderRef", { order: slip.orderRef })
              : slip.pickName}
          </p>
          <p className="text-foreground/70">{formatDateTime(slip.date)}</p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-right">{t("orders.packingSlips.quantity")}</TableHead>
            {showsImages && (
              <TableHead className="w-14">
                <span className="sr-only">{t("orders.packingSlips.image")}</span>
              </TableHead>
            )}
            <TableHead>{t("table.card")}</TableHead>
            <TableHead>{t("table.set")}</TableHead>
            <TableHead>{t("table.condition")}</TableHead>
            {showsPriceColumns && (
              <>
                <TableHead className="text-right">{t("orders.packingSlips.unitPrice")}</TableHead>
                <TableHead className="text-right">{t("orders.packingSlips.lineTotal")}</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {slip.rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
              {showsImages && (
                <TableCell className="py-1">
                  {row.image && (
                    <CardThumbnail image={row.image} loading="eager" className="w-11" />
                  )}
                </TableCell>
              )}
              <TableCell className="whitespace-normal">
                {row.name}
                {row.isFoil ? ` (${t("table.foil")})` : ""}
              </TableCell>
              <TableCell>
                {row.setCode
                  ? `${row.setCode.toUpperCase()}${row.collectorNumber ? ` ${row.collectorNumber}` : ""}`
                  : "-"}
              </TableCell>
              <TableCell>{row.condition ?? "-"}</TableCell>
              {showsPriceColumns && (
                <>
                  <TableCell className="text-right tabular-nums">
                    {row.unitPrice === null ? "-" : format(row.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.unitPrice === null ? "-" : format(row.unitPrice * row.quantity)}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="ml-auto flex w-full max-w-xs flex-col gap-1 text-sm">
        <div className="flex justify-between">
          <span>{t("orders.packingSlips.items")}</span>
          <span className="tabular-nums">{itemCount}</span>
        </div>
        {showsPriceColumns && (
          <div className="flex justify-between border-t pt-1 font-semibold">
            <span>{t("orders.packingSlips.subtotal")}</span>
            <span className="tabular-nums">{format(subtotal)}</span>
          </div>
        )}
      </div>
      {slip.unavailable.length > 0 && (
        <div className="flex flex-col gap-1 text-sm">
          <h3 className="font-medium">{t("orders.packingSlips.unavailableTitle")}</h3>
          <ul className="list-inside list-disc text-foreground/70">
            {slip.unavailable.map((line) => (
              <li key={line.name}>
                {t("orders.packingSlips.unavailableLine", {
                  count: line.quantity,
                  name: line.name,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-sm text-foreground/70">{t("orders.packingSlips.thanks")}</p>
    </section>
  );
}
