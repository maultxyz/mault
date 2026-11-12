import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Share, View } from "react-native";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { PageHeader } from "@/components/ui/page-header";
import { PinnedActionsLayout } from "@/components/ui/pinned-actions-layout";
import { QrCode } from "@/components/ui/qr-code";
import { buildShopCatalogUrl, shopCatalogsQueryOptions } from "@/features/business/api/shop-catalogs";
import { businessAccessQueryOptions } from "@/features/business/api/business-access";
import { useActiveOrg } from "@/hooks/use-org";
import { usePanelWidth } from "@/hooks/use-panel-width";
import { useTheme } from "@/hooks/use-theme";
import { QR_CODE_MAX_SIZE } from "@/lib/constants/share-links";
import { SCREEN_GUTTER, SPACING } from "@/lib/constants/theme";

export default function ShopCatalogLinkScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const panelWidth = usePanelWidth();
  const { guid } = useLocalSearchParams<{ guid?: string }>();
  const org = useActiveOrg();
  const orgId = org?.id ?? null;
  const access = useQuery(businessAccessQueryOptions(orgId));
  const list = useQuery(shopCatalogsQueryOptions(orgId, !!access.data?.canManageSettings));
  const catalog = list.data?.find((candidate) => candidate.guid === guid) ?? null;
  const linkUrl = catalog ? buildShopCatalogUrl(catalog) : null;

  return (
    <View collapsable={false} style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={catalog ? t("settings.shopCatalogs.linkTitle", { name: catalog.name }) : t("settings.shopCatalogs.heading")}
        subtitle={t("settings.shopCatalogs.linkDescription")}
      />
      <PinnedActionsLayout
        actions={
          linkUrl ? (
            <Button size="lg" icon="share" label={t("shareLink.share")} onPress={() => void Share.share({ message: linkUrl, url: linkUrl })} />
          ) : null
        }
      >
        {list.isError ? <Callout tone="destructive" title={t("settings.shopCatalogs.loadFailed")} /> : null}
        {catalog && linkUrl ? (
          <View style={{ alignItems: "center", gap: SPACING.md }}>
            <QrCode
              value={linkUrl}
              size={Math.min(panelWidth - SCREEN_GUTTER * 4, QR_CODE_MAX_SIZE)}
              accessibilityLabel={t("shareLink.qrLabel")}
            />
            <AppText selectable size="sm" style={{ textAlign: "center" }}>
              {linkUrl}
            </AppText>
            <AppText size="xs" tone="secondary" style={{ textAlign: "center" }}>
              {catalog.isPublic ? t("settings.shopCatalogs.publicLinkNote") : t("settings.shopCatalogs.linkNeverExpires")}
            </AppText>
          </View>
        ) : catalog ? (
          <AppText size="sm" tone="secondary">
            {t("settings.shopCatalogs.linksNotConfigured")}
          </AppText>
        ) : null}
      </PinnedActionsLayout>
    </View>
  );
}
