import { BrandIcon } from "@/components/brand-icon";
import { SITE_DOMAIN, SITE_URL } from "@/lib/constants/seo";
import type { PoweredByMaultProps } from "@/lib/interfaces/public-cards";
import { cn } from "@/lib/utils";
import {
  BRAND_ICON_TIGHT_ASPECT_RATIO,
  BRAND_ICON_TIGHT_VIEW_BOX,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function PoweredByMault({ className, isInverted = false }: PoweredByMaultProps) {
  const { t } = useTranslation("common");
  return (
    <a
      href={SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("shareLink.poweredByLabel", { site: SITE_DOMAIN })}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm text-xs transition-colors motion-reduce:transition-none",
        isInverted
          ? "text-white/80 hover:text-white"
          : "text-foreground/70 hover:text-foreground",
        className,
      )}
    >
      <span>{t("shareLink.poweredBy")}</span>
      <span
        className={cn(
          "inline-flex items-center gap-1 font-heading font-semibold",
          isInverted ? "text-white" : "text-foreground",
        )}
      >
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
