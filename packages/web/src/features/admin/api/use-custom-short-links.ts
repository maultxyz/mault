import { toast } from "@/lib/toast";
import type { CustomShortLinkResult } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { customShortLinksQueryOptions, deleteCustomShortLink } from "./short-links";

export function useCustomShortLinks() {
  const { t } = useTranslation("admin");
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery(customShortLinksQueryOptions);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: customShortLinksQueryOptions.queryKey });

  const failureMessage = (result: CustomShortLinkResult<unknown>, fallbackKey: string) =>
    result.reason ? t(`shortLinks.failures.${result.reason}`) : t(fallbackKey);

  const remove = useMutation({
    mutationFn: async (code: string) => {
      const result = await deleteCustomShortLink(code);
      if (!result.success) throw new Error(failureMessage(result, "shortLinks.deleteFailed"));
    },
    onSuccess: () => {
      toast.success(t("shortLinks.deleted"));
      return invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return { overview: data, isLoading, isError, refetch, invalidate, remove };
}
