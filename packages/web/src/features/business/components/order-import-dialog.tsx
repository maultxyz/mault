import { CsvImportDialog } from "@/components/csv-import-dialog";
import { createOrder } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business";
import type { OrderImportDialogProps } from "@/lib/interfaces/business";
import {
  ORDER_NAME_MAX_LENGTH,
  OrderSource,
} from "@magic-vault/shared";
import type { ComposedCsvOrder } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

function orderName(order: ComposedCsvOrder, fallback: string): string {
  return (order.reference?.trim() || fallback).slice(0, ORDER_NAME_MAX_LENGTH);
}

export function OrderImportDialog({
  open,
  onOpenChange,
  onCreated,
}: OrderImportDialogProps) {
  const { t } = useTranslation("business");
  const run = useBusinessAction();

  const importOrders = async (
    orders: ComposedCsvOrder[],
    source: OrderSource,
  ): Promise<boolean> => {
    let lastGuid: string | null = null;
    for (const [index, order] of orders.entries()) {
      if (order.lines.length === 0) continue;
      const name = orderName(order, t("orders.importedName", { index: index + 1 }));
      const result = await run(() =>
        createOrder({ name, source, lines: order.lines }),
      );
      if (!result?.data) break;
      lastGuid = result.data.guid;
    }
    if (lastGuid) onCreated(lastGuid);
    return lastGuid !== null;
  };

  return (
    <CsvImportDialog
      open={open}
      onOpenChange={onOpenChange}
      type="orders"
      title={t("orders.importTitle")}
      description={t("orders.importDescription")}
      importLabel={t("orders.import")}
      onImport={async (payload) =>
        payload.type === "orders" ? importOrders(payload.orders, payload.source) : false
      }
    />
  );
}
