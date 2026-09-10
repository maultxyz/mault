import {
  binRoutesQueryOptions,
  deleteBinRoute,
  saveBinRoute,
} from "@/features/calibration/api/bin-routes";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import type { BinRoutesContextValue } from "@/lib/interfaces/calibration";
import { useOrg } from "@/features/companies/api/use-organization";
import { createDefaultBinRoutes, type BinRoute } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const BinRoutesContext = createContext<BinRoutesContextValue | null>(null);

export function BinRoutesProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("calibration");
  const queryClient = useQueryClient();
  const { activeOrg } = useOrg();
  const moduleCount = useModuleCount();

  const { data: routes = createDefaultBinRoutes(moduleCount) } = useQuery({
    ...binRoutesQueryOptions,
    enabled: !!activeOrg,
  });

  const saveMutation = useMutation({
    mutationFn: saveBinRoute,
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(binRoutesQueryOptions.queryKey, result.data);
      }
    },
    onError: () => toast.error(t("useBinRoutes.toasts.saveFailed")),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const defaults = createDefaultBinRoutes(moduleCount);
      let last: Awaited<ReturnType<typeof saveBinRoute>> | null = null;
      for (const route of defaults) {
        last = await saveBinRoute(route);
      }
      return last;
    },
    onSuccess: (result) => {
      if (result?.success && result.data) {
        queryClient.setQueryData(binRoutesQueryOptions.queryKey, result.data);
        toast.success(t("useBinRoutes.toasts.resetSuccess"));
      }
    },
    onError: () => toast.error(t("useBinRoutes.toasts.resetFailed")),
  });

  const save = useCallback(
    (route: BinRoute) => {
      saveMutation.mutate(route);
    },
    [saveMutation],
  );

  const resetToDefaults = useCallback(() => {
    resetMutation.mutate();
  }, [resetMutation]);

  return (
    <BinRoutesContext
      value={{
        routes,
        isPending: saveMutation.isPending || resetMutation.isPending,
        save,
        resetToDefaults,
      }}
    >
      {children}
    </BinRoutesContext>
  );
}

export function useBinRoutes() {
  const context = useContext(BinRoutesContext);
  if (!context) {
    throw new Error("useBinRoutes must be used within a BinRoutesProvider");
  }
  return context;
}

export { deleteBinRoute };
