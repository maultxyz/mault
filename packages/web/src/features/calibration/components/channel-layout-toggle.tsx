import type { Device } from "@/features/calibration/api/devices";
import { devicesQueryOptions, saveDevice } from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useOrg } from "@/features/companies/api/use-organization";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CHANNEL_LAYOUT,
  DEFAULT_MODULE_COUNT,
  maxModulesForLayout,
  type ChannelLayout,
} from "@magic-vault/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export function ChannelLayoutToggle() {
  const { t } = useTranslation("calibration");
  const { activeOrg } = useOrg();
  const device = useDevice();

  const OPTIONS: {
    value: ChannelLayout;
    label: string;
    description: string;
  }[] = [
    {
      value: "standard",
      label: t("channelLayoutToggle.standard"),
      description: t("channelLayoutToggle.standardDescription"),
    },
    {
      value: "legacy",
      label: t("channelLayoutToggle.legacy"),
      description: t("channelLayoutToggle.legacyDescription"),
    },
  ];

  const queryClient = useQueryClient();
  const devicesOpts = devicesQueryOptions(activeOrg?.id);
  const current = device?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT;

  const mutation = useMutation({
    mutationFn: (channelLayout: ChannelLayout) =>
      saveDevice(device!.guid, {
        channelLayout,
        moduleCount: Math.min(
          device?.moduleCount ?? DEFAULT_MODULE_COUNT,
          maxModulesForLayout(channelLayout),
        ),
      }),
    onMutate: async (channelLayout) => {
      await queryClient.cancelQueries({ queryKey: devicesOpts.queryKey });
      const previous = queryClient.getQueryData(devicesOpts.queryKey);
      queryClient.setQueryData(
        devicesOpts.queryKey,
        (old: Device[] | undefined) =>
          old?.map((d, i) =>
            i === 0
              ? {
                  ...d,
                  channelLayout,
                  moduleCount: Math.min(
                    d.moduleCount,
                    maxModulesForLayout(channelLayout),
                  ),
                }
              : d,
          ) ?? old,
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
    },
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        {OPTIONS.map((opt) => {
          const isSelected = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => device && mutation.mutate(opt.value)}
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-lg border p-3 flex-1 transition-all text-left",
                isSelected
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
              )}
            >
              <span className="text-xs font-medium">{opt.label}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">
                {opt.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
