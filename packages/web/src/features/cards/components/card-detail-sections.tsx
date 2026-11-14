import { CardDetailsList } from "@/features/cards/components/card-details-list";
import { CardPriceDetails } from "@/features/cards/components/card-price-details";
import { CardPurchaseLinks } from "@/features/cards/components/card-purchase-links";
import { DetailSection } from "@/features/cards/components/detail-section";
import type {
  CardPricesSectionProps,
  CardRulesSectionProps,
} from "@/lib/interfaces/cards";
import { useTranslation } from "react-i18next";

export function CardRulesSection({ card }: CardRulesSectionProps) {
  const { t } = useTranslation("cards");
  return (
    <DetailSection title={t("cardDetailPanel.details")}>
      <div className="flex flex-col gap-4 md:gap-2">
        <CardDetailsList card={card} />
        {card.text && (
          <p className="rounded-lg bg-foreground/6 p-3 text-sm whitespace-pre-line leading-relaxed">
            {card.text}
          </p>
        )}
      </div>
    </DetailSection>
  );
}

export function CardPricesSection({
  card,
  isFoil,
  foilType,
  stamp,
  condition,
  children,
}: CardPricesSectionProps) {
  const { t } = useTranslation("cards");
  return (
    <DetailSection title={t("cardDetailPanel.prices")}>
      <div className="flex flex-col gap-4 md:gap-2">
        <CardPriceDetails
          card={card}
          isFoil={isFoil}
          foilType={foilType}
          stamp={stamp}
          condition={condition}
        />
        <CardPurchaseLinks card={card} />
        {children}
      </div>
    </DetailSection>
  );
}
