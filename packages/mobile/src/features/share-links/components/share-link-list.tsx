import { useTranslation } from "react-i18next";
import type { OrgShareLink } from "@magic-vault/shared";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { useConfirmRevokeShareLink } from "@/features/share-links/api/use-confirm-revoke-share-link";
import { formatDateTime } from "@/lib/dates";
import type { ShareLinkListProps } from "@/lib/interfaces/share-links";

export function ShareLinkList({ links, onSelect, onRevoke }: ShareLinkListProps) {
  const { t, i18n } = useTranslation();
  const confirmRevoke = useConfirmRevokeShareLink();
  const details = (link: OrgShareLink) =>
    [
      link.purpose === "trade" ? t("shareLink.tradeType") : t("shareLink.monitorType"),
      link.showsPrices ? t("shareLinks.pricesShown") : t("shareLinks.pricesHidden"),
    ].join(" · ");
  const expiry = (link: OrgShareLink) =>
    t("shareLink.expiresAt", { date: formatDateTime(link.expiresAt, i18n.language) });

  return (
    <ListGroup>
      {links.map((link) => (
        <ListRow
          key={link.guid}
          icon="share"
          title={details(link)}
          subtitle={expiry(link)}
          onPress={() => onSelect(link)}
          onLongPress={() => confirmRevoke(() => onRevoke(link))}
          longPressLabel={t("shareLinks.revoke")}
        />
      ))}
    </ListGroup>
  );
}
