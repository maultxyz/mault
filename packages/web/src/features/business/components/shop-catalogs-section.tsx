import { LoadErrorCallout } from "@/components/load-error-callout";
import { DeleteDialog } from "@/components/delete-dialog";
import { EmptyState } from "@/components/empty-state";
import { PlanNotice } from "@/components/plan-notice";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShopCatalogsSkeleton } from "@/features/business/components/shop-catalogs-skeleton";
import { useShopCatalogs } from "@/features/business/api/use-shop-catalogs";
import { ShopCatalogLinkDialog } from "@/features/business/components/shop-catalog-link-dialog";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  SHOP_CATALOG_LINK_PARAM,
  SHOP_CATALOG_NEW_PATH,
  shopCatalogEditPath,
} from "@/lib/constants/business";
import type { ShopCatalog } from "@magic-vault/shared";
import { IconBuildingStore, IconDots, IconPlus, IconQrcode } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export function ShopCatalogsSection() {
  const { t } = useTranslation("business");
  const isMobile = useIsMobile();
  const {
    catalogs,
    canManage,
    isLocked,
    isLoading,
    isError,
    refetch,
    resetLink,
    remove,
  } = useShopCatalogs();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [deleteTarget, setDeleteTarget] = useState<ShopCatalog | null>(null);
  const linkTargetGuid = searchParams.get(SHOP_CATALOG_LINK_PARAM);
  const linkTarget = catalogs.find((catalog) => catalog.guid === linkTargetGuid) ?? null;
  const setLinkTargetGuid = (guid: string | null) =>
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (guid) next.set(SHOP_CATALOG_LINK_PARAM, guid);
        else next.delete(SHOP_CATALOG_LINK_PARAM);
        return next;
      },
      { replace: true },
    );

  function sourceSummary(catalog: ShopCatalog): string {
    return [...catalog.collections, ...catalog.storageLocations]
      .map((source) => source.name)
      .join(", ");
  }

  return (
    <SettingsSection
      heading={t("shopCatalogs.heading")}
      action={
        canManage &&
        !isLocked && (
          <Button
            variant="outline"
            render={<Link to={SHOP_CATALOG_NEW_PATH} />}
            nativeButton={false}
          >
            <IconPlus />
            {t("shopCatalogs.add")}
          </Button>
        )
      }
    >
      {isLocked && (
        <PlanNotice message={t("shopCatalogs.upgrade")} linkLabel={t("upgrade.link")} />
      )}
      {isError && (
        <LoadErrorCallout
          message={t("shopCatalogs.loadFailed")}
          onRetry={() => void refetch()}
        />
      )}
      {isLoading && <ShopCatalogsSkeleton />}
      {!isLoading && canManage && !isError && catalogs.length === 0 && (
        <EmptyState
          size="compact"
          icon={IconBuildingStore}
          title={t("shopCatalogs.empty")}
        />
      )}
      {!isLoading && catalogs.length > 0 && (
        <div className="flex flex-col divide-y divide-border">
          {catalogs.map((catalog) => {
            const sources = sourceSummary(catalog);
            return (
              <div
                key={catalog.guid}
                className="flex items-center gap-3 py-2.5 text-sm first:pt-0 md:items-start md:px-3 md:first:pt-2.5"
              >
                <IconBuildingStore
                  className="size-4 shrink-0 text-foreground/70 md:mt-0.5"
                  aria-hidden
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="max-w-full truncate font-medium">{catalog.name}</p>
                    {catalog.isPublic && (
                      <Badge variant="info">{t("shopCatalogs.publicBadge")}</Badge>
                    )}
                    {!catalog.showsPrices && (
                      <Badge variant="outline">{t("shopCatalogs.pricesHidden")}</Badge>
                    )}
                    {catalog.allowsReservations && (
                      <Badge variant="outline">{t("shopCatalogs.reservationsOn")}</Badge>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-foreground/70 md:line-clamp-1">
                    {sources || t("shopCatalogs.noLiveSources")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size={isMobile ? "icon" : "default"}
                    aria-label={isMobile ? t("shopCatalogs.showLink") : undefined}
                    onClick={() => setLinkTargetGuid(catalog.guid)}
                  >
                    <IconQrcode />
                    {!isMobile && t("shopCatalogs.showLink")}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("shopCatalogs.actionsFor", { name: catalog.name })}
                        >
                          <IconDots />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={isLocked}
                        onClick={() => navigate(shopCatalogEditPath(catalog.guid))}
                      >
                        {t("shopCatalogs.edit")}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => setDeleteTarget(catalog)}
                      >
                        {t("shopCatalogs.delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ShopCatalogLinkDialog
        catalog={linkTarget}
        onOpenChange={(open) => {
          if (!open) setLinkTargetGuid(null);
        }}
        isResetting={resetLink.isPending}
        onResetLink={(catalog) => resetLink.mutate(catalog.guid)}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("shopCatalogs.deleteConfirmTitle")}
        description={t("shopCatalogs.deleteConfirmDescription")}
        confirm={{ type: "simple" }}
        confirmLabel={t("shopCatalogs.delete")}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.guid);
          setDeleteTarget(null);
        }}
      />
    </SettingsSection>
  );
}
