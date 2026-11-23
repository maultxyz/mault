import {
  STATUS_MESSAGE_SETTINGS_API_PATH,
  STATUS_MESSAGE_SETTINGS_QUERY_KEY,
  type Result,
  type StatusMessageKind,
  type StatusMessageSettings,
} from "@magic-vault/shared";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo } from "react-native";
import { useToast } from "@/components/ui/toast-provider";
import { apiRequest, unwrap } from "@/lib/api/client";
import { useSession } from "@/lib/auth/session";
import { QUERY_STALE_MS } from "@/lib/constants/query";

const statusMessageSettingsQueryOptions = (userId: string | null) =>
  queryOptions({
    queryKey: [STATUS_MESSAGE_SETTINGS_QUERY_KEY, userId] as const,
    queryFn: () =>
      unwrap(apiRequest<Result<StatusMessageSettings>>(STATUS_MESSAGE_SETTINGS_API_PATH, { orgId: null })),
    enabled: !!userId,
    staleTime: QUERY_STALE_MS,
  });

export function useStatusMessageSettings() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const userId = useSession().user?.id ?? null;
  const queryClient = useQueryClient();
  const options = statusMessageSettingsQueryOptions(userId);
  const settings = useQuery(options);
  const update = useMutation({
    mutationFn: ({ kind, isEnabled }: { kind: StatusMessageKind; isEnabled: boolean }) =>
      unwrap(
        apiRequest<Result<StatusMessageSettings>>(STATUS_MESSAGE_SETTINGS_API_PATH, {
          method: "PUT",
          body: { [kind]: isEnabled },
          orgId: null,
        }),
      ),
    onMutate: async ({ kind, isEnabled }) => {
      await queryClient.cancelQueries({ queryKey: options.queryKey });
      const previous = queryClient.getQueryData(options.queryKey);
      if (previous) queryClient.setQueryData(options.queryKey, { ...previous, [kind]: isEnabled });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(options.queryKey, context.previous);
      const message = t("statusMessages.updateFailed");
      showToast({ message, tone: "destructive" });
      AccessibilityInfo.announceForAccessibility(message);
    },
    onSuccess: (data) => queryClient.setQueryData(options.queryKey, data),
  });
  return { settings, update };
}
