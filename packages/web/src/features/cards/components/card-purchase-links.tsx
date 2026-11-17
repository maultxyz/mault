import type { CardPurchaseLinksProps } from "@/lib/interfaces/cards";
import {
  PRICE_SOURCES,
  PRICE_SOURCE_STORE_NAME_KEYS,
} from "@magic-vault/shared";
import { IconExternalLink } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CardPurchaseLinks({ card }: CardPurchaseLinksProps) {
  const { t } = useTranslation("cards");
  const links = PRICE_SOURCES.flatMap((source) => {
    const url = card.purchaseLinks?.[source];
    return url ? [{ source, url }] : [];
  });
  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {links.map(({ source, url }) => (
        <a
          key={source}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline w-fit"
        >
          {t(PRICE_SOURCE_STORE_NAME_KEYS[source])}
          <IconExternalLink className="size-3.5" />
        </a>
      ))}
    </div>
  );
}
