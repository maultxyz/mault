import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, ScrollView, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Pill } from "@/components/ui/pill";
import {
  approveCardHold,
  cardHoldsKey,
  fetchCardHolds,
  releaseCardHold,
} from "@/features/card-holds/api/card-holds";
import { useTheme } from "@/hooks/use-theme";
import { CARD_HOLD_IMAGE_WIDTH, CARD_HOLDS_QUERY_KEY } from "@/lib/constants/share-links";
import { CARD_THUMBNAIL_RADIUS, SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";
import type { ShareLinkKind } from "@/lib/interfaces/share-links";
import type { CardHold } from "@magic-vault/shared";

export default function CardHoldsScreen() {
  const { kind, guid } = useLocalSearchParams<{ kind: ShareLinkKind; guid: string }>();
  const { t, i18n } = useTranslation();
  const colors = useTheme();
  const queryClient = useQueryClient();
  const holds = useQuery({
    queryKey: cardHoldsKey(kind, guid),
    queryFn: () => fetchCardHolds(kind, guid),
  });
  const refreshHolds = () => queryClient.invalidateQueries({ queryKey: [CARD_HOLDS_QUERY_KEY] });
  const approve = useMutation({
    mutationFn: (hold: CardHold) => approveCardHold(hold.guid),
    onSuccess: (_, hold) =>
      AccessibilityInfo.announceForAccessibility(t("cardHolds.approvedToast", { name: hold.cardName })),
    onSettled: refreshHolds,
  });
  const release = useMutation({
    mutationFn: (hold: CardHold) => releaseCardHold(hold.guid),
    onSuccess: (_, hold) =>
      AccessibilityInfo.announceForAccessibility(t("cardHolds.released", { name: hold.cardName })),
    onSettled: refreshHolds,
  });

  const heldUntil = (hold: CardHold) =>
    hold.expiresAt
      ? t("cardHolds.heldUntil", {
          time: new Date(hold.expiresAt).toLocaleTimeString(i18n.language, { hour: "numeric", minute: "2-digit" }),
        })
      : t("cardHolds.approved");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader title={t("cardHolds.title")} subtitle={t("cardHolds.description")} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: SCREEN_GUTTER, gap: SPACING.lg }}>
        {approve.isError ? <Callout tone="destructive" title={t("cardHolds.approveFailed")} /> : null}
        {release.isError ? <Callout tone="destructive" title={t("cardHolds.releaseFailed")} /> : null}
        {holds.isPending ? (
          <ListSkeleton rows={3} />
        ) : holds.isError ? (
          <Callout tone="destructive" title={t("cardHolds.loadFailed")} />
        ) : holds.data.length === 0 ? (
          <EmptyState icon="hold" title={t("cardHolds.empty")} description={t("cardHolds.emptyDescription")} />
        ) : (
          holds.data.map((hold) => (
            <View
              key={hold.guid}
              style={{
                flexDirection: "row",
                gap: SPACING.md,
                paddingBottom: SPACING.lg,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              }}
            >
              <Image
                source={hold.cardImage ? { uri: hold.cardImage } : undefined}
                style={{
                  width: CARD_HOLD_IMAGE_WIDTH,
                  aspectRatio: 2.5 / 3.5,
                  borderRadius: CARD_THUMBNAIL_RADIUS,
                  backgroundColor: colors.muted,
                }}
                accessible={false}
              />
              <View style={{ flex: 1, gap: SPACING.xs }}>
                <AppText weight="semibold">{hold.cardName}</AppText>
                <AppText size="sm" tone="secondary">
                  {[hold.cardSetName, hold.isFoil ? t("cardHolds.foil") : null, hold.condition]
                    .filter(Boolean)
                    .join(" · ")}
                </AppText>
                <AppText size="sm">
                  {t("cardHolds.heldBy", { name: hold.guestName })} · {heldUntil(hold)}
                </AppText>
                {hold.guestNote ? (
                  <AppText size="sm" tone="secondary">
                    {hold.guestNote}
                  </AppText>
                ) : null}
                {hold.approvedAt ? null : (
                  <View style={{ alignSelf: "flex-start" }}>
                    <Pill tone="warning" label={t("cardHolds.awaitingApproval")} />
                  </View>
                )}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.xs }}>
                  {hold.approvedAt ? null : (
                    <Button
                      size="sm"
                      variant="secondary"
                      label={t("cardHolds.approve")}
                      accessibilityLabel={t("cardHolds.approveFor", { name: hold.cardName })}
                      loading={approve.isPending && approve.variables?.guid === hold.guid}
                      disabled={approve.isPending}
                      onPress={() => approve.mutate(hold)}
                    />
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    label={t("cardHolds.release")}
                    accessibilityLabel={t("cardHolds.releaseFor", { name: hold.cardName })}
                    loading={release.isPending && release.variables?.guid === hold.guid}
                    disabled={release.isPending}
                    onPress={() => release.mutate(hold)}
                  />
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
