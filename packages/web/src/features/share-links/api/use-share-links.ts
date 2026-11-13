import { useOrg } from "@/features/companies/api/use-organization";
import { SHARE_LINKS_QUERY_KEY } from "@/lib/constants/share-links";
import { toast } from "@/lib/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { revokeShareLink, shareLinksQueryOptions } from "./share-links";

export function useShareLinks(subjectGuid: string) {
  const { t } = useTranslation("share-links");
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery(
    shareLinksQueryOptions(activeOrg?.id, subjectGuid),
  );

  const revoke = useMutation({
    mutationFn: async (guid: string) => {
      const result = await revokeShareLink(guid).catch(() => null);
      if (!result?.success) throw new Error(t("revokeFailed"));
    },
    onSuccess: () => toast.success(t("revoked")),
    onError: (error) => toast.error(error.message),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: SHARE_LINKS_QUERY_KEY }),
  });

  return { links: data ?? [], isLoading, isError, revoke };
}
