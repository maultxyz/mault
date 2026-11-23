import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Linking, View } from "react-native";
import {
  CARD_RESERVATION_HOLDER_QUEUE_POSITION,
  groupReservationsByRequestGuid,
  guestCardReservationCounts,
  isActiveCardReservationStatus,
  type MyCardReservation,
} from "@magic-vault/shared";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBadge } from "@/components/ui/icon-badge";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { Pill } from "@/components/ui/pill";
import { SectionHeader } from "@/components/ui/section-header";
import { useToast } from "@/components/ui/toast-provider";
import {
  cancelMyCardReservations,
  markMyCardReservationAlertsSeen,
  myCardReservationsQueryKey,
  myCardReservationsQueryOptions,
} from "@/features/card-reservations/api/my-card-reservations";
import { useSession } from "@/lib/auth/session";
import {
  MY_CARD_RESERVATION_ACTION_CANCEL,
  MY_CARD_RESERVATION_ACTION_CANCEL_ALL,
  MY_CARD_RESERVATION_ACTION_OPEN_CATALOG,
  MY_CARD_RESERVATION_OPTION_SEPARATOR,
  MY_CARD_RESERVATION_STATUS_TONES,
  CARD_RESERVATION_SKELETON_CARDS_PER_GROUP,
  CARD_RESERVATION_SKELETON_GROUP_COUNT,
} from "@/lib/constants/card-reservations";
import { CardReservationGroupsSkeleton } from "@/features/card-reservations/components/card-reservation-groups-skeleton";
import { SPACING } from "@/lib/constants/theme";
import { LIST_ROW_ICON_SIZE } from "@/lib/constants/ui";
import type {
  MyCardReservationCancelTarget,
  MyCardReservationGroup,
  MyCardReservationSectionProps,
} from "@/lib/interfaces/card-reservations";

function useStatusText() {
  const { t, i18n } = useTranslation();
  return (reservation: MyCardReservation) => {
    if (reservation.status === "ready") {
      const date = reservation.holdExpiresAt
        ? new Date(reservation.holdExpiresAt).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" })
        : null;
      if (!date) return t("myReservations.held");
      return reservation.isReadyForPickup
        ? t("myReservations.readyForPickupUntil", { date })
        : t("myReservations.heldUntil", { date });
    }
    if (reservation.status === "waiting") {
      return t("myReservations.aheadOfYou", {
        count: (reservation.queuePosition ?? 0) - CARD_RESERVATION_HOLDER_QUEUE_POSITION,
      });
    }
    return null;
  };
}

function useGroupSummary() {
  const { t } = useTranslation();
  return (group: MyCardReservationGroup) => {
    const counts = guestCardReservationCounts(group.reservations);
    const stages = (
      [
        ["readyForPickup", counts.readyForPickup],
        ["held", counts.held],
        ["waiting", counts.waiting],
      ] as const
    )
      .filter(([, count]) => count > 0)
      .map(([stage, count]) => t(`myReservations.requestCounts.${stage}`, { count }))
      .join(", ");
    const cards = t("myReservations.requestCardCount", { count: group.reservations.length });
    return stages ? t("myReservations.requestSummary", { cards, stages }) : cards;
  };
}

function MyCardReservationSection({ title, groups, newGuids, onPressGroup }: MyCardReservationSectionProps) {
  const { t, i18n } = useTranslation();
  const statusText = useStatusText();
  const groupSummary = useGroupSummary();
  if (groups.length === 0) return null;
  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader title={title} />
      <View style={{ gap: SPACING.md }}>
        {groups.map((group) => {
          const first = group.reservations[0];
          return (
            <ListGroup key={group.requestGuid}>
              <ListRow
                leading={<IconBadge name="bookmark" size={LIST_ROW_ICON_SIZE} />}
                title={first?.catalogName ?? t("myReservations.unknownCatalog")}
                subtitle={[
                  t("myReservations.requestReservedOn", {
                    date: new Date(first?.createdAt ?? Date.now()).toLocaleDateString(i18n.language, {
                      dateStyle: "medium",
                    }),
                  }),
                  groupSummary(group),
                ].join("\n")}
                subtitleNumberOfLines={3}
                accessibilityHint={t("myReservations.actionsHint")}
                onPress={() => onPressGroup(group)}
              />
              {group.reservations.map((reservation) => {
                const statusKey = reservation.isReadyForPickup ? "readyForPickup" : reservation.status;
                return (
                  <ListRow
                    key={reservation.guid}
                    leading={<CardThumbnail imageUrl={reservation.card.imageUrl} />}
                    title={reservation.card.name}
                    subtitle={[
                      [reservation.card.setName || reservation.card.setCode.toUpperCase(), reservation.card.condition]
                        .filter(Boolean)
                        .join(" · "),
                      statusText(reservation),
                    ]
                      .filter(Boolean)
                      .join("\n")}
                    subtitleNumberOfLines={3}
                    right={
                      <View style={{ alignItems: "flex-end", gap: SPACING.xs, flexShrink: 0 }}>
                        <Pill
                          label={t(`myReservations.status.${statusKey}`)}
                          tone={MY_CARD_RESERVATION_STATUS_TONES[statusKey]}
                        />
                        {newGuids.has(reservation.guid) ? <Pill label={t("myReservations.new")} tone="primary" /> : null}
                      </View>
                    }
                    accessibilityHint={t("myReservations.actionsHint")}
                    onPress={() => onPressGroup(group)}
                  />
                );
              })}
            </ListGroup>
          );
        })}
      </View>
    </View>
  );
}

