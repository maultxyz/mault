import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Alert, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Sheet } from "@/components/ui/sheet";
import { StatGroup } from "@/components/ui/stat-group";
import { StatTile } from "@/components/ui/stat-tile";
import { cancelIntakeLot, intakeLotQueryOptions } from "@/features/business/api/business";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { useBusinessAction } from "@/features/business/api/use-business-action";
import { useCompactCount } from "@/hooks/use-compact-count";
import { useActiveOrgId } from "@/hooks/use-org";
import { usePricing } from "@/hooks/use-pricing";
import { SPACING } from "@/lib/constants/theme";
import type { ScanBuySheetProps } from "@/lib/interfaces/business";
import { runAfterSheetsDismissed } from "@/lib/sheet-presentation";

export function ScanBuySheet({ visible, buy, onClose, onShowTips }: ScanBuySheetProps) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const compactCount = useCompactCount();
  const { format, formatCompact } = usePricing();
  const { refresh } = useBusinessAction();
  const access = useQuery(businessAccessQueryOptions(orgId));
  const canAccept = !!access.data?.canAcceptIntake;
  const showMoney = !!access.data?.canViewCosts;
  const lotQuery = useQuery({ ...intakeLotQueryOptions(buy?.guid), enabled: visible && !!buy?.guid });
  const lot = lotQuery.data ?? buy;
  const isOpenedProduct = lot?.sourceType === "opened";
  const belowMinimumCount = lotQuery.data?.belowMinimumScanIds.length ?? 0;

  const cancel = useMutation({
    mutationFn: ({ guid, removeCards }: { guid: string; removeCards: boolean }) => cancelIntakeLot(guid, { removeCards }),
    onSuccess: () => {
      AccessibilityInfo.announceForAccessibility(t("business.intake.cancelled"));
      onClose();
    },
    onSettled: () => void refresh(),
  });

  const closeThen = (action: () => void) => {
    onClose();
    runAfterSheetsDismissed(action);
  };

  const confirmCancel = () => {
    if (!lot) return;
    Alert.alert(t("business.intake.cancelTitle"), t("business.intake.cancelDescription", { name: lot.customerName }), [
      { text: t("business.back"), style: "cancel" },
      {
        text: t("business.intake.cancelKeepCards"),
        onPress: () => cancel.mutate({ guid: lot.guid, removeCards: false }),
      },
      {
        text: t("business.intake.cancelRemoveCards", { count: lot.cardCount }),
        style: "destructive",
        onPress: () => cancel.mutate({ guid: lot.guid, removeCards: true }),
      },
    ]);
  };

  const closeSheet = () => {
    cancel.reset();
    onClose();
  };

  if (!lot) return null;

  return (
    <Sheet
      visible={visible}
      onClose={closeSheet}
      title={lot.customerName}
      description={t(`business.buy.sourceTypes.${lot.sourceType}`)}
      footer={
        <View style={{ gap: SPACING.sm }}>
          {canAccept ? (
            <Button
              size="lg"
              icon="check"
              label={t("business.buy.finish")}
              disabled={lot.cardCount === 0 || cancel.isPending}
              onPress={() =>
                closeThen(() => router.push({ pathname: "/business/intake-accept", params: { guid: lot.guid } }))
              }
            />
          ) : null}
          <Button
            size="lg"
            variant="secondary"
            icon="coins"
            label={t("scan.buy.openBuy")}
            disabled={cancel.isPending}
            onPress={() => closeThen(() => router.push({ pathname: "/business/intake/[guid]", params: { guid: lot.guid } }))}
          />
          {canAccept ? (
            <Button
              size="lg"
              variant="destructive"
              icon="close"
              label={t("business.intake.cancelLot")}
              loading={cancel.isPending}
              onPress={confirmCancel}
            />
          ) : null}
        </View>
      }
    >
      <View style={{ gap: SPACING.md }}>
        {cancel.isError ? (
          <View accessibilityRole="alert">
            <Callout
              tone="destructive"
              title={t("scan.buy.cancelFailed")}
              description={cancel.error instanceof Error ? cancel.error.message : undefined}
            />
          </View>
        ) : null}
        <StatGroup heading={isOpenedProduct ? t("business.intake.summary") : t("business.intake.liveOffer")}>
          <StatTile label={t("business.intake.stats.cards")} {...compactCount(lot.cardCount)} />
          {showMoney && lot.marketTotal != null ? (
            <StatTile
              label={t("business.intake.stats.market")}
              value={formatCompact(lot.marketTotal)}
              exactValue={format(lot.marketTotal)}
            />
          ) : null}
          {showMoney && !isOpenedProduct && lot.cashOffer != null ? (
            <StatTile
              label={t("business.intake.stats.cash")}
              value={formatCompact(lot.cashOffer)}
              exactValue={format(lot.cashOffer)}
            />
          ) : null}
        </StatGroup>
        {!isOpenedProduct && belowMinimumCount > 0 ? (
          <Callout tone="info" title={t("business.intake.belowMinimum", { count: belowMinimumCount })} />
        ) : null}
        <Button variant="ghost" icon="help" label={t("businessTips.scanBuy.open")} onPress={() => closeThen(onShowTips)} />
      </View>
    </Sheet>
  );
}
