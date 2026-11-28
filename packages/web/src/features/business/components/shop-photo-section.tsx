import { PlanNotice } from "@/components/plan-notice";
import { SettingsSection } from "@/components/settings-section";
import { Skeleton } from "@/components/ui/skeleton";
import { useShopPhoto } from "@/features/business/api/use-shop-photo";
import { ShopPhotoSettings } from "@/features/business/components/shop-photo-settings";
import { useTranslation } from "react-i18next";

export function ShopPhotoSection() {
  const { t } = useTranslation("business");
  const { photoUrl, isLoading, canManage, isLocked, uploadPhoto, removePhoto } = useShopPhoto();

  return (
    <SettingsSection
      heading={t("shopCatalogs.photo.heading")}
      description={t("shopCatalogs.photo.description")}
    >
      {isLocked && <PlanNotice message={t("shopCatalogs.photo.upgrade")} linkLabel={t("upgrade.link")} />}
      {isLoading ? (
        <Skeleton className="h-22 w-full rounded-lg" />
      ) : (
        <ShopPhotoSettings
          photoUrl={photoUrl}
          canEdit={canManage && !isLocked}
          isUploading={uploadPhoto.isPending}
          isRemoving={removePhoto.isPending}
          onUpload={(file) => uploadPhoto.mutate(file)}
          onRemove={() => removePhoto.mutate()}
        />
      )}
    </SettingsSection>
  );
}