export function MyCardReservationsView() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const userId = useSession().user?.id ?? null;
  const reservations = useQuery(myCardReservationsQueryOptions(userId));
  const [actionsFor, setActionsFor] = useState<MyCardReservationGroup | null>(null);
  const newGuidsRef = useRef(new Set<string>());
  const refresh = () => queryClient.invalidateQueries({ queryKey: myCardReservationsQueryKey(userId) });
  const cancel = useMutation({
    mutationFn: (target: MyCardReservationCancelTarget) => cancelMyCardReservations(target),
    onSuccess: () => showToast({ message: t("myReservations.cancelled"), tone: "success" }),
    onError: (error) => showToast({ message: error.message || t("myReservations.cancelFailed"), tone: "destructive" }),
    onSettled: refresh,
  });
  const markSeen = useMutation({ mutationFn: markMyCardReservationAlertsSeen, onSettled: refresh });
  const alertedGuids = (reservations.data ?? [])
    .filter((reservation) => reservation.guestAlert !== null)
    .map((reservation) => reservation.guid);
  for (const guid of alertedGuids) newGuidsRef.current.add(guid);
  const alertedKey = alertedGuids.join(",");
  const markAlertsSeen = markSeen.mutate;

  useEffect(() => {
    if (alertedKey) markAlertsSeen(alertedKey.split(","));
  }, [alertedKey, markAlertsSeen]);

  const confirmCancel = (title: string, target: MyCardReservationCancelTarget) =>
    Alert.alert(title, t("myReservations.cancelConfirmDescription"), [
      { text: t("myReservations.keep"), style: "cancel" },
      { text: t("myReservations.cancel"), style: "destructive", onPress: () => cancel.mutate(target) },
    ]);

  const runAction = (option: string) => {
    const group = actionsFor;
    setActionsFor(null);
    if (!group) return;
    const [action, reservationGuid] = option.split(MY_CARD_RESERVATION_OPTION_SEPARATOR);
    const catalogUrl = group.reservations[0]?.catalogUrl;
    if (action === MY_CARD_RESERVATION_ACTION_OPEN_CATALOG && catalogUrl) void Linking.openURL(catalogUrl);
    if (action === MY_CARD_RESERVATION_ACTION_CANCEL_ALL) {
      const activeCount = group.reservations.filter((reservation) => isActiveCardReservationStatus(reservation.status)).length;
      confirmCancel(t("myReservations.cancelAllConfirmTitle", { count: activeCount }), {
        kind: "request",
        requestGuid: group.requestGuid,
      });
    }
    if (action === MY_CARD_RESERVATION_ACTION_CANCEL) {
      const reservation = group.reservations.find((candidate) => candidate.guid === reservationGuid);
      if (reservation) {
        confirmCancel(t("myReservations.cancelConfirmTitle", { name: reservation.card.name }), {
          kind: "reservation",
          reservationGuid: reservation.guid,
        });
      }
    }
  };

  const groupOptions = (group: MyCardReservationGroup) => {
    const active = group.reservations.filter((reservation) => isActiveCardReservationStatus(reservation.status));
    return [
      ...(group.reservations[0]?.catalogUrl
        ? [{ value: MY_CARD_RESERVATION_ACTION_OPEN_CATALOG, label: t("myReservations.openCatalog") }]
        : []),
      ...(active.length > 1
        ? [{ value: MY_CARD_RESERVATION_ACTION_CANCEL_ALL, label: t("myReservations.cancelAll", { count: active.length }) }]
        : []),
      ...active.map((reservation) => ({
        value: `${MY_CARD_RESERVATION_ACTION_CANCEL}${MY_CARD_RESERVATION_OPTION_SEPARATOR}${reservation.guid}`,
        label: t("myReservations.cancelCardOption", { card: reservation.card.name }),
      })),
    ];
  };

  if (reservations.isPending) {
    return (
      <CardReservationGroupsSkeleton
        groupCount={CARD_RESERVATION_SKELETON_GROUP_COUNT}
        cardsPerGroup={CARD_RESERVATION_SKELETON_CARDS_PER_GROUP}
      />
    );
  }
  if (reservations.isError) {
    return (
      <Callout
        tone="destructive"
        title={t("myReservations.loadFailed")}
        action={
          <Button
            size="sm"
            variant="secondary"
            label={t("recovery.retry")}
            loading={reservations.isRefetching}
            onPress={() => void reservations.refetch()}
          />
        }
      />
    );
  }
  const groups = groupReservationsByRequestGuid(reservations.data);
  if (groups.length === 0) {
    return <EmptyState icon="bookmark" title={t("myReservations.emptyTitle")} description={t("myReservations.emptyDescription")} />;
  }
  const isOpen = (group: MyCardReservationGroup) =>
    group.reservations.some((reservation) => isActiveCardReservationStatus(reservation.status));
  return (
    <View style={{ gap: SPACING.lg }}>
      <MyCardReservationSection
        title={t("myReservations.open")}
        groups={groups.filter(isOpen)}
        newGuids={newGuidsRef.current}
        onPressGroup={setActionsFor}
      />
      <MyCardReservationSection
        title={t("myReservations.past")}
        groups={groups.filter((group) => !isOpen(group))}
        newGuids={newGuidsRef.current}
        onPressGroup={setActionsFor}
      />
      <OptionSheet
        visible={!!actionsFor}
        title={actionsFor?.reservations[0]?.catalogName ?? t("myReservations.unknownCatalog")}
        options={actionsFor ? groupOptions(actionsFor) : []}
        emptyMessage={t("myReservations.noActions")}
        selected={[]}
        onSelect={runAction}
        onClose={() => setActionsFor(null)}
      />
    </View>
  );
}
