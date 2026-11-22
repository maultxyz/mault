import {
  CARD_RESERVATION_ACTIVE_STATUSES,
  CARD_RESERVATION_OPEN_STAGES,
  CARD_RESERVATION_HOLD_DAY_CHOICES,
  CARD_RESERVATION_HOLDER_QUEUE_POSITION,
  DEFAULT_CARD_RESERVATION_HOLD_DAYS,
} from "./constants/card-reservations.constant";
import type {
  CardReservation,
  CardReservationActiveStatus,
  CardReservationOpenStage,
  CardReservationStage,
  CardReservationHoldDays,
  CardReservationQueueEntry,
  CardReservationQueueSettlement,
  CardReservationRequestGroup,
  CardReservationStatus,
} from "./interfaces/card-reservations.interface";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isActiveCardReservationStatus(
  status: CardReservationStatus,
): status is CardReservationActiveStatus {
  return (CARD_RESERVATION_ACTIVE_STATUSES as readonly string[]).includes(status);
}

export function toCardReservationHoldDays(value: unknown): CardReservationHoldDays {
  return (CARD_RESERVATION_HOLD_DAY_CHOICES as readonly unknown[]).includes(value)
    ? (value as CardReservationHoldDays)
    : DEFAULT_CARD_RESERVATION_HOLD_DAYS;
}

export function cardReservationHoldExpiry(holdStartedAt: Date, holdDays: number): Date {
  return new Date(holdStartedAt.getTime() + holdDays * MS_PER_DAY);
}

export function settleCardReservationQueue(
  queueInJoinOrder: CardReservationQueueEntry[],
  now: Date,
): CardReservationQueueSettlement {
  const holder = queueInJoinOrder.find((entry) => entry.status === "ready") ?? null;
  const holderHasLapsed =
    !!holder?.holdExpiresAt && holder.holdExpiresAt.getTime() <= now.getTime();
  if (holder && !holderHasLapsed) return { expiredId: null, promoted: null };
  const next = queueInJoinOrder.find((entry) => entry.status === "waiting");
  return {
    expiredId: holder?.id ?? null,
    promoted: next
      ? {
          id: next.id,
          holdStartedAt: now,
          holdExpiresAt: cardReservationHoldExpiry(now, next.holdDays),
        }
      : null,
  };
}

export function cardReservationQueuePositions(
  queueInJoinOrder: Pick<CardReservationQueueEntry, "id" | "status">[],
): Map<number, number> {
  const holder = queueInJoinOrder.find((entry) => entry.status === "ready");
  const waiting = queueInJoinOrder.filter((entry) => entry.status === "waiting");
  const positions = new Map<number, number>();
  if (holder) positions.set(holder.id, CARD_RESERVATION_HOLDER_QUEUE_POSITION);
  waiting.forEach((entry, index) =>
    positions.set(entry.id, index + CARD_RESERVATION_HOLDER_QUEUE_POSITION + (holder ? 1 : 0)),
  );
  return positions;
}

export function groupCardReservationsByRequest(
  reservations: CardReservation[],
): CardReservationRequestGroup[] {
  const groups = new Map<string, CardReservationRequestGroup>();
  for (const reservation of reservations) {
    const group = groups.get(reservation.requestGuid) ?? {
      requestGuid: reservation.requestGuid,
      guestName: reservation.guestName,
      guestContact: reservation.guestContact,
      guestNote: reservation.guestNote,
      catalogName: reservation.catalogName,
      createdAt: reservation.createdAt,
      reservations: [],
      heldCount: 0,
      waitingCount: 0,
      readyForPickupCount: 0,
      beingPickedCount: 0,
      toPullCount: 0,
      pickOrders: [],
      heldPriceTotal: 0,
      hasMissingHeldPrices: false,
    };
    group.reservations.push(reservation);
    const stage = cardReservationStage(reservation);
    if (stage === "readyForPickup") group.readyForPickupCount += 1;
    if (stage === "beingPicked") group.beingPickedCount += 1;
    if (stage === "toPull") group.toPullCount += 1;
    if (
      stage === "beingPicked" &&
      reservation.pickOrderGuid &&
      !group.pickOrders.some((order) => order.guid === reservation.pickOrderGuid)
    ) {
      group.pickOrders.push({ guid: reservation.pickOrderGuid, name: reservation.pickOrderName ?? "" });
    }
    if (reservation.status === "ready") {
      group.heldCount += 1;
      if (reservation.price == null) group.hasMissingHeldPrices = true;
      else group.heldPriceTotal = Math.round((group.heldPriceTotal + reservation.price) * 100) / 100;
    }
    if (reservation.status === "waiting") group.waitingCount += 1;
    groups.set(reservation.requestGuid, group);
  }
  return [...groups.values()];
}

export function cardReservationStage(
  reservation: Pick<CardReservation, "status" | "isReadyForPickup" | "pickOrderGuid">,
): CardReservationStage {
  if (reservation.status !== "ready") return reservation.status;
  if (reservation.isReadyForPickup) return "readyForPickup";
  return reservation.pickOrderGuid ? "beingPicked" : "toPull";
}

export function cardReservationGroupStage(
  group: CardReservationRequestGroup,
): CardReservationStage | null {
  if (group.readyForPickupCount > 0) return "readyForPickup";
  if (group.toPullCount > 0) return "toPull";
  if (group.beingPickedCount > 0) return "beingPicked";
  if (group.waitingCount > 0) return "waiting";
  const stages = new Set(group.reservations.map(cardReservationStage));
  return stages.size === 1 ? cardReservationStage(group.reservations[0]) : null;
}

export function cardReservationGroupStageCounts(
  group: CardReservationRequestGroup,
): { stage: CardReservationOpenStage; count: number }[] {
  const counts: Record<CardReservationOpenStage, number> = {
    readyForPickup: group.readyForPickupCount,
    beingPicked: group.beingPickedCount,
    toPull: group.toPullCount,
    waiting: group.waitingCount,
  };
  return CARD_RESERVATION_OPEN_STAGES.flatMap((stage) =>
    counts[stage] > 0 ? [{ stage, count: counts[stage] }] : [],
  );
}
