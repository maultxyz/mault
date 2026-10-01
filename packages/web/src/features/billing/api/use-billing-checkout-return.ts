import { useOrg } from "@/features/companies/api/use-organization";
import { BILLING_RETURN_PARAM } from "@/lib/constants/settings";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

export function useBillingCheckoutReturn() {
  const { t } = useTranslation("billing");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const result = searchParams.get(BILLING_RETURN_PARAM);

  useEffect(() => {
    if (!result) return;
    if (result === "success") {
      toast.success(t("checkoutSuccess"));
      void queryClient.invalidateQueries({
        queryKey: ["billing", activeOrg?.id],
      });
    }
    setSearchParams(
      (prev) => {
        prev.delete(BILLING_RETURN_PARAM);
        return prev;
      },
      { replace: true },
    );
  }, [result, t, queryClient, activeOrg?.id, setSearchParams]);
}
