import { orderLineLabel, type OrderLine } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { OptionSheet } from "@/components/ui/option-sheet";
import { PageHeader } from "@/components/ui/page-header";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Pill } from "@/components/ui/pill";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTile } from "@/components/ui/stat-tile";
import { allocateOrder, cancelOrder, deleteOrder, orderQueryOptions } from "@/features/business/api/business";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { useBusinessAction } from "@/features/business/api/use-business-action";
import { usePickActions } from "@/features/business/api/use-pick-actions";
import { useActiveOrgId } from "@/hooks/use-org";
import { ApiResultError } from "@/lib/api/api-result-error";
import { useCompactCount } from "@/hooks/use-compact-count";
import { usePricing } from "@/hooks/use-pricing";
import { BUSINESS_STATUS_TONES } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { OrderLineRowProps } from "@/lib/interfaces/business";

function OrderLineRow({ line, pickedCount, isOpen, canAct, onFindSubstitute }: OrderLineRowProps) {
  const { t } = useTranslation();
  const isShort = isOpen && line.allocations.length < line.quantity;
  const details = [
    isOpen
      ? t("business.order.linePicked", { picked: pickedCount, quantity: line.quantity })
      : t("business.order.lineQuantity", { count: line.quantity }),
    line.condition,
    line.isFoil ? t("business.picks.walk.foil") : null,
    line.orderRef ? t("business.picks.walk.orderRef", { order: line.orderRef }) : null,
    isShort ? t("business.order.inStock", { count: line.allocations.length }) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <ListRow
      icon={isShort ? "warning" : pickedCount >= line.quantity && isOpen ? "success" : "multiCard"}
      title={orderLineLabel(line)}
      subtitle={details}
      subtitleNumberOfLines={2}
      right={
        isShort && canAct ? (
          <Button size="sm" variant="secondary" label={t("business.order.substitute")} onPress={onFindSubstitute} />
        ) : undefined
      }
      rightIsInteractive={isShort && canAct}
    />
  );
}

