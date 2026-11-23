import { apiGet, apiPut } from "@/lib/api/client";
import { useAuthSession } from "@/lib/auth";
import { toast } from "@/lib/toast";
import {
  STATUS_MESSAGE_SETTINGS_API_PATH,
  STATUS_MESSAGE_SETTINGS_QUERY_KEY,
  type Result,
  type StatusMessageKind,
  type StatusMessageSettings,
} from "@magic-vault/shared";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const statusMessageSettingsQueryOptions = (userId: string | undefined) =>
  queryOptions({
    queryKey: [STATUS_MESSAGE_SETTINGS_QUERY_KEY, userId] as const,
    queryFn: async () => {
      const result = await apiGet<Result<StatusMessageSettings>>(STATUS_MESSAGE_SETTINGS_API_PATH);
      if (!result.success || !result.data) throw new Error(result.message);
      return result.data;
    },
    enabled: !!userId,
  });

export function useStatusMessageSettings() {
  const { t } = useTranslation("common");
  const { data: session } = useAuthSession();
  const queryClient = useQueryClient();
  const options = statusMessageSettingsQueryOptions(session?.user?.id);
  const settings = useQuery(options);
  const update = useMutation({
    mutationFn: async ({ kind, isEnabled }: { kind: StatusMessageKind; isEnabled: boolean }) => {
      const result = await apiPut<Result<StatusMessageSettings>>(STATUS_MESSAGE_SETTINGS_API_PATH, {
        [kind]: isEnabled,
      });
      if (!result.success || !result.data) throw new Error(result.message);
      return result.data;
    },
    onMutate: async ({ kind, isEnabled }) => {
      await queryClient.cancelQueries({ queryKey: options.queryKey });
      const previous = queryClient.getQueryData(options.queryKey);
      if (previous) queryClient.setQueryData(options.queryKey, { ...previous, [kind]: isEnabled });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(options.queryKey, context.previous);
      toast.error(t("statusMessages.updateFailed"));
    },
    onSuccess: (data) => queryClient.setQueryData(options.queryKey, data),
  });
  return { settings, update };
}
