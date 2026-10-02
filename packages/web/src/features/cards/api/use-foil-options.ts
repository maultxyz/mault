import { useCollections } from "@/features/collections/api/use-collections";
import { useTranslation } from "react-i18next";

export function useFoilOptions(): string[] {
  const { t } = useTranslation("cards");
  const { activeCollection } = useCollections();
  const foilTypes = activeCollection?.game?.foilTypes;
  return foilTypes?.length ? foilTypes : [t("foil")];
}
