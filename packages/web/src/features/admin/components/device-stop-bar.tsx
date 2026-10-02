import { Button } from "@/components/ui/button";
import { useSerial } from "@/features/scanner/api/use-serial";
import { DEVICE_PLAYGROUND_STOP_TIMEOUT_MS } from "@/lib/constants/device-playground";
import type { DeviceStopBarProps } from "@/lib/interfaces/device-playground";
import { toast } from "@/lib/toast";
import { IconPlayerStop, IconRotate2 } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DeviceStopBar({ disabled }: DeviceStopBarProps) {
  const { t } = useTranslation("admin");
  const { sendRawCommand } = useSerial();

  const run = async (payload: unknown) => {
    const result = await sendRawCommand(
      JSON.stringify(payload),
      DEVICE_PLAYGROUND_STOP_TIMEOUT_MS,
    );
    if (result.status !== "ok") {
      toast.error(t(`devicePlayground.outcome.${result.status}`, { ms: 0 }));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
      <span className="text-xs text-foreground/70 mr-auto">
        {t("devicePlayground.stop.description")}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => run({ neutral: true })}
      >
        <IconRotate2 />
        {t("devicePlayground.stop.neutral")}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={disabled}
        onClick={() => run({ feederStop: true })}
      >
        <IconPlayerStop />
        {t("devicePlayground.stop.feeder")}
      </Button>
    </div>
  );
}
