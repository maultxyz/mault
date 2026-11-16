import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Pill } from "@/components/ui/pill";
import { intakeLotCardsQueryOptions, intakeLotQueryOptions, intakeLotsQueryOptions } from "@/features/business/api/business";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { BUSINESS_LIST_SKELETON_ROWS, BUSINESS_STATUS_TONES } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { BusinessListViewProps, IntakeLotRowProps } from "@/lib/interfaces/business";

function IntakeLotRow({ lot, onPress, onPressIn }: IntakeLotRowProps) {
  const { t, i18n } = useTranslation();
  const { format } = usePricing();
  const offer = lot.status === "accepted" ? lot.paidTotal : lot.cashOffer;
  return (
    <ListRow
      icon="coins"
      title={lot.customerName}
      subtitle={`${t("business.intake.rowDetails", { count: lot.cardCount, collection: lot.collectionName })}\n${new Date(
        lot.createdAt,
      ).toLocaleDateString(i18n.language, { dateStyle: "medium" })}`}
      subtitleNumberOfLines={2}
      right={
        <View style={{ alignItems: "flex-end", gap: SPACING.xs, flexShrink: 0 }}>
          {offer != null ? (
            <AppText weight="semibold" numberOfLines={1}>
              {format(offer)}
            </AppText>
          ) : null}
          <Pill label={t(`business.status.${lot.status}`)} tone={BUSINESS_STATUS_TONES[lot.status]} />
        </View>
      }
      accessibilityHint={t("business.intake.openHint")}
      onPress={onPress}
      onPressIn={onPressIn}
    />
  );
}

export function IntakeLotsView({ canAct }: BusinessListViewProps) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const queryClient = useQueryClient();
  const lots = useInfiniteQuery(intakeLotsQueryOptions(orgId, true));
  const prefetchIntakeLot = (guid: string) => {
    void queryClient.prefetchQuery(intakeLotQueryOptions(guid));
    void queryClient.prefetchInfiniteQuery(intakeLotCardsQueryOptions(guid, false));
  };
  const items = lots.data?.pages.flatMap((page) => page.items) ?? [];

  if (lots.isPending) return <ListSkeleton rows={BUSINESS_LIST_SKELETON_ROWS} />;
  if (lots.isError) {
    return (
      <Callout
        tone="destructive"
        title={t("business.loadFailed")}
        action={
          <Button
            size="sm"
            variant="secondary"
            label={t("recovery.retry")}
            loading={lots.isRefetching}
            onPress={() => void lots.refetch()}
          />
        }
      />
    );
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon="coins"
        title={t("business.intake.emptyTitle")}
        description={t("business.intake.emptyDescription")}
        action={
          canAct ? (
            <Button icon="plus" label={t("business.intake.new")} onPress={() => router.push("/business/intake-new")} />
          ) : undefined
        }
      />
    );
  }
  return (
    <View style={{ gap: SPACING.md }}>
      <ListGroup>
        {items.map((lot) => (
          <IntakeLotRow
            key={lot.guid}
            lot={lot}
            onPress={() => router.push({ pathname: "/business/intake/[guid]", params: { guid: lot.guid } })}
            onPressIn={() => prefetchIntakeLot(lot.guid)}
          />
        ))}
      </ListGroup>
      {lots.hasNextPage ? (
        <Button
          variant="secondary"
          label={t("business.showMore")}
          loading={lots.isFetchingNextPage}
          onPress={() => void lots.fetchNextPage()}
        />
      ) : null}
    </View>
  );
}
