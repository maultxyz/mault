import { MissingPrice } from "@/components/missing-price";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { useBusinessAccess } from "@/features/business/api/use-business";
import { NumberInput } from "@/features/business/components/number-input";
import { SetPricesDialog } from "@/features/business/components/set-prices-dialog";
import { formatSignedPercent, sellRuleKindOf } from "@/features/business/lib/set-prices";
import { usePriceSource } from "@/hooks/use-price-source";
import { intakeLotPath, SELL_PRICE_ONLY_TABS } from "@/lib/constants/business";
import type { CardPricingBlockProps, CardPricingPanelProps } from "@/lib/interfaces/business";
import { IconPackageImport, IconPencil, IconTag } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function CardPricingPanel({ icon: PanelIcon, title, children }: CardPricingPanelProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-2 rounded-lg bg-foreground/6 p-3 md:gap-1.5 md:p-2.5"
    >
      <h4 id={headingId} className="flex items-center gap-1.5 text-sm font-semibold">
        <PanelIcon aria-hidden className="size-4 text-foreground/70" />
        {title}
      </h4>
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1.5 text-sm md:gap-y-1">
        {children}
      </dl>
    </section>
  );
}

export function CardPricingBlock({
  pricing,
  cost,
  costError,
  onCostChange,
}: CardPricingBlockProps) {
  const { t, i18n } = useTranslation("business");
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
  const intake = pricing.intake;
  const addedAt = pricing.acquiredAt ?? intake?.acceptedAt ?? null;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { dateStyle: "medium" });

  return (
    <div className="mt-2 flex flex-col gap-2 md:gap-1.5">
      {intake && (
        <CardPricingPanel icon={IconPackageImport} title={t("cardPricing.intake.heading")}>
          <dt className="text-foreground/70">{t("cardPricing.intake.from")}</dt>
          <dd className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              to={intakeLotPath(intake.guid)}
              className="truncate font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {intake.name}
            </Link>
            <span className="text-xs text-foreground/70">
              {t(`intake.sourceTypes.${intake.sourceType}`)} · {t(`status.${intake.status}`)}
            </span>
          </dd>
          {addedAt && (
            <>
              <dt className="text-foreground/70">{t("cardPricing.intake.added")}</dt>
              <dd>{formatDate(addedAt)}</dd>
            </>
          )}
        </CardPricingPanel>
      )}
      <CardPricingPanel icon={IconTag} title={t("cardPricing.heading")}>
        <dt className="text-foreground/70">{t("cardPricing.market")}</dt>
        <dd className="tabular-nums">
          {pricing.marketPrice == null ? <MissingPrice /> : format(pricing.marketPrice)}
        </dd>
        <dt className="text-foreground/70">{t("cardPricing.sell")}</dt>
        <dd className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-semibold tabular-nums">
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
        {canEditCost && (
          <>
            <dt className="text-foreground/70">
              <label htmlFor={costInputId}>{costLabel}</label>
            </dt>
            <dd className="flex flex-col gap-1">
              <NumberInput
                id={costInputId}
                min={0}
                step={0.01}
                className="w-32 tabular-nums"
                placeholder={t("cardPricing.noCost")}
                value={cost}
                onChange={onCostChange}
                aria-invalid={!!costError}
              />
              {costError && <FieldError errors={[{ message: costError }]} />}
            </dd>
          </>
        )}
      </CardPricingPanel>
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
