import { useBusinessAccess } from "@/features/business/api/use-business";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import type { Result, ShopCatalogInput } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  createShopCatalog,
  deleteShopCatalog,
  removeShopPhoto,
  resetShopCatalogLink,
  shopCatalogsQueryOptions,
  shopPhotoQueryOptions,
  uploadShopPhoto,
  updateShopCatalog,
} from "./shop-catalogs";

function unwrap<T>(result: Result<T>, fallback: string): T {
  if (!result.success) throw new Error(result.message || fallback);
  return result.data as T;
}

export function useShopCatalogs() {
  const { t } = useTranslation("business");
  const { activeOrg } = useOrg();
  const { access, isLoading: isAccessLoading } = useBusinessAccess();
  const queryClient = useQueryClient();
  const canManage = !!access?.canManageSettings;
  const listOptions = shopCatalogsQueryOptions(canManage ? activeOrg?.id : undefined);
  const { data, isLoading, isError } = useQuery(listOptions);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey });
  const onError = (error: Error) => toast.error(error.message);

  const create = useMutation({
    mutationFn: async (input: ShopCatalogInput) =>
      unwrap(await createShopCatalog(input), t("shopCatalogs.saveFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.created"));
      return invalidate();
    },
    onError,
  });

  const update = useMutation({
    mutationFn: async ({ guid, input }: { guid: string; input: ShopCatalogInput }) =>
      unwrap(await updateShopCatalog(guid, input), t("shopCatalogs.saveFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.saved"));
      return invalidate();
    },
    onError,
  });

  const resetLink = useMutation({
    mutationFn: async (guid: string) =>
      unwrap(await resetShopCatalogLink(guid), t("shopCatalogs.resetLinkFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.linkReset"));
      return invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (guid: string) =>
      unwrap(await deleteShopCatalog(guid), t("shopCatalogs.deleteFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.deleted"));
      return invalidate();
    },
    onError,
  });

  const photoOptions = shopPhotoQueryOptions(canManage ? activeOrg?.id : undefined);
  const { data: photo } = useQuery(photoOptions);
  const invalidatePhoto = () =>
    queryClient.invalidateQueries({ queryKey: photoOptions.queryKey });

  const uploadPhoto = useMutation({
    mutationFn: async (file: File) =>
      unwrap(await uploadShopPhoto(file), t("shopCatalogs.photo.uploadFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.photo.uploaded"));
      return invalidatePhoto();
    },
    onError,
  });

  const removePhoto = useMutation({
    mutationFn: async () =>
      unwrap(await removeShopPhoto(), t("shopCatalogs.photo.removeFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.photo.removed"));
      return invalidatePhoto();
    },
    onError,
  });

  return {
    photoUrl: photo?.url ?? null,
    uploadPhoto,
    removePhoto,
    catalogs: data ?? [],
    canManage,
    isLocked: !!access?.isLocked,
    isLoading: isAccessLoading || (canManage && isLoading),
    isError,
    create,
    update,
    resetLink,
    remove,
  };
}
