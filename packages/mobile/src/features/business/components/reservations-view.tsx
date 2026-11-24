import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import {
  CARD_RESERVATION_LIST_VIEWS,
  MISSING_PRICE_TEXT,
  formatPrice,
  cardReservationGroupStage,
  cardReservationGroupStageCounts,
  cardReservationStage,
  groupCardReservationsByRequest,
  isActiveCardReservationStatus,
  type CardReservationListView,
  type CardReservationRequestGroup,
  CARD_RESERVATION_CLOSED_STATUSES,
  CARD_RESERVATION_OPEN_STAGES,
  type CardReservationStage,
} from "@magic-vault/shared";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconBadge } from "@/components/ui/icon-badge";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { CardReservationGroupsSkeleton } from "@/features/card-reservations/components/card-reservation-groups-skeleton";
import { OptionSheet } from "@/components/ui/option-sheet";
import { Pill } from "@/components/ui/pill";
import { SectionHeader } from "@/components/ui/section-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  cardReservationsQueryOptions,
  collectCardReservations,
  createCardReservationPick,
  releaseCardReservations,
} from "@/features/business/api/business";
import { useBusinessAction } from "@/features/business/api/use-business-action";
import { BusinessListSearch } from "@/features/business/components/business-list-search";
import { BusinessStatusFilter } from "@/features/business/components/business-status-filter";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { tradeOfferPlacementLines } from "@/features/trade-offers/lib/placement-lines";
import { useActiveOrgId } from "@/hooks/use-org";
import {
  BUSINESS_LIST_SEARCH_DEBOUNCE_MS,
  CARD_RESERVATION_ACTION_COLLECT,
  CARD_RESERVATION_ACTION_OPEN_PICK,
  CARD_RESERVATION_ACTION_PICK,
  CARD_RESERVATION_ACTION_RELEASE,
  CARD_RESERVATION_OPTION_SEPARATOR,
  CARD_RESERVATION_REQUEST_OPTION_TARGET,
  CARD_RESERVATION_STAGE_TONES,
} from "@/lib/constants/business";
import {
  CARD_RESERVATION_SKELETON_CARDS_PER_GROUP,
  CARD_RESERVATION_SKELETON_GROUP_COUNT,
} from "@/lib/constants/card-reservations";
import { LIST_ROW_ICON_SIZE } from "@/lib/constants/ui";
import { SPACING } from "@/lib/constants/theme";
import type {
  BusinessListViewProps,
  CardReservationGroupProps,
  CardReservationRequestSectionProps,
  MobileCardReservationTarget,
} from "@/lib/interfaces/business";
import { guestKindLabelKey } from "@/lib/guest-kind";

