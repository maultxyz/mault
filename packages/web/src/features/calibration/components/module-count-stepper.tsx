import { DeleteDialog } from "@/components/delete-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { binRoutesQueryOptions } from "@/features/calibration/api/bin-routes";
import {
  DEFAULT_ORG_SETTINGS,
  orgSettingsQueryOptions,
  saveOrgSettings,
} from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  maxModulesForLayout,
} from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ModuleCountStepper() {
  const { t } = useTranslation("calibration");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const queryOpts = orgSettingsQueryOptions(activeOrg?.id);
  const { data } = useQuery(queryOpts);
  const current = data?.moduleCount ?? DEFAULT_MODULE_COUNT;
  const channelLayout = data?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT;
  const maxModules = maxModulesForLayout(channelLayout);
  const moduleCountOptions = Array.from(
    { length: maxModules },
    (_, i) => i + 1,
  );

  const mutation = useMutation({
    mutationFn: (moduleCount: number) => saveOrgSettings({ moduleCount }),
    onMutate: async (moduleCount) => {
      await queryClient.cancelQueries({ queryKey: queryOpts.queryKey });
      const previous = queryClient.getQueryData(queryOpts.queryKey);
      queryClient.setQueryData(
        queryOpts.queryKey,
        (old: typeof data): typeof data => ({
          ...(old ?? DEFAULT_ORG_SETTINGS),
          moduleCount,
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
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({
        queryKey: binRoutesQueryOptions.queryKey,
      });
      queryClient.invalidateQueries({ queryKey: ["bins"] });
    },
  });

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={String(current)}
        onValueChange={(value) => {
          const next = Number(value);
          if (next < current) {
            setPendingCount(next);
          } else {
            mutation.mutate(next);
          }
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            {t("moduleCountStepper.value", { count: current })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {moduleCountOptions.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {t("moduleCountStepper.value", { count: n })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs leading-tight text-muted-foreground">
        {t("moduleCountStepper.description")}
      </p>

      <DeleteDialog
        open={pendingCount != null}
        onOpenChange={(open) => {
          if (!open) setPendingCount(null);
        }}
        title={t("moduleCountStepper.reduceConfirm.title")}
        description={t("moduleCountStepper.reduceConfirm.description", {
          count: pendingCount ?? 0,
        })}
        confirmLabel={t("moduleCountStepper.reduceConfirm.confirm")}
        onConfirm={() => {
          if (pendingCount != null) mutation.mutate(pendingCount);
          setPendingCount(null);
        }}
      />
    </div>
  );
}
