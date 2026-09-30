import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_ORG_SETTINGS,
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { OcrBetaDialog } from "@/features/scanner/components/ocr-beta-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export function OcrToggle() {
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);
  const { data, isLoading } = useQuery(queryOpts);
  const enabled = data?.ocrEnabled ?? false;
  const [dialogOpen, setDialogOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: (ocrEnabled: boolean) => saveOrgSettings({ ocrEnabled }),
    onMutate: async (ocrEnabled) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData(queryOpts.queryKey);
      queryClient.setQueryData(
        queryOpts.queryKey,
        (old: typeof data): typeof data => ({
          ...(old ?? DEFAULT_ORG_SETTINGS),
          ocrEnabled,
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
    <>
      <Switch
        checked={enabled}
        disabled={isLoading}
        onCheckedChange={(checked) =>
          checked ? setDialogOpen(true) : mutation.mutate(false)
        }
      />
      <OcrBetaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={() => mutation.mutate(true)}
      />
    </>
  );
}
