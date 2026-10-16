import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { STATS_DEFAULT_RANGE, STATS_RANGES, type StatsRange } from "@magic-vault/shared";
import { CardRow } from "@/components/cards/card-row";
import { Callout } from "@/components/ui/callout";
import { ListGroup } from "@/components/ui/list-group";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SectionHeader } from "@/components/ui/section-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { StatTile } from "@/components/ui/stat-tile";
import { statsQueryOptions } from "@/features/stats/api/stats";
import { useActiveOrg } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { SPACING } from "@/lib/constants/theme";
import { absoluteUrl } from "@/lib/url";

export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const pricing = usePricing();
  const org = useActiveOrg();
  const [range, setRange] = useState<StatsRange>(STATS_DEFAULT_RANGE);
  const { data, isPending, isError, refetch, isRefetching } = useQuery(statsQueryOptions(org?.id ?? null, range));
  const number = (value: number) => value.toLocaleString(i18n.language);

  return (
    <Screen
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      header={
        <PageHeader title={t("tabs.stats")} subtitle={org?.name} onBack={() => router.back()}>
          <SegmentedControl<StatsRange>
            value={range}
            onChange={setRange}
            options={STATS_RANGES.map((value) => ({ value, label: t(`stats.ranges.${value}`) }))}
          />
        </PageHeader>
      }
    >
      {isError ? <Callout tone="destructive" title={t("stats.loadFailed")} /> : null}
      {isPending || !data ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} width="47%" height={76} />
          ))}
        </View>
      ) : (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm }}>
            <StatTile label={t("stats.scansInRange")} value={number(data.totals.scansInRange)} />
            <StatTile label={t("stats.totalCards")} value={number(data.totals.cardCount)} />
            <StatTile label={t("stats.totalValue")} value={pricing.format(data.totals.totalValue)} />
            <StatTile label={t("stats.valueAdded")} value={pricing.format(data.totals.valueAddedInRange)} />
            <StatTile label={t("stats.uniqueCards")} value={number(data.totals.uniqueCount)} />
            <StatTile label={t("stats.needsReview")} value={number(data.totals.needsReviewCount)} />
          </View>
          {data.topCards.length > 0 ? (
            <>
              <SectionHeader title={t("stats.topCards")} />
              <ListGroup>
                {data.topCards.map((entry) => (
                  <CardRow
                    key={entry.scanId}
                    name={entry.card.name}
                    subtitle={`${entry.card.setName} · ${entry.collectionName}`}
                    imageUrl={absoluteUrl(entry.card.image?.small)}
                    price={entry.price != null ? pricing.format(entry.price) : null}
                  />
                ))}
              </ListGroup>
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