export default function OrderScreen() {
  const { guid } = useLocalSearchParams<{ guid: string }>();
  const { t, i18n } = useTranslation();
  const compactCount = useCompactCount();
  const orgId = useActiveOrgId();
  const { format } = usePricing();
  const order = useQuery(orderQueryOptions(guid));
  const access = useQuery(businessAccessQueryOptions(orgId));
  const actions = usePickActions();
  const { run: runAction } = useBusinessAction();
  const [menuOpen, setMenuOpen] = useState(false);
  const detail = order.data;
  const isOpen = detail?.status === "open";
  const canAct = !!access.data?.canFulfilOrders;
  const pickedByLine = new Map<number, number>();
  for (const entry of detail?.pullSheet ?? []) {
    if (entry.picked) pickedByLine.set(entry.lineIndex, (pickedByLine.get(entry.lineIndex) ?? 0) + 1);
  }
  const pickedOf = (line: OrderLine, index: number) => (isOpen ? (pickedByLine.get(index) ?? 0) : line.picked.length);
  const shortLineCount = isOpen ? (detail?.lines.filter((line) => line.allocations.length < line.quantity).length ?? 0) : 0;
  const isFullyPicked = !!detail && isOpen && detail.pullSheet.length > 0 && detail.pullSheet.every((entry) => entry.picked);

  const chooseMenuAction = (action: string) => {
    setMenuOpen(false);
    if (!detail) return;
    if (action === "reallocate") void runAction(() => allocateOrder(detail.guid), t("business.order.reallocated"));
    if (action === "cancel") {
      Alert.alert(t("business.order.cancelTitle"), t("business.order.cancelDescription"), [
        { text: t("business.back"), style: "cancel" },
        {
          text: t("business.order.cancelConfirm"),
          style: "destructive",
          onPress: () => void runAction(() => cancelOrder(detail.guid), t("business.order.cancelled")),
        },
      ]);
    }
    if (action === "delete") {
      Alert.alert(t("business.order.deleteTitle"), t("business.order.deleteDescription"), [
        { text: t("business.back"), style: "cancel" },
        {
          text: t("business.delete"),
          style: "destructive",
          onPress: () => void runAction(() => deleteOrder(detail.guid), t("business.order.deleted"), () => router.back()),
        },
      ]);
    }
  };

  const menuOptions = isOpen
    ? [
        { value: "reallocate", label: t("business.order.reallocate") },
        { value: "cancel", label: t("business.order.cancel") },
      ]
    : [{ value: "delete", label: t("business.delete") }];

  return (
    <Screen
      onRefresh={() => order.refetch()}
      header={
        <PageHeader
          title={detail?.name ?? t("business.order.title")}
          subtitle={
            detail
              ? t("business.order.subtitle", {
                  source: t(`business.order.sources.${detail.source}`),
                  date: new Date(detail.createdAt).toLocaleDateString(i18n.language, { dateStyle: "medium" }),
                })
              : null
          }
          onBack={() => router.back()}
          actions={
            detail && canAct ? (
              <IconButton icon="more" accessibilityLabel={t("business.order.moreActions")} onPress={() => setMenuOpen(true)} />
            ) : null
          }
        />
      }
    >
      {order.isPending ? (
        <PageSkeleton />
      ) : !detail && !(order.error instanceof ApiResultError) ? (
        <QueryErrorState onRetry={() => void order.refetch()} isRetrying={order.isFetching} />
      ) : !detail ? (
        <EmptyState
          icon="checkAll"
          title={t("business.order.notFound")}
          action={<Button variant="secondary" label={t("recovery.retry")} onPress={() => void order.refetch()} />}
        />
      ) : (
        <>
          <View style={{ flexDirection: "row" }}>
            <Pill label={t(`business.status.${detail.status}`)} tone={BUSINESS_STATUS_TONES[detail.status]} />
          </View>
          <StatGroup>
            <StatTile label={t("business.order.stats.quantity")} {...compactCount(detail.quantity)} />
            <StatTile label={t("business.order.stats.allocated")} {...compactCount(detail.allocated)} />
            <StatTile label={t("business.order.stats.picked")} {...compactCount(detail.picked)} />
            {detail.revenue != null ? (
              <StatTile label={t("business.order.stats.revenue")} value={format(detail.revenue)} />
            ) : null}
          </StatGroup>
          {shortLineCount > 0 ? (
            <Callout tone="warning" title={t("business.order.shortLines", { count: shortLineCount })} />
          ) : null}
          {isOpen && canAct && detail.pullSheet.length > 0 ? (
            <View style={{ gap: SPACING.sm }}>
              <Button
                size="lg"
                icon="checkAll"
                label={detail.picked > 0 ? t("business.order.continuePicking") : t("business.order.startPicking")}
                onPress={() => router.push({ pathname: "/business/pick", params: { orders: detail.guid } })}
              />
              {isFullyPicked ? (
                <Button
                  size="lg"
                  variant="secondary"
                  icon="send"
                  label={t("business.picks.complete", { count: 1 })}
                  loading={actions.isCompleting}
                  onPress={() => actions.confirmComplete([detail])}
                />
              ) : null}
            </View>
          ) : null}
          <View style={{ gap: SPACING.sm }}>
            <SectionHeader title={t("business.order.lines")} />
            <ListGroup>
              {detail.lines.map((line, index) => (
                <OrderLineRow
                  key={`${index}-${line.name}`}
                  line={line}
                  pickedCount={pickedOf(line, index)}
                  isOpen={isOpen}
                  canAct={canAct}
                  onFindSubstitute={() =>
                    router.push({
                      pathname: "/business/substitute",
                      params: { orderGuid: detail.guid, lineIndex: String(index) },
                    })
                  }
                />
              ))}
            </ListGroup>
          </View>
        </>
      )}
      <OptionSheet
        visible={menuOpen}
        title={detail?.name ?? t("business.order.title")}
        options={menuOptions}
        selected={[]}
        onSelect={chooseMenuAction}
        onClose={() => setMenuOpen(false)}
      />
    </Screen>
  );
}
