import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { formatPriceInCurrency, MISSING_PRICE_TEXT } from "@magic-vault/shared";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { cardSellRuleLabel } from "@/features/business/lib/card-sell-rule";
import { formatMediumDate } from "@/lib/dates";
import { BUY_SOURCE_ICONS } from "@/lib/constants/business";
import { SPACING } from "@/lib/constants/theme";
import type { CardPricingSectionProps } from "@/lib/interfaces/business";

export function CardPricingSection({
  pricing,
  isLoading,
  isLoadError,
  onRetryLoad,
  costField,
  canEditSellRule,
  onEditSellRule,
}: CardPricingSectionProps) {
  const { t, i18n } = useTranslation();
  const intake = pricing?.intake ?? null;
  const addedAt = pricing?.acquiredAt ?? intake?.acceptedAt ?? null;
  const priceText = (value: number | null) =>
    value == null || !pricing ? MISSING_PRICE_TEXT : formatPriceInCurrency(value, pricing.currency);
  const priceLabel = (value: number | null) => (value == null ? t("priceTable.noPrice") : undefined);

  return (
    <CollapsibleSection title={t("cardDetail.pricing.title")} initiallyOpen>
      {pricing ? (
        <>
          {intake ? (
            <View style={{ gap: SPACING.xs }}>
              <AppText size="sm" weight="semibold" tone="secondary" accessibilityRole="header">
                {t("cardDetail.pricing.intake.title")}
              </AppText>
              <ListGroup>
                <ListRow
                  icon={BUY_SOURCE_ICONS[intake.sourceType]}
                  title={t("cardDetail.pricing.intake.from")}
                  value={intake.name}
                  subtitle={`${t(`business.buy.sourceTypes.${intake.sourceType}`)} · ${t(`business.status.${intake.status}`)}`}
                  accessibilityHint={t("business.intake.openHint")}
                  onPress={() => {
                    router.back();
                    router.push({ pathname: "/business/intake/[guid]", params: { guid: intake.guid } });
                  }}
                />
                {addedAt ? (
                  <ListRow
                    icon="clock"
                    title={t("cardDetail.pricing.intake.added")}
                    value={formatMediumDate(addedAt, i18n.language)}
                  />
                ) : null}
              </ListGroup>
            </View>
          ) : null}
          <ListGroup>
            <ListRow
              title={t("cardDetail.pricing.market")}
              value={priceText(pricing.marketPrice)}
              valueAccessibilityLabel={priceLabel(pricing.marketPrice)}
            />
            <ListRow
              title={t("cardDetail.pricing.sell")}
              subtitle={cardSellRuleLabel(pricing, t)}
              value={priceText(pricing.sellPrice)}
              valueAccessibilityLabel={priceLabel(pricing.sellPrice)}
              accessibilityHint={canEditSellRule ? t("cardDetail.pricing.editSellPriceHint") : undefined}
              onPress={canEditSellRule ? onEditSellRule : undefined}
            />
          </ListGroup>
          {costField}
        </>
      ) : isLoadError && !isLoading ? (
        <Callout
          tone="destructive"
          title={t("cardDetail.pricing.loadFailed")}
          action={<Button size="sm" variant="secondary" label={t("recovery.retry")} onPress={onRetryLoad} />}
        />
      ) : (
        <ListSkeleton rows={2} leading="none" />
      )}
    </CollapsibleSection>
  );
}
