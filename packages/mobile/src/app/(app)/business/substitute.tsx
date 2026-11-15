import { orderLineLabel } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, View } from "react-native";
import { CardThumbnail } from "@/components/cards/card-thumbnail";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import {
  orderLineSubstitutesQueryOptions,
  orderQueryOptions,
  substituteOrderLine,
} from "@/features/business/api/business";
import { pickPlaceTitle } from "@/features/business/lib/pick-walk-labels";
import { useTheme } from "@/hooks/use-theme";
import { cardArtSources } from "@/lib/card-art";
import { BUSINESS_QUERY_KEY } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";

export default function OrderSubstituteScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ orderGuid: string; lineIndex: string }>();
  const lineIndex = Number.isInteger(Number(params.lineIndex)) ? Number(params.lineIndex) : null;
  const order = useQuery(orderQueryOptions(params.orderGuid));
  const substitutes = useQuery(orderLineSubstitutesQueryOptions(params.orderGuid, lineIndex));
  const line = lineIndex === null ? null : (order.data?.lines[lineIndex] ?? null);
  const choose = useMutation({
    mutationFn: (scanId: string) => substituteOrderLine(params.orderGuid, { lineIndex: lineIndex ?? 0, scanId }),
    onSuccess: () => {
      AccessibilityInfo.announceForAccessibility(t("business.substitute.added"));
      router.back();
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: BUSINESS_QUERY_KEY }),
  });

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={t("business.substitute.title")}
        subtitle={
          line
            ? t("business.substitute.description", {
                name: orderLineLabel(line),
                missing: Math.max(line.quantity - line.allocations.length, 0),
              })
            : null
        }
      />
      <PinnedActionsLayout>
        {choose.isError ? (
          <Callout
            tone="destructive"
            title={choose.error instanceof Error ? choose.error.message : t("business.actionFailed")}
          />
        ) : null}
        {substitutes.isPending ? (
          <ListSkeleton rows={4} />
        ) : substitutes.isError ? (
          <Callout
            tone="destructive"
            title={t("business.loadFailed")}
            action={<Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={() => void substitutes.refetch()} />}
          />
        ) : substitutes.data.length === 0 ? (
          <EmptyState
            icon="search"
            title={t("business.substitute.emptyTitle")}
            description={t("business.substitute.emptyDescription")}
          />
        ) : (
          <ListGroup>
            {substitutes.data.map(({ entry, differences }) => {
              const { imageUrl, placeholderUrl } = cardArtSources(entry.card.image);
              const where = pickPlaceTitle(entry, t);
              const printing = `${entry.card.setName || entry.card.set.toUpperCase()} #${entry.card.collectorNumber}`;
              const differenceText =
                differences.length > 0
                  ? differences.map((difference) => t(`business.substitute.differences.${difference}`)).join(" · ")
                  : t("business.substitute.exactMatch");
              return (
                <ListRow
                  key={entry.scanId}
                  leading={<CardThumbnail imageUrl={imageUrl} placeholderUrl={placeholderUrl} />}
                  title={printing}
                  subtitle={[
                    [entry.condition, entry.isFoil ? t("business.picks.walk.foil") : null].filter(Boolean).join(" · "),
                    entry.locationName != null
                      ? `${where}, ${t("business.picks.walk.slot", { position: (entry.locationPosition ?? 0) + 1 })}`
                      : where,
                    differenceText,
                  ].join("\n")}
                  subtitleNumberOfLines={3}
                  right={
                    <AppText size="xs" tone="primary" weight="semibold">
                      {t("business.substitute.useCopy")}
                    </AppText>
                  }
                  disabled={choose.isPending}
                  accessibilityHint={t("business.substitute.useCopyHint")}
                  onPress={() => choose.mutate(entry.scanId)}
                />
              );
            })}
          </ListGroup>
        )}
        <View style={{ height: SPACING.sm }} />
      </PinnedActionsLayout>
    </View>
  );
}
