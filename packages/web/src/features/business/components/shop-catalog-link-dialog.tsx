import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { buildShopCatalogUrl } from "@/features/business/api/shop-catalogs";
import { useQrCodeDataUrl } from "@/hooks/use-qr-code-data-url";
import { copyWithToast } from "@/lib/clipboard";
import type { ShopCatalogLinkDialogProps } from "@/lib/interfaces/shop-catalogs";
import { IconCopy, IconExternalLink, IconLoader2 } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function ShopCatalogLinkDialog({
  catalog,
  onOpenChange,
  isResetting,
  onResetLink,
}: ShopCatalogLinkDialogProps) {
  const { t } = useTranslation("business");
  const { t: tCommon } = useTranslation("common");
  const linkInputId = useId();
  const [confirmsReset, setConfirmsReset] = useState(false);
  const url = catalog ? buildShopCatalogUrl(catalog) : null;
  const qrCodeDataUrl = useQrCodeDataUrl(url);

  return (
    <>
      <DynamicDialog
        open={!!catalog}
        onOpenChange={onOpenChange}
        title={t("shopCatalogs.linkTitle", { name: catalog?.name ?? "" })}
        description={t("shopCatalogs.linkDescription")}
        footer={
          <>
            {!catalog?.isPublic && (
              <Button
                variant="outline"
                className="text-destructive md:mr-auto"
                disabled={!catalog?.linkToken || isResetting}
                onClick={() => setConfirmsReset(true)}
              >
                {isResetting && <IconLoader2 className="animate-spin" />}
                {t("shopCatalogs.resetLink")}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon("shareLink.close")}
            </Button>
            {url && (
              <Button
                nativeButton={false}
                render={<a href={url} target="_blank" rel="noreferrer" />}
              >
                <IconExternalLink />
                {t("shopCatalogs.openLink")}
              </Button>
            )}
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        {url ? (
          <div className="flex flex-col gap-4">
            {qrCodeDataUrl && (
              <figure className="flex flex-col items-center gap-1.5">
                <img
                  src={qrCodeDataUrl}
                  alt={tCommon("shareLink.qrAlt")}
                  className="size-44 rounded-lg ring-1 ring-border"
                />
                <figcaption className="text-xs text-foreground/70">
                  {tCommon("shareLink.qrHint")}
                </figcaption>
              </figure>
            )}
            <Field>
              <FieldLabel htmlFor={linkInputId}>
                {tCommon("shareLink.linkLabel")}
              </FieldLabel>
              <div className="flex gap-1.5">
                <Input
                  id={linkInputId}
                  readOnly
                  value={url}
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={tCommon("shareLink.copy")}
                  onClick={() =>
                    void copyWithToast(
                      url,
                      tCommon("shareLink.copied"),
                      tCommon("shareLink.copyFailed"),
                    )
                  }
                >
                  <IconCopy />
                </Button>
              </div>
              <p className="text-xs text-foreground/70">
                {catalog?.isPublic
                  ? t("shopCatalogs.publicLinkNote")
                  : t("shopCatalogs.linkNeverExpires")}
              </p>
            </Field>
          </div>
        ) : (
          <p className="text-sm text-foreground/70">
            {t("shopCatalogs.linksNotConfigured")}
          </p>
        )}
      </DynamicDialog>
      <DeleteDialog
        open={confirmsReset}
        onOpenChange={setConfirmsReset}
        title={t("shopCatalogs.resetLinkConfirmTitle")}
        description={t("shopCatalogs.resetLinkConfirmDescription")}
        confirm={{ type: "simple" }}
        confirmLabel={t("shopCatalogs.resetLink")}
        onConfirm={() => {
          setConfirmsReset(false);
          if (catalog) onResetLink(catalog);
        }}
      />
    </>
  );
}