function CardReservationGroup({ group, onPress }: CardReservationGroupProps) {
  const { t, i18n } = useTranslation();
  const formatDateTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" }) : "";
  const activeCount = group.heldCount + group.waitingCount;
  const priceSource = group.reservations[0]?.priceSource;
  const customerSubtitle = [
    group.isFromAccount === null ? null : t(guestKindLabelKey(group.isFromAccount)),
    group.guestContact,
    [group.catalogName, formatDateTime(group.createdAt)].filter(Boolean).join(" · "),
    group.guestNote,
    activeCount > 0
      ? t("business.reservations.groupSummary", {
          cards: t("business.reservations.cardCount", { count: group.reservations.length }),
          stages: cardReservationGroupStageCounts(group)
            .map(({ stage, count }) => t(`business.reservations.stageCounts.${stage}`, { count }))
            .join(", "),
        })
      : null,
    group.heldCount > 0 && priceSource
      ? t(
          group.hasMissingHeldPrices
            ? "business.reservations.heldTotalMissingPrices"
            : "business.reservations.heldTotal",
          { total: formatPrice(group.heldPriceTotal, priceSource) },
        )
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <ListGroup>
      <ListRow
        leading={<IconBadge name="bookmark" size={LIST_ROW_ICON_SIZE} />}
        title={group.guestName}
        subtitle={customerSubtitle}
        subtitleNumberOfLines={6}
        accessibilityHint={onPress ? t("business.reservations.customerHint") : undefined}
        onPress={onPress}
      />
      {group.reservations.map((reservation) => {
        const { card } = reservation;
        const isActive = isActiveCardReservationStatus(reservation.status);
        const stage = cardReservationStage(reservation);
        const timing =
          reservation.status === "ready"
            ? reservation.holdExpiresAt
              ? t("business.reservations.heldUntil", { date: formatDateTime(reservation.holdExpiresAt) })
              : null
            : reservation.status === "waiting"
              ? t("business.reservations.inLinePosition", {
                  position: reservation.queuePosition ?? 0,
                  total: reservation.queueLength,
                })
              : t("business.reservations.closedOn", { date: formatDateTime(reservation.closedAt) });
        const placement = isActive
          ? (tradeOfferPlacementLines([reservation.placement], t)[0]?.text ?? null)
          : null;
        const priceLabel =
          reservation.price == null
            ? t("tradeOffers.cardList.noPrice")
            : formatPrice(reservation.price, reservation.priceSource);
        return (
          <ListRow
            key={reservation.guid}
            leading={<CardThumbnail imageUrl={card.imageUrl} />}
            title={card.name}
            subtitle={[
              [
                card.setName || card.setCode.toUpperCase(),
                t(`trade.conditions.${card.condition}`),
                card.isFoil ? t("tradeOffers.cardList.foil") : null,
              ]
                .filter(Boolean)
                .join(" · "),
              timing,
              stage === "beingPicked" && reservation.pickOrderName
                ? t("business.reservations.inPick", { name: reservation.pickOrderName })
                : null,
              placement,
            ]
              .filter(Boolean)
              .join("\n")}
            subtitleNumberOfLines={4}
            right={
              <View style={{ alignItems: "flex-end", gap: SPACING.xs, flexShrink: 0 }}>
                {isActive ? (
                  <AppText weight="semibold" numberOfLines={1} accessibilityLabel={priceLabel}>
                    {reservation.price == null ? MISSING_PRICE_TEXT : priceLabel}
                  </AppText>
                ) : null}
                <Pill
                  label={t(`business.reservations.stages.${stage}`)}
                  tone={CARD_RESERVATION_STAGE_TONES[stage]}
                />
              </View>
            }
            accessibilityHint={onPress && isActive ? t("business.reservations.cardHint") : undefined}
            onPress={onPress && isActive ? onPress : undefined}
          />
        );
      })}
    </ListGroup>
  );
}

