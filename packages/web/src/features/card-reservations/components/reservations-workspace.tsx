import { ConfirmDialog } from "@/components/confirm-dialog";
import { EmptyState } from "@/components/empty-state";
import { ListSkeleton } from "@/components/list-skeleton";
import { LoadErrorCallout } from "@/components/load-error-callout";
import { MobilePageHeader } from "@/components/mobile-page-header";
import { PageHeader } from "@/components/page-header";
import { ResponsiveSegmented } from "@/components/responsive-segmented";
import { useBusinessAccess, useBusinessAction } from "@/features/business/api/use-business";
import { BusinessUpgradeCallout } from "@/features/business/components/business-upgrade-callout";
import {
  cardReservationsQueryOptions,
  collectCardReservations,
  createCardReservationPick,
  releaseCardReservations,
} from "@/features/card-reservations/api/card-reservations";
import { CardReservationRequestCard } from "@/features/card-reservations/components/card-reservation-request-card";
import { CardReservationRequestList } from "@/features/card-reservations/components/card-reservation-request-list";
import { cardReservationBusyKey } from "@/features/card-reservations/lib/card-reservation-busy-key";
import { useCardReservationConfirmText } from "@/features/card-reservations/lib/use-card-reservation-confirm-text";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  CARD_RESERVATION_LIST_SKELETON_COUNT,
  CARD_RESERVATION_REQUEST_PARAM,
} from "@/lib/constants/card-reservations";
import { BUSINESS_LIST_SEARCH_DEBOUNCE_MS } from "@/lib/constants/business";
import { ListSearchInput } from "@/components/list-search-input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { MOBILE_NAV_SCROLL_PADDING_CLASS } from "@/lib/constants/nav";
import type {
  CardReservationActionTarget,
  CardReservationConfirmation,
  CardReservationRequestSectionProps,
  ReservationsWorkspaceProps,
} from "@/lib/interfaces/card-reservations";
import { cn } from "@/lib/utils";
import {
  BUSINESS_LIST_SEARCH_MAX_LENGTH,
  CARD_RESERVATION_LIST_VIEWS,
  cardReservationGroupStage,
  groupCardReservationsByRequest,
  type CardReservationListView,
  type CardReservationRequestGroup,
} from "@magic-vault/shared";
import { IconBookmark } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

function CardReservationRequestSection({
  title,
  description,
  groups,
  ...handlers
}: CardReservationRequestSectionProps) {
  const headingId = useId();
  if (groups.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div>
        <h2 id={headingId} className="text-sm font-semibold">
          {title}
        </h2>
        {description && <p className="text-xs text-foreground/70">{description}</p>}
      </div>
      <div className="flex flex-col gap-2">
        {groups.map((group) => (
          <CardReservationRequestCard key={group.requestGuid} group={group} {...handlers} />
        ))}
      </div>
    </section>
  );
}

