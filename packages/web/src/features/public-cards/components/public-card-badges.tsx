import { Badge } from "@/components/ui/badge";
import type { PublicCardBadgesProps } from "@/lib/interfaces/public-cards";
import { cn } from "@/lib/utils";
import { DEFAULT_CARD_LANGUAGE, scanLanguage } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function PublicCardBadges({ entry, className }: PublicCardBadgesProps) {
  const { t } = useTranslation("cards");
  const language = scanLanguage(entry);
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      <Badge variant="secondary" className="shadow-md">
        {entry.condition}
      </Badge>
      {entry.isFoil && (
        <Badge variant="secondary" className="shadow-md">
          {entry.foilType ?? t("foil")}
        </Badge>
      )}
      {language !== (entry.card.lang || DEFAULT_CARD_LANGUAGE) && (
        <Badge variant="secondary" className="shadow-md">
          {language.toUpperCase()}
        </Badge>
      )}
    </span>
  );
}
