import { Callout } from "@/components/callout";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useShopCatalogs } from "@/features/business/api/use-shop-catalogs";
import { ShopCatalogDialog } from "@/features/business/components/shop-catalog-dialog";
import { ShopPhotoSettings } from "@/features/business/components/shop-photo-settings";
import { ShopCatalogLinkDialog } from "@/features/business/components/shop-catalog-link-dialog";
import type { ShopCatalog } from "@magic-vault/shared";
import { IconBuildingStore, IconDots, IconPlus, IconQrcode } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ShopCatalogsSection() {
  const { t } = useTranslation("business");
  const {
    catalogs,
    canManage,
    isLocked,
    isLoading,
    isError,
    create,
    update,
    resetLink,
    remove,
    photoUrl,
    uploadPhoto,
    removePhoto,
  } = useShopCatalogs();
  const [dialogTarget, setDialogTarget] = useState<ShopCatalog | "new" | null>(null);
  const [linkTargetGuid, setLinkTargetGuid] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShopCatalog | null>(null);
  const editing = dialogTarget === "new" ? null : dialogTarget;
  const linkTarget = catalogs.find((catalog) => catalog.guid === linkTargetGuid) ?? null;

  function sourceSummary(catalog: ShopCatalog): string {
    return [...catalog.collections, ...catalog.storageLocations]
      .map((source) => source.name)
      .join(", ");
  }

  return (
    <SettingsSection
      heading={t("shopCatalogs.heading")}
      description={t("shopCatalogs.description")}
      action={
        canManage &&
        !isLocked && (
          <Button type="button" variant="outline" onClick={() => setDialogTarget("new")}>
            <IconPlus />
            {t("shopCatalogs.add")}
          </Button>
        )
      }
    >
      {isLocked && (
        <PlanNotice message={t("shopCatalogs.upgrade")} linkLabel={t("upgrade.link")} />
      )}
      {canManage && (
        <ShopPhotoSettings
          photoUrl={photoUrl}
          canEdit={!isLocked}
          isUploading={uploadPhoto.isPending}
          isRemoving={removePhoto.isPending}
          onUpload={(file) => uploadPhoto.mutate(file)}
          onRemove={() => removePhoto.mutate()}
        />
      )}
      {isError && <Callout variant="error">{t("shopCatalogs.loadFailed")}</Callout>}
      {isLoading && <Skeleton className="h-14 w-full rounded-xl" />}
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
              <div key={catalog.guid} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <IconBuildingStore
                  className="mt-0.5 size-4 shrink-0 text-foreground/70"
                  aria-hidden
                />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate font-medium">{catalog.name}</p>
                    {catalog.isPublic && (
                      <Badge variant="info">{t("shopCatalogs.publicBadge")}</Badge>
                    )}
                    {!catalog.showsPrices && (
                      <Badge variant="outline">{t("shopCatalogs.pricesHidden")}</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-foreground/70">
                    {sources || t("shopCatalogs.noLiveSources")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLinkTargetGuid(catalog.guid)}
                  >
                    <IconQrcode />
                    {t("shopCatalogs.showLink")}
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
                        onClick={() => setDialogTarget(catalog)}
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

      <ShopCatalogDialog
        open={dialogTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDialogTarget(null);
        }}
        catalog={editing}
        isSaving={create.isPending || update.isPending}
        onSubmit={(input) => {
          if (editing) {
            update.mutate(
              { guid: editing.guid, input },
              { onSuccess: () => setDialogTarget(null) },
            );
          } else {
            create.mutate(input, {
              onSuccess: (created) => {
                setDialogTarget(null);
                setLinkTargetGuid(created.guid);
              },
            });
          }
        }}
      />

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
