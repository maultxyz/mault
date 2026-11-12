import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Share, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { orgShareLinkUrl, shareLinksQueryOptions } from "@/features/share-links/api/share-links";
import { useConfirmRevokeShareLink } from "@/features/share-links/api/use-confirm-revoke-share-link";
import { useRevokeShareLink } from "@/features/share-links/api/use-revoke-share-link";
import { ShareLinkQr } from "@/features/share-links/components/share-link-qr";
import { useActiveOrgId } from "@/hooks/use-org";
import { SPACING } from "@/lib/constants/theme";
import type { ExistingShareLinkProps } from "@/lib/interfaces/share-links";

export function ExistingShareLink({ linkGuid, subjectGuid, onClose }: ExistingShareLinkProps) {
  const { t } = useTranslation();
  const orgId = useActiveOrgId();
  const links = useQuery(shareLinksQueryOptions(orgId, subjectGuid));
  const link = links.data?.find((candidate) => candidate.guid === linkGuid);
  const revoke = useRevokeShareLink(onClose);
  const confirmRevoke = useConfirmRevokeShareLink();
  const url = link ? orgShareLinkUrl(link) : null;

  return (
    <View style={{ gap: SPACING.xl }}>
      {links.isLoading ? <PageSkeleton /> : null}
      {revoke.isError ? <Callout tone="destructive" title={t("shareLinks.revokeFailed")} /> : null}
      {!links.isLoading && !link ? <Callout tone="info" title={t("shareLinks.notFound")} /> : null}
      {link && url ? (
        <>
          <AppText size="sm" tone="secondary">
            {[
              link.purpose === "trade" ? t("shareLink.tradeType") : t("shareLink.monitorType"),
              link.showsPrices ? t("shareLinks.pricesShown") : t("shareLinks.pricesHidden"),
            ].join(" · ")}
          </AppText>
          <ShareLinkQr url={url} expiresAt={link.expiresAt} />
        </>
      ) : null}
      <View style={{ gap: SPACING.sm }}>
        {url ? <Button icon="share" label={t("shareLink.share")} onPress={() => void Share.share({ message: url, url })} /> : null}
        {link ? (
          <Button
            variant="destructive"
            label={t("shareLinks.revoke")}
            loading={revoke.isPending}
            onPress={() => confirmRevoke(() => revoke.mutate(link.guid))}
          />
        ) : null}
        <Button variant="secondary" icon="arrowLeft" label={t("shareLinks.backToLinks")} onPress={onClose} />
      </View>
    </View>
  );
}
