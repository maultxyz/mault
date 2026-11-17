import { collectionCardsKeys } from "@/features/collections/api/collection-cards";
import { useOrg } from "@/features/companies/api/use-organization";
import { toast } from "@/lib/toast";
import type { Result } from "@magic-vault/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  businessKeys,
  businessSettingsQueryOptions,
  cardAcquisitionCostQueryOptions,
  setCardAcquisitionCost,
} from "@/features/business/api/business";

export function useBusinessAccess() {
  const { activeOrg } = useOrg();
  const { data, isLoading } = useQuery(
    businessSettingsQueryOptions(activeOrg?.id),
  );
  return {
    orgId: activeOrg?.id,
    access: data?.access ?? null,
    settings: data?.settings ?? null,
    isLoading,
  };
}

export function useBusinessAction() {
  const { t } = useTranslation("business");
  const queryClient = useQueryClient();
  return useCallback(
    async <T>(
      action: () => Promise<Result<T>>,
      successMessage?: string,
    ): Promise<Result<T> | null> => {
      try {
        const result = await action();
        if (!result.success) {
          toast.error(result.message || t("errors.generic"));
          return null;
        }
        if (successMessage) toast.success(successMessage);
        await queryClient.invalidateQueries({ queryKey: businessKeys.root() });
        return result;
      } catch {
        toast.error(t("errors.generic"));
        return null;
      } finally {
        void queryClient.invalidateQueries({
          queryKey: collectionCardsKeys.root(),
        });
      }
    },
    [queryClient, t],
  );
}

export function useSaveCardAcquisitionCost() {
  const { t } = useTranslation("cards");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  return useCallback(
    async (targetScanId: string, cost: number | null) => {
      try {
        const result = await setCardAcquisitionCost(targetScanId, { cost });
        if (!result.success) {
          toast.error(result.message || t("cardDetailPanel.pricePaidSaveFailed"));
        }
      } catch {
        toast.error(t("cardDetailPanel.pricePaidSaveFailed"));
      } finally {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: businessKeys.cardCost(activeOrg?.id, targetScanId),
          }),
          queryClient.invalidateQueries({
            queryKey: businessKeys.intakeRoot(),
          }),
        ]);
      }
    },
    [activeOrg?.id, queryClient, t],
  );
}

export function useCardAcquisitionCost(scanId: string | undefined) {
  const { activeOrg } = useOrg();
  const { data } = useQuery(
    cardAcquisitionCostQueryOptions(activeOrg?.id, scanId),
  );
  const saveCardAcquisitionCost = useSaveCardAcquisitionCost();
  return { acquisitionCost: data ?? null, saveCardAcquisitionCost };
}
