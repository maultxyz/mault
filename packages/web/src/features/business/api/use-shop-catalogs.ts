import { useBusinessAccess } from "@/features/business/api/use-business";
import { unwrapShopCatalogResult } from "@/features/business/lib/shop-catalog-result";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import type { ShopCatalogInput } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  createShopCatalog,
  deleteShopCatalog,
  resetShopCatalogLink,
  shopCatalogsQueryOptions,
  updateShopCatalog,
} from "./shop-catalogs";

export function useShopCatalogs() {
  const { t } = useTranslation("business");
  const { activeOrg } = useOrg();
  const { access, isLoading: isAccessLoading } = useBusinessAccess();
  const queryClient = useQueryClient();
  const canManage = !!access?.canManageSettings;
  const listOptions = shopCatalogsQueryOptions(canManage ? activeOrg?.id : undefined);
  const { data, isLoading, isError, refetch } = useQuery(listOptions);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: listOptions.queryKey });
  const onError = (error: Error) => toast.error(error.message);

  const create = useMutation({
    mutationFn: async (input: ShopCatalogInput) =>
      unwrapShopCatalogResult(await createShopCatalog(input), t("shopCatalogs.saveFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.created"));
      return invalidate();
    },
    onError,
  });

  const update = useMutation({
    mutationFn: async ({ guid, input }: { guid: string; input: ShopCatalogInput }) =>
      unwrapShopCatalogResult(await updateShopCatalog(guid, input), t("shopCatalogs.saveFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.saved"));
      return invalidate();
    },
    onError,
  });

  const resetLink = useMutation({
    mutationFn: async (guid: string) =>
      unwrapShopCatalogResult(await resetShopCatalogLink(guid), t("shopCatalogs.resetLinkFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.linkReset"));
      return invalidate();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (guid: string) =>
      unwrapShopCatalogResult(await deleteShopCatalog(guid), t("shopCatalogs.deleteFailed")),
    onSuccess: () => {
      toast.success(t("shopCatalogs.deleted"));
      return invalidate();
    },
    onError,
  });

  return {
    catalogs: data ?? [],
    canManage,
    isLocked: !!access?.isLocked,
    isLoading: isAccessLoading || (canManage && isLoading),
    isError,
    refetch,
    create,
    update,
    resetLink,
    remove,
  };
}
