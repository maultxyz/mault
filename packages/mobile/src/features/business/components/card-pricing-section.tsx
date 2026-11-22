import { useTranslation } from "react-i18next";
import { formatPriceInCurrency, MISSING_PRICE_TEXT } from "@magic-vault/shared";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { cardSellRuleLabel } from "@/features/business/lib/card-sell-rule";
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
  const { t } = useTranslation();
  const priceText = (value: number | null) =>
    value == null || !pricing ? MISSING_PRICE_TEXT : formatPriceInCurrency(value, pricing.currency);
  const priceLabel = (value: number | null) => (value == null ? t("priceTable.noPrice") : undefined);

  return (
    <CollapsibleSection title={t("cardDetail.pricing.title")} initiallyOpen>
      {pricing ? (
        <>
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
        <ListSkeleton rows={2} />
      )}
    </CollapsibleSection>
  );
}
