import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { formatShortDate, formatShortDateTime } from "@/lib/format";
import type { ShareLinkRowProps } from "@/lib/interfaces/share-links";
import { cn } from "@/lib/utils";
import { IconLoader2, IconQrcode } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ShareLinkRow({
  link,
  isRevoking,
  onShowQr,
  onRevoke,
}: ShareLinkRowProps) {
  const { t } = useTranslation("share-links");
  const isMobile = useIsMobile();
  const created = formatShortDateTime(link.createdAt);

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2.5 text-sm",
        !isMobile && "px-3",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge variant="outline">
            {link.purpose === "trade"
              ? t("common:shareLink.tradeType")
              : t("common:shareLink.monitorType")}
          </Badge>
          {!link.showsPrices && (
            <Badge variant="outline">{t("pricesHidden")}</Badge>
          )}
        </div>
        <p className="text-xs text-foreground/70">
          {[
            t("created", { date: formatShortDate(link.createdAt) }),
            t("expires", { date: formatShortDateTime(link.expiresAt) }),
          ].join(" · ")}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t("showQr", { date: created })}
          onClick={() => onShowQr(link)}
        >
          <IconQrcode />
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-destructive"
          aria-label={t("revokeLabel", { date: created })}
          disabled={isRevoking}
          onClick={() => onRevoke(link)}
        >
          {isRevoking && <IconLoader2 className="animate-spin" />}
          {t("revoke")}
        </Button>
      </div>
    </div>
  );
}
