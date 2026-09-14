import {
  DEFAULT_ORG_SETTINGS,
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { Switch } from "@/components/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function SessionWrappedToggle({ size }: { size?: "sm" | "default" }) {
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);
  const { data, isLoading } = useQuery(queryOpts);
  const enabled = data?.sessionWrappedEnabled ?? true;

  const mutation = useMutation({
    mutationFn: (sessionWrappedEnabled: boolean) =>
      saveOrgSettings({ sessionWrappedEnabled }),
    onMutate: async (sessionWrappedEnabled) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData(queryOpts.queryKey);
      queryClient.setQueryData(
        queryOpts.queryKey,
        (old: typeof data): typeof data => ({
          ...(old ?? DEFAULT_ORG_SETTINGS),
          sessionWrappedEnabled,
        }),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous)
        queryClient.setQueryData(queryOpts.queryKey, ctx.previous);
    },
    onSuccess: (result) => {
      if (result.success && result.data)
        queryClient.setQueryData(queryOpts.queryKey, result.data);
    },
  });

  return (
    <Switch
      size={size}
      checked={enabled}
      disabled={isLoading}
      onCheckedChange={(checked) => mutation.mutate(checked)}
    />
  );
}
