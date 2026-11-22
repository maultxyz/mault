import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
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
import { BusinessListSearch } from "@/features/business/components/business-list-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { intakeLotCardsQueryOptions, intakeLotQueryOptions, intakeLotsQueryOptions } from "@/features/business/api/business";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import {
  BUSINESS_LIST_SEARCH_DEBOUNCE_MS,
  BUSINESS_LIST_SKELETON_ROWS,
  BUSINESS_STATUS_TONES,
} from "@/lib/constants/business";
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
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), BUSINESS_LIST_SEARCH_DEBOUNCE_MS);
  const lots = useInfiniteQuery(intakeLotsQueryOptions(orgId, true, debouncedSearch));
  const searchInput = (
    <BusinessListSearch value={search} onChange={setSearch} placeholder={t("business.search.intakePlaceholder")} />
  );
  const prefetchIntakeLot = (guid: string) => {
    void queryClient.prefetchQuery(intakeLotQueryOptions(guid));
    void queryClient.prefetchInfiniteQuery(intakeLotCardsQueryOptions(guid, false));
  };
  const items = lots.data?.pages.flatMap((page) => page.items) ?? [];

  if (lots.isPending) {
    return (
      <View style={{ gap: SPACING.md }}>
        {searchInput}
        <ListSkeleton rows={BUSINESS_LIST_SKELETON_ROWS} />
      </View>
    );
  }
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
  if (items.length === 0 && debouncedSearch) {
    return (
      <View style={{ gap: SPACING.md }}>
        {searchInput}
        <EmptyState
          icon="coins"
          title={t("business.search.noResultsTitle")}
          description={t("business.search.noResultsDescription", { query: debouncedSearch })}
        />
      </View>
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
      {searchInput}
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
