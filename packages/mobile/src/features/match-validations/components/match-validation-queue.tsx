import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MATCH_VALIDATION_REVIEWS_REQUIRED,
  type MatchValidationVerdict,
  OCR_REGIONS_BY_GAME_KEY,
  padFixedOcrRegions,
  toOcrOverlayRegions,
} from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Pill } from "@/components/ui/pill";
import { Skeleton } from "@/components/ui/skeleton";
import { OcrRegionCrops } from "@/features/cards/components/ocr-region-crops";
import {
  MATCH_VALIDATION_SCANS_QUERY_KEY,
  matchValidationProgressQueryOptions,
  matchValidationQueueQueryOptions,
  saveMatchValidation,
} from "@/features/match-validations/api/match-validations";
import { useLabelQueue } from "@/features/match-validations/api/use-label-queue";
import { useTheme } from "@/hooks/use-theme";
import { CARD_ASPECT_RATIO } from "@/lib/constants/collections";
import { CARD_ART_RADIUS, RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import { BUTTON_HEIGHTS } from "@/lib/constants/ui";
import { formatDateTime } from "@/lib/dates";
import type { MatchValidationGameFilterProps } from "@/lib/interfaces/match-validations";
import { absoluteUrl } from "@/lib/url";

export function MatchValidationQueue({ gameKey }: MatchValidationGameFilterProps) {
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const queueQuery = useQuery(matchValidationQueueQueryOptions(gameKey));
  const { refetch: refetchQueue, isFetching: isFetchingQueue } = queueQuery;
  const { current, revisiting, history, decide, skip, goBack, canGoBack, isLoadingMore } =
    useLabelQueue<MatchValidationVerdict>({
      items: queueQuery.data?.items,
      isFetchingQueue,
      queueFetchedAt: queueQuery.dataUpdatedAt,
      refetchQueue,
      saveLabel: async (item, verdict) => {
        const result = await saveMatchValidation({ scanId: item.scanId, verdict });
        if (result.success) {
          void queryClient.invalidateQueries({ queryKey: matchValidationProgressQueryOptions.queryKey });
          void queryClient.invalidateQueries({ queryKey: MATCH_VALIDATION_SCANS_QUERY_KEY });
        }
        return result;
      },
      saveErrorMessage: t("matchValidations.saveError"),
    });

  const sessionCountOf = (verdict: MatchValidationVerdict) =>
    history.filter((entry) => entry.decision === verdict).length;
  const counts = queueQuery.data?.counts;
  const cardName = current?.cardName ?? t("matchValidations.unknownCard");
  const scanUrl = absoluteUrl(current?.capturedImageUrl);
  const catalogUrl = absoluteUrl(current?.catalogImageUrl);
  const gameOcrRegions = OCR_REGIONS_BY_GAME_KEY[current?.gameKey ?? ""] ?? [];
  const fixedOcrRegions = padFixedOcrRegions(gameOcrRegions);
  const scanOcrRegions = current?.ocrRegions?.length
    ? toOcrOverlayRegions(current.ocrRegions, gameOcrRegions)
    : fixedOcrRegions;
  const verdictButtonStyle = { flex: 1, paddingHorizontal: SPACING.xs };
  const imageFrame = {
    flex: 1,
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: CARD_ART_RADIUS,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.muted,
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: SCREEN_GUTTER, paddingBottom: SPACING.xl, gap: SPACING.md }}>
        {queueQuery.isPending || isLoadingMore ? (
          <View style={{ flexDirection: "row", gap: SPACING.md }}>
            <View style={{ flex: 1, aspectRatio: CARD_ASPECT_RATIO }}>
              <Skeleton height="100%" radius={CARD_ART_RADIUS} />
            </View>
            <View style={{ flex: 1, aspectRatio: CARD_ASPECT_RATIO }}>
              <Skeleton height="100%" radius={CARD_ART_RADIUS} />
            </View>
          </View>
        ) : !current ? (
          <View style={{ gap: SPACING.md }}>
            <EmptyState
              icon="check"
              title={t("matchValidations.empty.title")}
              description={t("matchValidations.empty.description")}
            />
            <View style={{ flexDirection: "row", gap: SPACING.sm }}>
              {history.length > 0 ? (
                <Button style={{ flex: 1 }} variant="secondary" icon="arrowLeft" label={t("matchValidations.actions.back")} onPress={goBack} />
              ) : null}
              <Button
                style={{ flex: 1 }}
                variant="secondary"
                icon="refresh"
                label={t("matchValidations.actions.refresh")}
                disabled={isFetchingQueue}
                onPress={() => void refetchQueue()}
              />
            </View>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: SPACING.md }}>
              <View style={{ flex: 1, gap: 6 }}>
                <AppText size="xs" tone="secondary">
                  {t("matchValidations.scanPhoto")}
                </AppText>
                <View style={imageFrame}>
                  {scanUrl ? (
                    <Image
                      key={current.scanId}
                      source={{ uri: scanUrl }}
                      style={{ flex: 1 }}
                      contentFit="fill"
                      accessibilityLabel={t("matchValidations.scanPhotoAlt", { name: cardName })}
                    />
                  ) : null}
                </View>
                {scanUrl ? <OcrRegionCrops imageUrl={scanUrl} regions={scanOcrRegions} /> : null}
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <AppText size="xs" tone="secondary">
                  {t("matchValidations.matchedCard")}
                </AppText>
                <View style={imageFrame}>
                  {catalogUrl ? (
                    <Image
                      key={current.scanId}
                      source={{ uri: catalogUrl }}
                      style={{ flex: 1 }}
                      contentFit="cover"
                      accessibilityLabel={t("matchValidations.matchedCardAlt", { name: cardName })}
                    />
                  ) : null}
                </View>
                {catalogUrl ? <OcrRegionCrops imageUrl={catalogUrl} regions={fixedOcrRegions} /> : null}
              </View>
            </View>

            <View accessibilityLiveRegion="polite" style={{ gap: SPACING.xs }}>
              <AppText weight="semibold">{cardName}</AppText>
              <AppText size="sm" tone="secondary">
                {[current.setName ?? current.setCode, current.collectorNumber].filter(Boolean).join(" · ")}
              </AppText>
              {current.matchedBy ? (
                <AppText size="sm" tone="secondary">
                  {t(current.matchedBy === "ocr" ? "matchValidations.matchedByOcr" : "matchValidations.matchedByEmbedding")}
                </AppText>
              ) : null}
              <AppText size="sm" tone="secondary">
                {t("matchValidations.scannedAt", { date: formatDateTime(current.scannedAt, i18n.language) })}
              </AppText>
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: SPACING.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.xs }}>
                <View accessible={false} style={{ flexDirection: "row", gap: 3 }}>
                  {Array.from({ length: MATCH_VALIDATION_REVIEWS_REQUIRED }, (_, index) => (
                    <View
                      key={index}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: RADIUS.full,
                        borderWidth: 1.5,
                        borderColor: index < current.reviewCount ? colors.successForeground : colors.foregroundSecondary,
                        backgroundColor: index < current.reviewCount ? colors.successForeground : "transparent",
                      }}
                    />
                  ))}
                </View>
                <AppText size="xs" tone="secondary">
                  {t("matchValidations.reviewProgress", {
                    count: current.reviewCount,
                    required: MATCH_VALIDATION_REVIEWS_REQUIRED,
                  })}
                </AppText>
              </View>
              {current.lowConfidenceMatch ? <Pill label={t("matchValidations.lowConfidence")} /> : null}
              {revisiting ? <Pill label={t(`matchValidations.decisions.${revisiting.decision}`)} /> : null}
            </View>
          </>
        )}
        <AppText size="xs" tone="secondary">
          {[
            counts
              ? t("matchValidations.counts", { yours: counts.validatedByYou, community: counts.validatedByCommunity })
              : null,
            t("matchValidations.sessionCounts", {
              correct: sessionCountOf("correct"),
              incorrect: sessionCountOf("incorrect"),
              badScan: sessionCountOf("badScan"),
            }),
          ]
            .filter(Boolean)
            .join("\n")}
        </AppText>
      </ScrollView>

      {current && !isLoadingMore ? (
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingHorizontal: SCREEN_GUTTER,
            paddingTop: SPACING.md,
            paddingBottom: SPACING.md + insets.bottom,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: SPACING.sm }}>
            <IconButton
              icon="arrowLeft"
              variant="plain"
              size={BUTTON_HEIGHTS.md}
              disabled={!canGoBack}
              accessibilityLabel={t("matchValidations.actions.back")}
              onPress={goBack}
            />
            <Button
              style={verdictButtonStyle}
              icon="check"
              iconOnly
              label={t("matchValidations.actions.correct")}
              onPress={() => decide("correct")}
            />
            <Button
              style={verdictButtonStyle}
              variant="secondary"
              icon="close"
              iconOnly
              label={t("matchValidations.actions.incorrect")}
              onPress={() => decide("incorrect")}
            />
            <Button
              style={verdictButtonStyle}
              variant="secondary"
              icon="trash"
              iconOnly
              label={t("matchValidations.actions.badScan")}
              onPress={() => decide("badScan")}
            />
            <IconButton
              icon="arrowRight"
              variant="plain"
              size={BUTTON_HEIGHTS.md}
              accessibilityLabel={t("matchValidations.actions.skip")}
              onPress={skip}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}
