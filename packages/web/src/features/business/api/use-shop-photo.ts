import { useBusinessAccess } from "@/features/business/api/use-business";
import { unwrapShopCatalogResult } from "@/features/business/lib/shop-catalog-result";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { removeShopPhoto, shopPhotoQueryOptions, uploadShopPhoto } from "./shop-catalogs";

export function useShopPhoto() {
  const { t } = useTranslation("business");
  const { activeOrg } = useOrg();
  const { access } = useBusinessAccess();
  const queryClient = useQueryClient();
  const photoOptions = shopPhotoQueryOptions(activeOrg?.id);
  const photo = useQuery(photoOptions);
  const invalidatePhoto = () => queryClient.invalidateQueries({ queryKey: photoOptions.queryKey });
  const onError = (error: Error) => toast.error(error.message);

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) =>
      unwrapShopCatalogResult(await uploadShopPhoto(file), t("shopCatalogs.photo.uploadFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.photo.uploaded"));
      return invalidatePhoto();
    },
    onError,
  });

  const removePhoto = useMutation({
    mutationFn: async () =>
      unwrapShopCatalogResult(await removeShopPhoto(), t("shopCatalogs.photo.removeFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.photo.removed"));
      return invalidatePhoto();
    },
    onError,
  });

  return {
    photoUrl: photo.data?.url ?? null,
    isLoading: photo.isLoading || !access,
    canManage: !!access?.canManageSettings,
    isLocked: !!access?.isLocked,
    uploadPhoto,
    removePhoto,
  };
}
