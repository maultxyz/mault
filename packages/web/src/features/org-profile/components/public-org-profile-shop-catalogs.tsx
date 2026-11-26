import { IconBadge } from "@/components/icon-badge";
import type { PublicOrgProfileShopCatalogsProps } from "@/lib/interfaces/org-profile";
import { IconBuildingStore, IconChevronRight } from "@tabler/icons-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function PublicOrgProfileShopCatalogs({ catalogs }: PublicOrgProfileShopCatalogsProps) {
  const { t, i18n } = useTranslation("org-profile");
  const headingId = useId();
  const gameList = new Intl.ListFormat(i18n.language, { style: "short", type: "unit" });

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h2 id={headingId} className="font-heading text-sm font-semibold">
        {t("public.shopsHeading")}
      </h2>
      <ul className="flex flex-col gap-2">
        {catalogs.map((catalog) => (
          <li key={catalog.url}>
            <a
              href={catalog.url}
              className="flex items-center gap-3 rounded-card bg-card p-3 transition-colors outline-none hover:bg-foreground/6 focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
            >
              <IconBadge aria-hidden>
                <IconBuildingStore className="size-4" />
              </IconBadge>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{catalog.name}</span>
                <span className="text-xs text-foreground/70 tabular-nums">
                  {t("public.catalogCardCount", { count: catalog.cardCount })}
                </span>
                {catalog.games.length > 0 && (
                  <span className="truncate text-xs text-foreground/70">
                    {gameList.format(catalog.games.map((game) => game.name))}
                  </span>
                )}
              </span>
              <IconChevronRight aria-hidden className="size-4 shrink-0 text-foreground/70" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
