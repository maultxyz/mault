import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { FlatList, RefreshControl, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { Pill } from "@/components/ui/pill";
import { ListLoadingFooter } from "@/components/ui/list-loading-footer";
import {
  authHeadersQueryOptions,
  matchValidationScansQueryOptions,
} from "@/features/match-validations/api/match-validations";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO, LIST_END_THRESHOLD } from "@/lib/constants/collections";
import { MATCH_VALIDATION_STATUS_TONES, MATCH_VALIDATION_THUMBNAIL_WIDTH } from "@/lib/constants/match-validations";
import { RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { MatchValidationGameFilterProps, MatchValidationScanRowProps } from "@/lib/interfaces/match-validations";
import { absoluteUrl } from "@/lib/url";

function MatchValidationScanRow({ scan, authHeaders }: MatchValidationScanRowProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const cardName = scan.cardName ?? t("matchValidations.unknownCard");
  const thumbnailUrl = absoluteUrl(`/api/match-validations/scans/${scan.scanId}/thumbnail`);
  const catalogUrl = absoluteUrl(scan.catalogImageUrl);
  const thumbnailFrame = {
    width: MATCH_VALIDATION_THUMBNAIL_WIDTH,
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: RADIUS.md,
    overflow: "hidden" as const,
    backgroundColor: colors.muted,
  };
  return (
    <View style={{ flexDirection: "row", gap: SPACING.md, paddingHorizontal: SCREEN_GUTTER, paddingVertical: SPACING.md }}>
      <View style={{ flexDirection: "row", gap: SPACING.xs }}>
        <View style={thumbnailFrame}>
          {thumbnailUrl && authHeaders ? (
            <Image
              source={{ uri: thumbnailUrl, headers: authHeaders }}
              style={{ flex: 1 }}
              contentFit="fill"
              accessibilityLabel={t("matchValidations.scanPhotoAlt", { name: cardName })}
            />
          ) : null}
        </View>
        <View style={thumbnailFrame}>
          {catalogUrl ? (
            <Image
              source={{ uri: catalogUrl }}
              style={{ flex: 1 }}
              contentFit="cover"
              accessibilityLabel={t("matchValidations.matchedCardAlt", { name: cardName })}
            />
          ) : null}
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <AppText weight="medium" numberOfLines={1}>
          {cardName}
        </AppText>
        <AppText size="xs" tone="secondary" numberOfLines={1}>
          {[scan.setName ?? scan.setCode, scan.collectorNumber].filter(Boolean).join(" · ")}
        </AppText>
        <Pill tone={MATCH_VALIDATION_STATUS_TONES[scan.status]} label={t(`matchValidations.statuses.${scan.status}`)} />
        <AppText size="xs" tone="secondary">
          {t("matchValidations.tallies", {
            correct: scan.correctCount,
            incorrect: scan.incorrectCount,
            badScan: scan.badScanCount,
          })}
        </AppText>
        {scan.yourVerdict ? (
          <AppText size="xs" tone="secondary">
            {t("matchValidations.yourVerdict", { verdict: t(`matchValidations.actions.${scan.yourVerdict}`) })}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function MatchValidationScanList({ gameKey }: MatchValidationGameFilterProps) {
  const { t } = useTranslation();
  const colors = useTheme();
  const scans = useInfiniteQuery(matchValidationScansQueryOptions(gameKey));
  const { data: authHeaders } = useQuery(authHeadersQueryOptions);
  const items = scans.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <FlatList
      accessibilityLabel={t("matchValidations.scans.listLabel")}
      data={items}
      keyExtractor={(scan) => scan.scanId}
      contentContainerStyle={{ paddingBottom: SPACING.xxl }}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border }} />}
      onEndReachedThreshold={LIST_END_THRESHOLD}
      onEndReached={() => {
        if (scans.hasNextPage && !scans.isFetchingNextPage) void scans.fetchNextPage();
      }}
      refreshControl={
        <RefreshControl
          refreshing={scans.isRefetching && !scans.isFetchingNextPage}
          onRefresh={() => void scans.refetch()}
          tintColor={colors.primaryText}
          colors={[colors.primary]}
          progressBackgroundColor={colors.card}
        />
      }
      ListEmptyComponent={
        scans.isPending ? (
          <View style={{ paddingHorizontal: SCREEN_GUTTER, paddingTop: SPACING.md }}>
            <ListSkeleton rows={5} />
          </View>
        ) : (
          <View style={{ padding: SCREEN_GUTTER }}>
            <EmptyState
              icon="collections"
              title={t("matchValidations.scans.empty.title")}
              description={t("matchValidations.scans.empty.description")}
            />
          </View>
        )
      }
      ListFooterComponent={
        scans.isFetchingNextPage ? <ListLoadingFooter /> : undefined
      }
      renderItem={({ item }) => <MatchValidationScanRow scan={item} authHeaders={authHeaders} />}
    />
  );
}
