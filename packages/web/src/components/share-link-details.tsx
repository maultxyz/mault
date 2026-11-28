import { ShareLinkQr } from "@/components/share-link-qr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { copyWithToast } from "@/lib/clipboard";
import { IconCopy, IconDeviceTv, IconExternalLink } from "@tabler/icons-react";
import type { ShareLinkDetailsProps } from "@/lib/interfaces/share-links";
import { useTranslation } from "react-i18next";

export function ShareLinkDetails({ details }: ShareLinkDetailsProps) {
  const { t } = useTranslation("common");
  const { t: tShareLinks } = useTranslation("share-links");

  return (
    <div className="flex flex-col gap-4 md:gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">
          {details.purpose === "trade"
            ? t("shareLink.tradeType")
            : t("shareLink.monitorType")}
        </Badge>
        <Badge variant="outline">
          {details.showsPrices
            ? tShareLinks("pricesShown")
            : tShareLinks("pricesHidden")}
        </Badge>
      </div>
      <ShareLinkQr url={details.url} expiresAt={details.expiresAt} />
      {details.displayUrl && (
        <div className="flex items-center gap-3 rounded-lg bg-foreground/6 p-3">
          <IconDeviceTv className="shrink-0 text-foreground/70" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm font-medium">{t("shareLink.displayTitle")}</p>
            <p className="text-xs text-foreground/70">{t("shareLink.displayDescription")}</p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("shareLink.copyDisplay")}
              onClick={() =>
                void copyWithToast(
                  details.displayUrl ?? "",
                  t("shareLink.copied"),
                  t("shareLink.copyFailed"),
                )
              }
            >
              <IconCopy />
            </Button>
            <Button
              variant="outline"
              render={
                <a href={details.displayUrl} target="_blank" rel="noopener noreferrer">
                  <IconExternalLink />
                  {t("shareLink.openDisplay")}
                </a>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
