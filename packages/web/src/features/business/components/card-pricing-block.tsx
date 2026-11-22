import { MissingPrice } from "@/components/missing-price";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { NumberInput } from "@/features/business/components/number-input";
import { SetPricesDialog } from "@/features/business/components/set-prices-dialog";
import { formatSignedPercent, sellRuleKindOf } from "@/features/business/lib/set-prices";
import { usePriceSource } from "@/hooks/use-price-source";
import { SELL_PRICE_ONLY_TABS } from "@/lib/constants/business";
import type { CardPricingBlockProps } from "@/lib/interfaces/business";
import { IconPencil } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function CardPricingBlock({
  pricing,
  cost,
  costError,
  onCostChange,
}: CardPricingBlockProps) {
  const { t } = useTranslation("business");
  const { access } = useBusinessAccess();
  const { format } = usePriceSource();
  const costInputId = useId();
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const ruleKind = sellRuleKindOf(pricing.sellRule, pricing.currency);
  const canEditSellPrice = !!access?.canManageSettings && !access.isLocked;
  const isInOpenedProductBuy = pricing.isInOpenIntake && !pricing.openBuyUsesOffers;
  const canSeeCost = !!access?.canViewCosts && !isInOpenedProductBuy;
  const canEditCost = canSeeCost && !access?.isLocked;
  const costLabel = t(
    pricing.isInOpenIntake ? "cardPricing.intakeOfferLabel" : "cardPricing.costLabel",
    { currency: pricing.currency },
  );
  const savedCost = pricing.isInOpenIntake ? pricing.intakeOffer : pricing.cost;

  return (
    <div className="flex flex-col gap-2 md:gap-1.5">
      <h4 className="text-sm font-medium">{t("cardPricing.heading")}</h4>
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1.5 text-sm md:gap-y-1">
        <dt className="text-foreground/70">{t("cardPricing.market")}</dt>
        <dd className="tabular-nums">
          {pricing.marketPrice == null ? <MissingPrice /> : format(pricing.marketPrice)}
        </dd>
        <dt className="text-foreground/70">{t("cardPricing.sell")}</dt>
        <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium tabular-nums">
            {pricing.sellPrice == null ? <MissingPrice /> : format(pricing.sellPrice)}
          </span>
          <span className="text-xs text-foreground/70">
            {ruleKind === "fixed"
              ? t("cardPricing.rules.fixed")
              : ruleKind === "markup"
                ? t("cardPricing.rules.markup", {
                    percent: formatSignedPercent(pricing.sellRule.markupPercent ?? 0),
                  })
                : t("cardPricing.rules.default", {
                    percent: formatSignedPercent(pricing.defaultMarkupPercent),
                  })}
          </span>
          {canEditSellPrice && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("cardPricing.editSellPrice")}
              onClick={() => setSellDialogOpen(true)}
            >
              <IconPencil />
            </Button>
          )}
        </dd>
        {canSeeCost && !canEditCost && (
          <>
            <dt className="text-foreground/70">{costLabel}</dt>
            <dd className="tabular-nums">
              {savedCost == null ? t("cardPricing.noCost") : format(savedCost)}
            </dd>
          </>
        )}
      </dl>
      {canEditCost && (
        <Field className="w-40" data-invalid={!!costError || undefined}>
          <FieldLabel htmlFor={costInputId}>{costLabel}</FieldLabel>
          <NumberInput
            id={costInputId}
            min={0}
            step={0.01}
            placeholder={t("cardPricing.noCost")}
            value={cost}
            onChange={onCostChange}
            aria-invalid={!!costError}
          />
          {costError && <FieldError errors={[{ message: costError }]} />}
        </Field>
      )}
      {canEditSellPrice && (
        <SetPricesDialog
          scanIds={[pricing.scanId]}
          open={sellDialogOpen}
          onOpenChange={setSellDialogOpen}
          tabs={SELL_PRICE_ONLY_TABS}
          sellRule={pricing.sellRule}
        />
      )}
    </div>
  );
}
