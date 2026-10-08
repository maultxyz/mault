import { useCardDetailCollection } from "@/features/cards/api/use-card-detail-scope";
import { useTranslation } from "react-i18next";

export function useFoilOptions(): string[] {
  const { t } = useTranslation("cards");
  const collection = useCardDetailCollection();
  const foilTypes = collection?.game?.foilTypes;
  return foilTypes?.length ? foilTypes : [t("foil")];
}
