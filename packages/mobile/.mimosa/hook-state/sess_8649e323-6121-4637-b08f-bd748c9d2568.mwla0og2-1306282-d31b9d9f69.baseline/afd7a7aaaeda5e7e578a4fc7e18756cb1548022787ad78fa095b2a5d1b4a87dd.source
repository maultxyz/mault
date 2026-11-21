import { toOrderLineInput, type FulfilmentOrderDetail, type PullSheetEntry } from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { fulfilOrder, updateOrder } from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business-action";

export function usePickActions() {
  const { t } = useTranslation();
  const { run, refresh, announce } = useBusinessAction();
  const [isCompleting, setIsCompleting] = useState(false);

  const confirmMissing = (order: FulfilmentOrderDetail, entry: PullSheetEntry) =>
    Alert.alert(t("business.picks.missing.title", { name: entry.card.name }), t("business.picks.missing.description"), [
      { text: t("business.cancel"), style: "cancel" },
      {
        text: t("business.picks.missing.confirm"),
        onPress: () =>
          void run(
            () =>
              updateOrder(order.guid, {
                name: order.name,
                lines: order.lines.map(toOrderLineInput),
                releasedScanIds: [entry.scanId],
              }),
            t("business.picks.missing.released", { name: entry.card.name }),
          ),
      },
    ]);

  const completeOrders = async (orders: FulfilmentOrderDetail[]) => {
    setIsCompleting(true);
    let completed = 0;
    let failure: string | null = null;
    for (const order of orders) {
      try {
        await fulfilOrder(order.guid, { scanIds: order.pullSheet.map((entry) => entry.scanId) });
        completed += 1;
      } catch (error) {
        failure = error instanceof Error ? error.message : t("business.actionFailed");
      }
    }
    setIsCompleting(false);
    await refresh();
    if (completed > 0) announce(t("business.picks.completed", { count: completed }), "success");
    if (failure) announce(failure, "destructive");
    return completed;
  };

  const confirmComplete = (orders: FulfilmentOrderDetail[], onCompleted?: () => void) =>
    Alert.alert(
      t("business.picks.completeTitle", { count: orders.length }),
      t("business.picks.completeDescription", {
        count: orders.reduce((sum, order) => sum + order.pullSheet.length, 0),
        names: orders.map((order) => order.name).join(", "),
      }),
      [
        { text: t("business.cancel"), style: "cancel" },
        {
          text: t("business.picks.complete", { count: orders.length }),
          onPress: () =>
            void completeOrders(orders).then((completed) => {
              if (completed > 0) onCompleted?.();
            }),
        },
      ],
    );

  return { isCompleting, confirmMissing, confirmComplete };
}
