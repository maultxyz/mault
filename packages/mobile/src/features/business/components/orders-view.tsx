import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { ORDER_PICK_LINK_MAX_ORDERS } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Pill } from "@/components/ui/pill";
import { SectionHeader } from "@/components/ui/section-header";
import { orderQueryOptions, ordersQueryOptions } from "@/features/business/api/business";
import { useActiveOrgId } from "@/hooks/use-org";
import { BUSINESS_LIST_SKELETON_ROWS, BUSINESS_STATUS_TONES, PICK_WALK_ORDERS_SEPARATOR } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { BusinessListViewProps, OrderRowProps } from "@/lib/interfaces/business";

function OrderRow({ order, onPress, onPressIn }: OrderRowProps) {
  const { t, i18n } = useTranslation();
  const date = new Date(order.createdAt).toLocaleDateString(i18n.language, { dateStyle: "medium" });
  const progress =
    order.status === "open"
      ? t("business.picks.rowProgress", { picked: order.picked, quantity: order.quantity, allocated: order.allocated })
      : t("business.picks.rowCards", { count: order.quantity });
  return (
    <ListRow
      icon="checkAll"
      title={order.name}
      subtitle={`${progress}\n${date}`}
      subtitleNumberOfLines={2}
      right={<Pill label={t(`business.status.${order.status}`)} tone={BUSINESS_STATUS_TONES[order.status]} />}
      accessibilityHint={t("business.picks.openHint")}
      onPress={onPress}
      onPressIn={onPressIn}
    />
  );
}

export function OrdersView({ canAct }: BusinessListViewProps) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const orders = useInfiniteQuery(ordersQueryOptions(orgId, true));
  const prefetchOrder = (guid: string) => void queryClient.prefetchQuery(orderQueryOptions(guid));
  const items = orders.data?.pages.flatMap((page) => page.items) ?? [];
  const openOrders = items.filter((order) => order.status === "open");
  const closedOrders = items.filter((order) => order.status !== "open");
  const openOrderPage = (guid: string) => router.push({ pathname: "/business/order/[guid]", params: { guid } });
  const pickableOrderGuids = openOrders
    .filter((order) => order.allocated > 0)
    .slice(0, ORDER_PICK_LINK_MAX_ORDERS)
    .map((order) => order.guid);

  if (orders.isPending) return <ListSkeleton rows={BUSINESS_LIST_SKELETON_ROWS} />;
  if (orders.isError) {
    return (
      <Callout
        tone="destructive"
        title={t("business.loadFailed")}
        action={
          <Button
            size="sm"
            variant="secondary"
            label={t("recovery.retry")}
            loading={orders.isRefetching}
            onPress={() => void orders.refetch()}
          />
        }
      />
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon="checkAll"
        title={t("business.picks.emptyTitle")}
        description={t("business.picks.emptyDescription")}
        action={
          canAct ? <Button icon="plus" label={t("business.picks.new")} onPress={() => router.push("/business/pick-new")} /> : undefined
        }
      />
    );
  }
  return (
    <View style={{ gap: SPACING.lg }}>
      {canAct && pickableOrderGuids.length > 1 ? (
        <Button
          icon="checkAll"
          label={t("business.picks.pickAllOpen", { count: pickableOrderGuids.length })}
          onPress={() =>
            router.push({ pathname: "/business/pick", params: { orders: pickableOrderGuids.join(PICK_WALK_ORDERS_SEPARATOR) } })
          }
        />
      ) : null}
      {openOrders.length > 0 ? (
        <View style={{ gap: SPACING.sm }}>
          <SectionHeader title={t("business.picks.openSection")} />
          <ListGroup>
            {openOrders.map((order) => (
              <OrderRow
                key={order.guid}
                order={order}
                onPress={() => openOrderPage(order.guid)}
                onPressIn={() => prefetchOrder(order.guid)}
              />
            ))}
          </ListGroup>
        </View>
      ) : null}
      {closedOrders.length > 0 ? (
        <View style={{ gap: SPACING.sm }}>
          <SectionHeader title={t("business.picks.closedSection")} />
          <ListGroup>
            {closedOrders.map((order) => (
              <OrderRow
                key={order.guid}
                order={order}
                onPress={() => openOrderPage(order.guid)}
                onPressIn={() => prefetchOrder(order.guid)}
              />
            ))}
          </ListGroup>
        </View>
      ) : null}
      {orders.hasNextPage ? (
        <Button
          variant="secondary"
          label={t("business.showMore")}
          loading={orders.isFetchingNextPage}
          onPress={() => void orders.fetchNextPage()}
        />
      ) : null}
    </View>
  );
}
