import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";

interface IrSensorPanelProps {
  modules: number[];
  irStates: boolean[] | null;
  hopperHasCards: boolean | null;
  isConnected: boolean;
  isMonitoring: boolean;
  onRead: () => void;
  onToggleMonitor: () => void;
}

export function IrSensorPanel({
  modules,
  irStates,
  hopperHasCards,
  isConnected,
  isMonitoring,
  onRead,
  onToggleMonitor,
}: IrSensorPanelProps) {
  const { t } = useTranslation("calibration");
  return (
    <div className="flex flex-col gap-2" data-tour="ir-sensor-panel">
      <Tooltip>
        <TooltipTrigger
          render={<Label className="w-fit">{t("irSensorPanel.label")}</Label>}
        />
        <TooltipContent>{t("irSensorPanel.tooltip")}</TooltipContent>
      </Tooltip>
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant={isMonitoring ? "default" : "outline"}
                disabled={!isConnected}
                onClick={onToggleMonitor}
              >
                {isMonitoring
                  ? t("irSensorPanel.stop")
                  : t("irSensorPanel.monitor")}
              </Button>
            }
          />
          <TooltipContent>{t("irSensorPanel.monitorTooltip")}</TooltipContent>
        </Tooltip>
        {!isMonitoring && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  disabled={!isConnected}
                  onClick={onRead}
                >
                  {t("irSensorPanel.read")}
                </Button>
              }
            />
            <TooltipContent>{t("irSensorPanel.readTooltip")}</TooltipContent>
          </Tooltip>
        )}
        {modules.map((m) => {
          const detected = irStates?.[m - 1];
          return (
            <Tooltip key={m}>
              <TooltipTrigger
                render={
                  <div className="flex items-center gap-1.5">
                    <Badge variant={detected ? "success" : "ghost"}>
                      {t("irSensorPanel.moduleLabel", { module: m })}
                    </Badge>
                  </div>
                }
              />
              <TooltipContent>
                {detected
                  ? t("irSensorPanel.detectedTooltip", { module: m })
                  : t("irSensorPanel.notDetectedTooltip", { module: m })}
              </TooltipContent>
            </Tooltip>
          );
        })}
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="flex items-center gap-1.5">
                <Badge variant={hopperHasCards ? "success" : "ghost"}>
                  {hopperHasCards === false
                    ? t("irSensorPanel.hopperEmpty")
                    : t("irSensorPanel.hopper")}
                </Badge>
              </div>
            }
          />
          <TooltipContent>{t("irSensorPanel.hopperTooltip")}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
