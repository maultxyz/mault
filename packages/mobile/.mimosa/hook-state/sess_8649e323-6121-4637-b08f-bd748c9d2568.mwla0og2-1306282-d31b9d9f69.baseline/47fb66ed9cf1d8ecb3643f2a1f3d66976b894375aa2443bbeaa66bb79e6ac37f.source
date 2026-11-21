import { useQuery } from "@tanstack/react-query";
import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Screen } from "@/components/ui/screen";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { usePickActions } from "@/features/business/api/use-pick-actions";
import { usePickWalk } from "@/features/business/api/use-pick-walk";
import { PickWalkEntryRow } from "@/features/business/components/pick-walk-entry-row";
import { PickWalkNextCard } from "@/features/business/components/pick-walk-next-card";
import { pickPlaceTitle } from "@/features/business/lib/pick-walk-labels";
import { useActiveOrgId } from "@/hooks/use-org";
import { useTheme } from "@/hooks/use-theme";
import { BUSINESS_LIST_SKELETON_ROWS, PICK_WALK_ORDERS_SEPARATOR } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";

export default function PickWalkScreen() {
  useKeepAwake();
  const { t } = useTranslation();
  const colors = useTheme();
  const orgId = useActiveOrgId();
  const { orders: ordersParam } = useLocalSearchParams<{ orders?: string }>();
  const orderGuids = useMemo(
    () => (ordersParam ?? "").split(PICK_WALK_ORDERS_SEPARATOR).filter(Boolean),
    [ordersParam],
  );
  const walk = usePickWalk(orderGuids);
  const access = useQuery(businessAccessQueryOptions(orgId));
  const actions = usePickActions();
  const canPick = !!access.data?.canFulfilOrders;
  const showOrderName = walk.openOrders.length > 1;
  const orderOf = (orderGuid: string) => walk.openOrders.find((order) => order.guid === orderGuid);
  const total = walk.entries.length;
  const title = walk.openOrders.length === 1 ? walk.openOrders[0].name : t("business.picks.walk.title");
  const progressText = t("business.picks.walk.progress", { picked: walk.pickedCount, total });

  const markMissing = (scanId: string) => {
    const entry = walk.entries.find((candidate) => candidate.scanId === scanId);
    const order = entry ? orderOf(entry.orderGuid) : undefined;
    if (entry && order) actions.confirmMissing(order, entry);
  };

  return (
    <Screen
      onRefresh={walk.refetch}
      header={
        <PageHeader
          title={title}
          subtitle={total > 0 ? progressText : null}
          onBack={() => router.back()}
          actions={
            canPick && walk.nextEntry ? (
              <IconButton
                icon="camera"
                accessibilityLabel={t("business.picks.walk.scanToPick")}
                onPress={() => router.push({ pathname: "/storage-card-scan", params: { pickOrders: ordersParam ?? "" } })}
              />
            ) : null
          }
        />
      }
    >
      {walk.isLoading ? (
        <ListSkeleton rows={BUSINESS_LIST_SKELETON_ROWS} />
      ) : walk.isError ? (
        <Callout
          tone="destructive"
          title={t("business.loadFailed")}
          action={<Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={() => void walk.refetch()} />}
        />
      ) : total === 0 ? (
        <EmptyState
          icon="checkAll"
          title={t("business.picks.walk.emptyTitle")}
          description={t("business.picks.walk.emptyDescription")}
        />
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.md }}>
            <AppText size="xs" tone="secondary" accessibilityRole="text" accessibilityLiveRegion="polite">
              {progressText}
            </AppText>
            <ProgressBar fraction={walk.pickedCount / total} accessibilityValue={{ min: 0, max: total, now: walk.pickedCount }} />
          </View>
          {!canPick && access.data ? <Callout tone="info" title={t("business.picks.noPermission")} /> : null}
          {walk.closedOrderCount > 0 ? (
            <Callout tone="info" title={t("business.picks.walk.closedSkipped", { count: walk.closedOrderCount })} />
          ) : null}
          {walk.shortOrders.length > 0 ? (
            <Callout
              tone="warning"
              title={t("business.picks.walk.shortPicks", { count: walk.shortOrders.length })}
              description={walk.shortOrders.map((order) => order.name).join(", ")}
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  label={t("business.picks.walk.openShort")}
                  onPress={() =>
                    router.push({ pathname: "/business/order/[guid]", params: { guid: walk.shortOrders[0].guid } })
                  }
                />
              }
            />
          ) : null}
          {walk.nextEntry ? (
            <PickWalkNextCard
              entry={walk.nextEntry}
              showOrderName={showOrderName}
              canPick={canPick}
              onPicked={() => walk.nextEntry && walk.setPicked([walk.nextEntry.scanId], true)}
              onMissing={() => walk.nextEntry && markMissing(walk.nextEntry.scanId)}
            />
          ) : (
            <Callout tone="success" title={t("business.picks.walk.allPicked")} />
          )}
          {canPick && walk.completedOrders.length > 0 ? (
            <Button
              size="lg"
              icon="send"
              label={t("business.picks.complete", { count: walk.completedOrders.length })}
              loading={actions.isCompleting}
              onPress={() =>
                actions.confirmComplete(walk.completedOrders, () => {
                  if (walk.completedOrders.length === walk.openOrders.length) router.back();
                })
              }
            />
          ) : null}
          {walk.stops.map((stop) => {
            const pickedInStop = stop.entries.filter((entry) => walk.pickedScanIds.has(entry.scanId)).length;
            const isDone = pickedInStop === stop.entries.length;
            return (
              <View key={stop.stopKey} style={{ gap: SPACING.xs }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
                  <Icon name={isDone ? "success" : "storage"} size={18} color={isDone ? colors.successForeground : colors.foreground} />
                  <AppText weight="semibold" numberOfLines={1} accessibilityRole="header" style={{ flex: 1 }}>
                    {pickPlaceTitle(stop, t)}
                  </AppText>
                  <AppText size="xs" tone="secondary">
                    {t("business.picks.walk.stopProgress", { picked: pickedInStop, total: stop.entries.length })}
                  </AppText>
                </View>
                <ListGroup>
                  {stop.entries.map((entry) => {
                    const isPicked = walk.pickedScanIds.has(entry.scanId);
                    return (
                      <PickWalkEntryRow
                        key={entry.scanId}
                        entry={entry}
                        isPicked={isPicked}
                        showOrderName={showOrderName}
                        canPick={canPick}
                        onToggle={() => walk.setPicked([entry.scanId], !isPicked)}
                        onMissing={() => markMissing(entry.scanId)}
                      />
                    );
                  })}
                </ListGroup>
              </View>
            );
          })}
        </>
      )}
    </Screen>
  );
}
