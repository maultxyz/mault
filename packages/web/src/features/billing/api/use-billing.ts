import { useOrg } from "@/features/companies/api/use-organization";
import { neon } from "@/lib/auth/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  billingQueryOptions,
  createCheckoutSession,
  createPortalSession,
} from "./billing";

export function useBilling() {
  const { t } = useTranslation("billing");
  const { activeOrg } = useOrg();
  const { data: activeMember } = neon.auth.useActiveMember();
  const canManage =
    activeMember?.role === "owner" || activeMember?.role === "admin";

  const { data, isLoading } = useQuery(billingQueryOptions(activeOrg?.id));

  const checkoutMutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (result) => {
      if (result.data?.url) {
        window.location.href = result.data.url;
      } else {
        toast.error(t("checkoutError"));
      }
    },
    onError: () => toast.error(t("checkoutError")),
  });

  const portalMutation = useMutation({
    mutationFn: createPortalSession,
    onSuccess: (result) => {
      if (result.data?.url) {
        window.location.href = result.data.url;
      } else {
        toast.error(t("portalError"));
      }
    },
    onError: () => toast.error(t("portalError")),
  });

  return {
    billing: data ?? null,
    isLoading,
    canManage,
    startCheckout: () => checkoutMutation.mutate(),
    isStartingCheckout: checkoutMutation.isPending,
    openPortal: () => portalMutation.mutate(),
    isOpeningPortal: portalMutation.isPending,
  };
}
