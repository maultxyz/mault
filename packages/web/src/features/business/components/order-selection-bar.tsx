import { ConfirmDialog } from "@/components/confirm-dialog";
import { DeleteDialog } from "@/components/delete-dialog";
import { SelectionActionBar } from "@/components/selection-action-bar";
import { Button } from "@/components/ui/button";
import { runOrderBulkAction } from "@/features/business/api/business";
import { useBusinessAccess, useBusinessAction } from "@/features/business/api/use-business";
import {
  SELECTION_ACTION_BAR_BUTTON_CLASS,
  SELECTION_ACTION_BAR_DESTRUCTIVE_BUTTON_CLASS,
} from "@/lib/constants/card-grid";
import type { OrderSelectionBarProps } from "@/lib/interfaces/business";
import { toast } from "@/lib/toast";
import type { OrderBulkAction } from "@magic-vault/shared";
import { IconBan, IconListCheck, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function OrderSelectionBar({ checkedOrders, onClear, onOrdersDeleted }: OrderSelectionBarProps) {
  const { t } = useTranslation("business");
  const { access } = useBusinessAccess();
  const run = useBusinessAction();
  const [pendingAction, setPendingAction] = useState<OrderBulkAction | null>(null);
  const [confirmAction, setConfirmAction] = useState<OrderBulkAction | null>(null);
  if (checkedOrders.length === 0) return null;
  const openOrders = checkedOrders.filter((order) => order.status === "open");
  const closedOrders = checkedOrders.filter((order) => order.status !== "open");
  const canAct = access?.canFulfilOrders ?? false;

  const runBulkAction = async (action: OrderBulkAction) => {
    const targetOrders = action === "delete" ? closedOrders : openOrders;
    const orderGuids = targetOrders.map((order) => order.guid);
    setPendingAction(action);
    const result = await run(() => runOrderBulkAction({ action, orderGuids }));
    setPendingAction(null);
    setConfirmAction(null);
    if (!result?.data) return;
    toast.success(t(`orders.bulk.done.${action}`, { count: result.data.updated }));
    if (action === "delete") onOrdersDeleted(orderGuids);
    onClear();
  };

  return (
    <>
      <SelectionActionBar
        selectedCount={checkedOrders.length}
        selectionLabel={t("orders.bulk.selected", { count: checkedOrders.length })}
        onClear={onClear}
      >
        <Button
          variant="ghost"
          className={SELECTION_ACTION_BAR_BUTTON_CLASS}
          disabled={!canAct || openOrders.length === 0 || pendingAction !== null}
          onClick={() => void runBulkAction("allocate")}
        >
          <IconListCheck />
          {t("orders.bulk.allocate", { count: openOrders.length })}
        </Button>
        <Button
          variant="ghost"
          className={SELECTION_ACTION_BAR_BUTTON_CLASS}
          disabled={!canAct || openOrders.length === 0 || pendingAction !== null}
          onClick={() => setConfirmAction("cancel")}
        >
          <IconBan />
          {t("orders.bulk.cancel", { count: openOrders.length })}
        </Button>
        <Button
          className={SELECTION_ACTION_BAR_DESTRUCTIVE_BUTTON_CLASS}
          disabled={!canAct || closedOrders.length === 0 || pendingAction !== null}
          onClick={() => setConfirmAction("delete")}
        >
          <IconTrash />
          {t("orders.bulk.delete", { count: closedOrders.length })}
        </Button>
      </SelectionActionBar>
      <ConfirmDialog
        open={confirmAction === "cancel"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={t("orders.bulk.cancelTitle", { count: openOrders.length })}
        description={t("orders.bulk.cancelDescription", { count: openOrders.length })}
        confirmLabel={t("orders.bulk.cancelConfirm", { count: openOrders.length })}
        cancelLabel={t("orders.bulk.keep")}
        destructive
        isPending={pendingAction === "cancel"}
        onConfirm={() => void runBulkAction("cancel")}
      />
      <DeleteDialog
        open={confirmAction === "delete"}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={t("orders.bulk.deleteTitle", { count: closedOrders.length })}
        description={t("orders.bulk.deleteDescription", { count: closedOrders.length })}
        onConfirm={() => void runBulkAction("delete")}
      />
    </>
  );
}