function CardReservationRequestSection({ title, groups, onPressGroup }: CardReservationRequestSectionProps) {
  if (groups.length === 0) return null;
  return (
    <View style={{ gap: SPACING.sm }}>
      <SectionHeader title={title} />
      <View style={{ gap: SPACING.md }}>
        {groups.map((group) => (
          <CardReservationGroup
            key={group.requestGuid}
            group={group}
            onPress={onPressGroup ? () => onPressGroup(group) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

export function ReservationsView({ canAct }: BusinessListViewProps) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const { run } = useBusinessAction();
  const [listView, setListView] = useState<CardReservationListView>(CARD_RESERVATION_LIST_VIEWS[0]);
  const [actionsFor, setActionsFor] = useState<CardReservationRequestGroup | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), BUSINESS_LIST_SEARCH_DEBOUNCE_MS);
  const reservations = useQuery(cardReservationsQueryOptions(orgId, listView, true, debouncedSearch));
  const [stageFilter, setStageFilter] = useState<CardReservationStage | null>(null);
  const filterStages: readonly CardReservationStage[] =
    listView === "active" ? CARD_RESERVATION_OPEN_STAGES : CARD_RESERVATION_CLOSED_STATUSES;
  const groups = groupCardReservationsByRequest(reservations.data ?? []).filter(
    (group) => !stageFilter || cardReservationGroupStage(group) === stageFilter,
  );
  const readyGroups = groups.filter((group) => cardReservationGroupStage(group) === "readyForPickup");
  const pullGroups = groups.filter((group) => {
    const stage = cardReservationGroupStage(group);
    return stage === "toPull" || stage === "beingPicked";
  });
  const waitingGroups = groups.filter((group) => cardReservationGroupStage(group) === "waiting");
  const onPressGroup = canAct && listView === "active" ? setActionsFor : undefined;

  const confirmCollect = (group: CardReservationRequestGroup, target: MobileCardReservationTarget) => {
    const reservation =
      target.kind === "reservation"
        ? group.reservations.find((candidate) => candidate.guid === target.reservationGuid)
        : null;
    const priceSource = group.reservations[0]?.priceSource;
    const title = reservation
      ? t("business.reservations.collectConfirmTitle", { name: reservation.card.name })
      : t("business.reservations.collectGroupConfirmTitle", { count: group.heldCount, name: group.guestName });
    const description = reservation
      ? reservation.price == null
        ? t("business.reservations.collectConfirmDescriptionNoPrice")
        : t("business.reservations.collectConfirmDescription", {
            price: formatPrice(reservation.price, reservation.priceSource),
          })
      : [
          t(
            group.hasMissingHeldPrices
              ? "business.reservations.collectGroupConfirmDescriptionMissingPrices"
              : "business.reservations.collectGroupConfirmDescription",
            {
              count: group.heldCount,
              total: priceSource ? formatPrice(group.heldPriceTotal, priceSource) : "",
            },
          ),
          group.waitingCount > 0
            ? t("business.reservations.collectGroupWaitingNote", { count: group.waitingCount })
            : null,
        ]
          .filter(Boolean)
          .join(" ");
    const success = reservation
      ? t("business.reservations.collected", { name: reservation.card.name })
      : t("business.reservations.collectedGroup", { count: group.heldCount, name: group.guestName });
    Alert.alert(title, description, [
      { text: t("business.back"), style: "cancel" },
      {
        text: reservation
          ? t("business.reservations.pickedUp")
          : t("business.reservations.pickedUpGroup", { count: group.heldCount }),
        onPress: () => void run(() => collectCardReservations(target), success),
      },
    ]);
  };

  const confirmRelease = (group: CardReservationRequestGroup, target: MobileCardReservationTarget) => {
    const activeCount = group.heldCount + group.waitingCount;
    const reservation =
      target.kind === "reservation"
        ? group.reservations.find((candidate) => candidate.guid === target.reservationGuid)
        : null;
    const title = reservation
      ? t("business.reservations.releaseCardConfirmTitle", { card: reservation.card.name, name: group.guestName })
      : t("business.reservations.releaseGroupConfirmTitle", { count: activeCount, name: group.guestName });
    const description = reservation
      ? t("business.reservations.releaseConfirmDescription")
      : t("business.reservations.releaseGroupConfirmDescription", { count: activeCount });
    const success = reservation
      ? t("business.reservations.releasedCard", { card: reservation.card.name, name: group.guestName })
      : t("business.reservations.releasedGroup", { count: activeCount, name: group.guestName });
    Alert.alert(title, description, [
      { text: t("business.back"), style: "cancel" },
      {
        text: reservation
          ? t("business.reservations.release")
          : t("business.reservations.releaseGroup", { count: activeCount }),
        style: "destructive",
        onPress: () => void run(() => releaseCardReservations(target), success),
      },
    ]);
  };

  const groupOptions = (group: CardReservationRequestGroup) => {
    const activeCount = group.heldCount + group.waitingCount;
    const requestOption = (action: string) =>
      `${action}${CARD_RESERVATION_OPTION_SEPARATOR}${CARD_RESERVATION_REQUEST_OPTION_TARGET}`;
    const active = group.reservations.filter((reservation) => isActiveCardReservationStatus(reservation.status));
    return [
      ...(group.toPullCount > 0
        ? [
            {
              value: requestOption(CARD_RESERVATION_ACTION_PICK),
              label: t("business.reservations.createPick", { count: group.toPullCount }),
            },
          ]
        : []),
      ...group.pickOrders.map((order) => ({
        value: `${CARD_RESERVATION_ACTION_OPEN_PICK}${CARD_RESERVATION_OPTION_SEPARATOR}${order.guid}`,
        label: t("business.reservations.openPick", { name: order.name }),
      })),
      ...(group.heldCount > 0
        ? [
            {
              value: requestOption(CARD_RESERVATION_ACTION_COLLECT),
              label: t("business.reservations.pickedUpGroup", { count: group.heldCount }),
            },
          ]
        : []),
      {
        value: requestOption(CARD_RESERVATION_ACTION_RELEASE),
        label: t("business.reservations.releaseGroup", { count: activeCount }),
      },
      ...(activeCount > 1
        ? active.flatMap((reservation) => [
            ...(reservation.status === "ready"
              ? [
                  {
                    value: `${CARD_RESERVATION_ACTION_COLLECT}${CARD_RESERVATION_OPTION_SEPARATOR}${reservation.guid}`,
                    label: t("business.reservations.pickedUpCardOption", { card: reservation.card.name }),
                  },
                ]
              : []),
            {
              value: `${CARD_RESERVATION_ACTION_RELEASE}${CARD_RESERVATION_OPTION_SEPARATOR}${reservation.guid}`,
              label: t("business.reservations.releaseCardOption", { card: reservation.card.name }),
            },
          ])
        : []),
    ];
  };

  const runAction = (option: string) => {
    const group = actionsFor;
    setActionsFor(null);
    if (!group) return;
    const [action, targetId] = option.split(CARD_RESERVATION_OPTION_SEPARATOR);
    if (action === CARD_RESERVATION_ACTION_OPEN_PICK) {
      router.push({ pathname: "/business/order/[guid]", params: { guid: targetId } });
      return;
    }
    if (action === CARD_RESERVATION_ACTION_PICK) {
      void run(
        () =>
          createCardReservationPick(group.requestGuid, {
            name: t("business.reservations.pickName", { name: group.guestName }),
          }),
        t("business.reservations.pickCreated", { count: group.toPullCount, name: group.guestName }),
        (created) =>
          router.push({ pathname: "/business/order/[guid]", params: { guid: created.orderGuid } }),
      );
      return;
    }
    const target: MobileCardReservationTarget =
      targetId === CARD_RESERVATION_REQUEST_OPTION_TARGET
        ? { kind: "request", requestGuid: group.requestGuid }
        : { kind: "reservation", reservationGuid: targetId };
    if (action === CARD_RESERVATION_ACTION_COLLECT) confirmCollect(group, target);
    if (action === CARD_RESERVATION_ACTION_RELEASE) confirmRelease(group, target);
  };

  const content = reservations.isPending ? (
    <CardReservationGroupsSkeleton
      groupCount={CARD_RESERVATION_SKELETON_GROUP_COUNT}
      cardsPerGroup={CARD_RESERVATION_SKELETON_CARDS_PER_GROUP}
    />
  ) : reservations.isError ? (
    <Callout
      tone="destructive"
      title={t("business.loadFailed")}
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
  ) : groups.length === 0 ? (
    <EmptyState
      icon="bookmark"
      title={
        debouncedSearch || stageFilter
          ? t("business.search.noResultsTitle")
          : t(`business.reservations.empty.${listView}Title`)
      }
      description={
        debouncedSearch
          ? t("business.search.noResultsDescription", { query: debouncedSearch })
          : stageFilter
            ? t("business.filters.noMatchesDescription")
            : t(`business.reservations.empty.${listView}Description`)
      }
    />
  ) : listView === "active" ? (
    <>
      <CardReservationRequestSection
        title={t("business.reservations.readySection", { count: readyGroups.length })}
        groups={readyGroups}
        onPressGroup={onPressGroup}
      />
      <CardReservationRequestSection
        title={t("business.reservations.pullSection", { count: pullGroups.length })}
        groups={pullGroups}
        onPressGroup={onPressGroup}
      />
      <CardReservationRequestSection
        title={t("business.reservations.waitingSection", { count: waitingGroups.length })}
        groups={waitingGroups}
        onPressGroup={onPressGroup}
      />
    </>
  ) : (
    <CardReservationRequestSection title={t("business.reservations.lists.closed")} groups={groups} />
  );

  return (
    <View style={{ gap: SPACING.lg }}>
      <SegmentedControl<CardReservationListView>
        options={CARD_RESERVATION_LIST_VIEWS.map((value) => ({
          value,
          label: t(`business.reservations.lists.${value}`),
        }))}
        value={listView}
        onChange={(nextView) => {
          setListView(nextView);
          setStageFilter(null);
        }}
      />
      <View style={{ gap: SPACING.sm }}>
        <BusinessListSearch
          value={search}
          onChange={setSearch}
          placeholder={t("business.search.reservationsPlaceholder")}
        />
        <BusinessStatusFilter<CardReservationStage>
          statuses={filterStages}
          value={stageFilter}
          onChange={setStageFilter}
          labelOf={(stage) => t(`business.reservations.stages.${stage}`)}
        />
      </View>
      {content}
      <OptionSheet
        visible={!!actionsFor}
        title={actionsFor?.guestName ?? ""}
        description={actionsFor ? [actionsFor.guestContact, actionsFor.guestNote].filter(Boolean).join("\n") : undefined}
        options={actionsFor ? groupOptions(actionsFor) : []}
        selected={[]}
        onSelect={runAction}
        onClose={() => setActionsFor(null)}
      />
    </View>
  );
}
