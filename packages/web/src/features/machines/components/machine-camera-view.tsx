import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMachineCameraFrame } from "@/features/machines/api/use-machine-camera-frame";
import { useMachineCommand } from "@/features/machines/api/use-machine-command";
import { MACHINE_CONTROL_BUTTON_CLASS } from "@/lib/constants/machines";
import type { MachinePanelProps } from "@/lib/interfaces/machines";
import { cn } from "@/lib/utils";
import { machineShowsLiveCamera } from "@magic-vault/shared";
import {
  IconCamera,
  IconHandStop,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MachineCameraView({ machine }: MachinePanelProps) {
  const { t } = useTranslation("machines");
  const { imageUrl, isConnecting } = useMachineCameraFrame(machine);
  const command = useMachineCommand();
  const showsCamera = machineShowsLiveCamera(machine);
  const canToggle = machine.canPause || machine.canResume;

  return (
    <div className="relative isolate aspect-[4/3] w-full overflow-hidden rounded-card bg-black">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={t("camera.label", { name: machine.name })}
          className="absolute inset-0 size-full object-contain"
        />
      ) : isConnecting ? (
        <Skeleton className="absolute inset-0 rounded-none bg-white/10">
          <span className="sr-only">{t("camera.loading")}</span>
        </Skeleton>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-white/80">
          <IconCamera aria-hidden className="size-8" />
          <span>{machine.hasCamera && !showsCamera ? t("camera.idle") : t("camera.unavailable")}</span>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-1.5 bg-linear-to-t from-black/60 to-transparent p-3 pt-10">
        {machine.canEmergencyStop ? (
          <Button
            variant="destructive"
            disabled={command.isPending}
            title={t("controls.emergencyStopHint")}
            onClick={() => command.mutate({ machine, command: "emergencyStop" })}
          >
            <IconHandStop />
            {t("controls.emergencyStop")}
          </Button>
        ) : (
          <span />
        )}
        {canToggle && (
          <button
            type="button"
            disabled={command.isPending}
            aria-label={
              machine.canPause
                ? t("controls.pause")
                : machine.sessionScanCount > 0
                  ? t("controls.resume")
                  : t("controls.start")
            }
            onClick={() =>
              command.mutate({ machine, command: machine.canPause ? "pause" : "resume" })
            }
            className={cn(
              MACHINE_CONTROL_BUTTON_CLASS,
              machine.canPause ? "bg-destructive" : "bg-primary",
            )}
          >
            {machine.canPause ? <IconPlayerPauseFilled /> : <IconPlayerPlayFilled />}
          </button>
        )}
      </div>
    </div>
  );
}
