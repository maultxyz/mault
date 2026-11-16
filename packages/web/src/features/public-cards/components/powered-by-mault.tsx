import { BrandIcon } from "@/components/brand-icon";
import { SITE_DOMAIN, SITE_URL } from "@/lib/constants/seo";
import type { PoweredByMaultProps } from "@/lib/interfaces/public-cards";
import { cn } from "@/lib/utils";
import {
  BRAND_ICON_TIGHT_ASPECT_RATIO,
  BRAND_ICON_TIGHT_VIEW_BOX,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function PoweredByMault({ className }: PoweredByMaultProps) {
  const { t } = useTranslation("common");
  return (
    <a
      href={SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("shareLink.poweredByLabel", { site: SITE_DOMAIN })}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm text-xs text-foreground/70 transition-colors hover:text-foreground motion-reduce:transition-none",
        className,
      )}
    >
      <span>{t("shareLink.poweredBy")}</span>
      <span className="inline-flex items-center gap-1 font-heading font-semibold text-foreground">
        <BrandIcon
          viewBox={BRAND_ICON_TIGHT_VIEW_BOX}
          className="h-2.5 shrink-0"
          style={{ width: `calc(0.625rem * ${BRAND_ICON_TIGHT_ASPECT_RATIO})` }}
        />
        {SITE_DOMAIN}
      </span>
    </a>
  );
}
