import { ShareLinkQr } from "@/components/share-link-qr";
import { Badge } from "@/components/ui/badge";
import type { ShareLinkDetailsProps } from "@/lib/interfaces/share-links";
import { useTranslation } from "react-i18next";

export function ShareLinkDetails({ details }: ShareLinkDetailsProps) {
  const { t } = useTranslation("common");
  const { t: tShareLinks } = useTranslation("share-links");

  return (
    <div className="flex flex-col gap-4">
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
    </div>
  );
}
