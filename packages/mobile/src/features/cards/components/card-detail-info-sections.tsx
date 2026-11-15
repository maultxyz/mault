import { useTranslation } from "react-i18next";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Surface } from "@/components/ui/surface";
import { CardDetailsList } from "@/features/cards/components/card-details-list";
import { CardPriceDetails } from "@/features/cards/components/card-price-details";
import { CardPurchaseLinks } from "@/features/cards/components/card-purchase-links";
import { SPACING } from "@/lib/constants/theme";
import type { CardDetailInfoSectionsProps } from "@/lib/interfaces/cards";

export function CardDetailInfoSections({
  card,
  binNumber,
  isFoil,
  foilType,
  stamp,
  condition,
  priceExtras,
}: CardDetailInfoSectionsProps) {
  const { t } = useTranslation();
  return (
    <>
      <CollapsibleSection title={t("cardDetail.details")} initiallyOpen>
        <Surface>
          <CardDetailsList card={card} binNumber={binNumber} />
        </Surface>
      </CollapsibleSection>
      <CollapsibleSection title={t("cardDetail.prices")} initiallyOpen>
        <Surface style={{ gap: SPACING.md }}>
          <CardPriceDetails card={card} isFoil={isFoil} foilType={foilType} stamp={stamp} condition={condition} />
          <CardPurchaseLinks card={card} />
          {priceExtras}
        </Surface>
      </CollapsibleSection>
    </>
  );
}
