import { DeleteDialog } from "@/components/delete-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Device } from "@/features/calibration/api/devices";
import { devicesQueryOptions, saveDevice } from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  maxModulesForLayout,
} from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ModuleCountStepper() {
  const { t } = useTranslation("calibration");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const { activeOrg } = useOrg();
  const device = useDevice();
  const queryClient = useQueryClient();
  const devicesOpts = devicesQueryOptions(activeOrg?.id);
  const current = device?.moduleCount ?? DEFAULT_MODULE_COUNT;
  const channelLayout = device?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT;
  const maxModules = maxModulesForLayout(channelLayout);
  const moduleCountOptions = Array.from(
    { length: maxModules },
    (_, i) => i + 1,
  );

  const mutation = useMutation({
    mutationFn: (moduleCount: number) =>
      saveDevice(device!.guid, { moduleCount }),
    onMutate: async (moduleCount) => {
      await queryClient.cancelQueries({ queryKey: devicesOpts.queryKey });
      const previous = queryClient.getQueryData(devicesOpts.queryKey);
      queryClient.setQueryData(
        devicesOpts.queryKey,
        (old: Device[] | undefined) =>
          old?.map((d, i) => (i === 0 ? { ...d, moduleCount } : d)) ?? old,
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(devicesOpts.queryKey, ctx.previous);
    },
    onSuccess: (result) => {
      if (result.success && result.data) {
        const saved = result.data;
        queryClient.setQueryData(
          devicesOpts.queryKey,
          (old: Device[] | undefined) =>
            old ? [saved, ...old.slice(1)] : [saved],
        );
      }
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      queryClient.invalidateQueries({ queryKey: ["bin-routes"] });
      queryClient.invalidateQueries({ queryKey: ["bins"] });
    },
  });

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={String(current)}
        onValueChange={(value) => {
          if (!device) return;
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
