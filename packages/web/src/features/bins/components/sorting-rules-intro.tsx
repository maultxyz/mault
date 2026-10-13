import { PageIntro } from "@/components/page-intro";
import { useCollections } from "@/features/collections/api/use-collections";
import type { SortingRulesIntroProps } from "@/lib/interfaces/bins";
import { useTranslation } from "react-i18next";

export function SortingRulesIntro({ className }: SortingRulesIntroProps) {
  const { t } = useTranslation("bins");
  const { activeCollection } = useCollections();
  const gameName = activeCollection?.game?.name;

  return (
    <PageIntro
      className={className}
      title={t("page.title")}
      description={
        gameName
          ? t("page.description", { game: gameName })
          : t("page.descriptionNoGame")
      }
    />
  );
}