export function ReservationsWorkspace({ switcher }: ReservationsWorkspaceProps) {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const { orgId, access } = useBusinessAccess();
  const runBusinessAction = useBusinessAction();
  const confirmText = useCardReservationConfirmText();
  const [view, setView] = useState<CardReservationListView>(CARD_RESERVATION_LIST_VIEWS[0]);
  const [confirmation, setConfirmation] = useState<CardReservationConfirmation>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState("");
  const debouncedListSearch = useDebouncedValue(listSearch.trim(), BUSINESS_LIST_SEARCH_DEBOUNCE_MS);
  const list = useQuery(cardReservationsQueryOptions(orgId, view, debouncedListSearch));
  const listSearchInput = (
    <ListSearchInput
      value={listSearch}
      onChange={setListSearch}
      placeholder={t("search.reservationsPlaceholder")}
      maxLength={BUSINESS_LIST_SEARCH_MAX_LENGTH}
    />
  );
  const emptyTitle = debouncedListSearch
    ? t("search.noResultsTitle")
    : t(`reservations.empty.${view}Title`);
  const emptyDescription = debouncedListSearch
    ? t("search.noResultsDescription", { query: debouncedListSearch })
    : t(`reservations.empty.${view}Description`);
  const groups = groupCardReservationsByRequest(list.data ?? []);
  const readyGroups = groups.filter((group) => cardReservationGroupStage(group) === "readyForPickup");
  const pullGroups = groups.filter((group) => {
    const stage = cardReservationGroupStage(group);
    return stage === "toPull" || stage === "beingPicked";
  });
  const waitingGroups = groups.filter((group) => cardReservationGroupStage(group) === "waiting");
  const listedGroups =
    view === "active" ? [...readyGroups, ...pullGroups, ...waitingGroups] : groups;
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedGuid = searchParams.get(CARD_RESERVATION_REQUEST_PARAM);
  const selectedGroup =
    listedGroups.find((group) => group.requestGuid === requestedGuid) ?? listedGroups[0] ?? null;
  const selectRequest = (requestGuid: string) =>
    setSearchParams({ [CARD_RESERVATION_REQUEST_PARAM]: requestGuid }, { replace: true });
  const changeView = (nextView: CardReservationListView) => {
    setView(nextView);
    setSearchParams({}, { replace: true });
  };
  const canAct = !!access?.canFulfilOrders && !access.isLocked;
  const handlers = {
    canAct,
    busyKey,
    onCollect: (target: CardReservationActionTarget) =>
      setConfirmation({ action: "collect", target }),
    onRelease: (target: CardReservationActionTarget) =>
      setConfirmation({ action: "release", target }),
    onCreatePick: (group: CardReservationRequestGroup) => void createPick(group),
  };

  async function createPick(group: CardReservationRequestGroup) {
    setBusyKey(cardReservationBusyKey({ kind: "request", group }, "pick"));
    await runBusinessAction(
      () =>
        createCardReservationPick(group.requestGuid, {
          name: t("reservations.pickName", { name: group.guestName }),
        }),
      t("reservations.pickCreated", { count: group.toPullCount, name: group.guestName }),
    );
    setBusyKey(null);
  }

  const confirm = async () => {
    if (!confirmation) return;
    const { action, target } = confirmation;
    setBusyKey(cardReservationBusyKey(target));
    const text = confirmText(confirmation);
    await runBusinessAction<unknown>(
      () =>
        action === "collect" ? collectCardReservations(target) : releaseCardReservations(target),
      text.success,
    );
    setBusyKey(null);
    setConfirmation(null);
  };

  const viewSwitch = (
    <ResponsiveSegmented<CardReservationListView>
      label={t("reservations.listLabel")}
      items={CARD_RESERVATION_LIST_VIEWS.map((listView) => ({
        key: listView,
        label: t(`reservations.lists.${listView}`),
      }))}
      value={view}
      onChange={changeView}
    />
  );

  const content = list.isPending ? (
    <ListSkeleton rows={CARD_RESERVATION_LIST_SKELETON_COUNT} />
  ) : list.isError ? (
    <LoadErrorCallout message={t("errors.loadFailed")} onRetry={() => void list.refetch()} />
  ) : groups.length === 0 ? (
    <EmptyState icon={IconBookmark} title={emptyTitle} description={emptyDescription} />
  ) : view === "active" ? (
    <>
      <CardReservationRequestSection
        title={t("reservations.readySection", { count: readyGroups.length })}
        description={t("reservations.readySectionDescription")}
        groups={readyGroups}
        {...handlers}
      />
      <CardReservationRequestSection
        title={t("reservations.pullSection", { count: pullGroups.length })}
        description={t("reservations.pullSectionDescription")}
        groups={pullGroups}
        {...handlers}
      />
      <CardReservationRequestSection
        title={t("reservations.waitingSection", { count: waitingGroups.length })}
        description={t("reservations.waitingSectionDescription")}
        groups={waitingGroups}
        {...handlers}
      />
    </>
  ) : (
    <CardReservationRequestSection
      title={t("reservations.lists.closed")}
      groups={groups}
      {...handlers}
      canAct={false}
    />
  );

  const shownConfirmText = confirmation ? confirmText(confirmation) : null;
  const confirmDialog = (
    <ConfirmDialog
      open={confirmation !== null}
      onOpenChange={(open) => {
        if (!open) setConfirmation(null);
      }}
      title={shownConfirmText?.title ?? ""}
      description={shownConfirmText?.description ?? ""}
      confirmLabel={shownConfirmText?.confirmLabel ?? ""}
      cancelLabel={t("actions.back")}
      destructive={confirmation?.action === "release"}
      isPending={busyKey !== null}
      onConfirm={() => void confirm()}
    />
  );

  if (isMobile) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col">
        <MobilePageHeader title={t("views.reservations")} />
        <div className={cn("min-h-0 flex-1 overflow-y-auto", MOBILE_NAV_SCROLL_PADDING_CLASS)}>
          <div className="flex flex-col gap-4 p-4">
            {switcher}
            {access?.isLocked && <BusinessUpgradeCallout />}
            {viewSwitch}
            {listSearchInput}
            {content}
          </div>
        </div>
        {confirmDialog}
      </div>
    );
  }

  const sidebarList = list.isPending ? (
    <ListSkeleton rows={CARD_RESERVATION_LIST_SKELETON_COUNT} />
  ) : list.isError ? null : groups.length === 0 ? (
    <EmptyState size="compact" icon={IconBookmark} title={emptyTitle} description={emptyDescription} />
  ) : (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
      {view === "active" ? (
        <>
          <CardReservationRequestList
            title={t("reservations.readySection", { count: readyGroups.length })}
            groups={readyGroups}
            selectedRequestGuid={selectedGroup?.requestGuid ?? null}
            onSelect={selectRequest}
          />
          <CardReservationRequestList
            title={t("reservations.pullSection", { count: pullGroups.length })}
            groups={pullGroups}
            selectedRequestGuid={selectedGroup?.requestGuid ?? null}
            onSelect={selectRequest}
          />
          <CardReservationRequestList
            title={t("reservations.waitingSection", { count: waitingGroups.length })}
            groups={waitingGroups}
            selectedRequestGuid={selectedGroup?.requestGuid ?? null}
            onSelect={selectRequest}
          />
        </>
      ) : (
        <CardReservationRequestList
          title={t("reservations.lists.closed")}
          groups={groups}
          selectedRequestGuid={selectedGroup?.requestGuid ?? null}
          onSelect={selectRequest}
        />
      )}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="grid min-h-0 flex-1 grid-cols-12 overflow-hidden">
        <section className="col-span-4 flex h-full flex-col gap-2 overflow-hidden border-r bg-sidebar/70 p-2 lg:col-span-3">
          {switcher}
          {viewSwitch}
          {listSearchInput}
          {sidebarList}
        </section>
        <section className="col-span-8 flex min-h-0 flex-col overflow-y-auto lg:col-span-9">
          <PageHeader
            title={t("views.reservations")}
            description={t("reservations.description")}
            spansFullWidth
          />
          <div className="flex flex-col gap-2 px-3 py-2">
            {access?.isLocked && <BusinessUpgradeCallout />}
            {list.isError ? (
              <LoadErrorCallout message={t("errors.loadFailed")} onRetry={() => void list.refetch()} />
            ) : selectedGroup ? (
              <CardReservationRequestCard
                key={selectedGroup.requestGuid}
                group={selectedGroup}
                {...handlers}
                canAct={handlers.canAct && view === "active"}
              />
            ) : (
              !list.isPending && (
                <EmptyState
                  icon={IconBookmark}
                  title={emptyTitle}
                  description={
                    debouncedListSearch
                      ? emptyDescription
                      : view === "active"
                        ? t("reservations.howItWorks")
                        : t("reservations.empty.closedDescription")
                  }
                />
              )
            )}
          </div>
        </section>
      </div>
      {confirmDialog}
    </div>
  );
}
