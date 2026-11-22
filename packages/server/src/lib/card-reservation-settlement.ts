import { settleCardReservationQueue } from "@magic-vault/shared";
import type {
  ActiveCardReservationRow,
  CardReservationSettlementPlan,
} from "./interfaces/card-reservations";

export function cardReservationQueuesByCard<T extends { collectionCardId: number }>(rows: T[]): Map<number, T[]> {
  const queues = new Map<number, T[]>();
  for (const row of rows) {
    const queue = queues.get(row.collectionCardId);
    if (queue) queue.push(row);
    else queues.set(row.collectionCardId, [row]);
  }
  return queues;
}

export function planCardReservationSettlement(
  activeRowsInJoinOrder: ActiveCardReservationRow[],
  now: Date,
): CardReservationSettlementPlan {
  const plan: CardReservationSettlementPlan = { unavailableIds: [], expiredIds: [], promotions: [] };
  for (const queue of cardReservationQueuesByCard(activeRowsInJoinOrder).values()) {
    if (!queue[0].cardExists) {
      plan.unavailableIds.push(...queue.map((row) => row.id));
      continue;
    }
    const settlement = settleCardReservationQueue(queue, now);
    if (settlement.expiredId !== null) plan.expiredIds.push(settlement.expiredId);
    if (settlement.promoted) plan.promotions.push(settlement.promoted);
  }
  return plan;
}

export function cardReservationSettlementHasChanges(plan: CardReservationSettlementPlan): boolean {
  return plan.unavailableIds.length + plan.expiredIds.length + plan.promotions.length > 0;
}
