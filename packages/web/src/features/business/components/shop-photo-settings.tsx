import { Button } from "@/components/ui/button";
import type { ShopPhotoSettingsProps } from "@/lib/interfaces/shop-catalogs";
import { toast } from "@/lib/toast";
import { SHOP_PHOTO_MAX_UPLOAD_BYTES, SHOP_PHOTO_MIME_TYPES } from "@magic-vault/shared";
import { IconLoader2, IconPhoto, IconTrash, IconUpload } from "@tabler/icons-react";
import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";

export function ShopPhotoSettings({
  photoUrl,
  canEdit,
  isUploading,
  isRemoving,
  onUpload,
  onRemove,
}: ShopPhotoSettingsProps) {
  const { t } = useTranslation("business");
  const inputRef = useRef<HTMLInputElement>(null);
  const descriptionId = useId();

  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (!SHOP_PHOTO_MIME_TYPES.includes(file.type)) {
      toast.error(t("shopCatalogs.photo.wrongType"));
      return;
    }
    if (file.size > SHOP_PHOTO_MAX_UPLOAD_BYTES) {
      toast.error(t("shopCatalogs.photo.tooLarge"));
      return;
    }
    onUpload(file);
  };

  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-card">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={t("shopCatalogs.photo.previewAlt")}
            className="size-full object-cover"
          />
        ) : (
          <IconPhoto className="size-5 text-foreground/70" aria-hidden />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium">{t("shopCatalogs.photo.heading")}</p>
        <p id={descriptionId} className="text-xs text-foreground/70">
          {t("shopCatalogs.photo.description")}
        </p>
      </div>
      {canEdit && (
        <div className="flex shrink-0 gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept={SHOP_PHOTO_MIME_TYPES.join(",")}
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              pickFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            variant="outline"
            aria-describedby={descriptionId}
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? <IconLoader2 className="animate-spin" /> : <IconUpload />}
            {photoUrl ? t("shopCatalogs.photo.replace") : t("shopCatalogs.photo.upload")}
          </Button>
          {photoUrl && (
            <Button
              variant="outline"
              size="icon"
              aria-label={t("shopCatalogs.photo.remove")}
              disabled={isRemoving}
              onClick={onRemove}
            >
              <IconTrash />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
