import { formatManaCost } from "@/features/cards/lib/format-mana-cost";
import type { CardDetailsListProps } from "@/lib/interfaces/cards";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CardDetailsList({ card }: CardDetailsListProps) {
  const { t } = useTranslation("cards");

  return (
    <>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-1.5 text-sm">
        <dt className="text-foreground/70">{t("cardDetailPanel.set")}</dt>
        <dd>
          {`${card.setName} (${card.set.toUpperCase()}) #${card.collectorNumber}`}
        </dd>
        {card.rarity && (
          <>
            <dt className="text-foreground/70">
              {t("cardDetailPanel.rarity")}
            </dt>
            <dd className="flex items-center gap-2 capitalize">
              <span
                className="size-2 rounded-full shrink-0"
                style={{ backgroundColor: `var(--${card.rarity})` }}
              />
              {card.rarity}
            </dd>
          </>
        )}
        {card.manaCost && (
          <>
            <dt className="text-foreground/70">
              {t("cardDetailPanel.manaCost")}
            </dt>
            <dd>{formatManaCost(card.manaCost)}</dd>
          </>
        )}
        {card.power != null && card.toughness != null && (
          <>
            <dt className="text-foreground/70">
              {t("cardDetailPanel.powerToughness")}
            </dt>
            <dd>
              {card.power}/{card.toughness}
            </dd>
          </>
        )}
        {card.artist && (
          <>
            <dt className="text-foreground/70">
              {t("cardDetailPanel.artist")}
            </dt>
            <dd>{card.artist}</dd>
          </>
        )}
      </dl>
      {card.sourceUrl && (
        <a
          href={card.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline w-fit"
        >
          {t("cardPicker.viewSource")}
          <IconExternalLink className="size-3.5" />
        </a>
      )}
    </>
  );
}
