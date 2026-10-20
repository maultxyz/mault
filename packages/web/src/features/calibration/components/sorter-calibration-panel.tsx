import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FeederCalibrationPanel } from "@/features/calibration/components/feeder-calibration-panel";
import {
  ModuleDelayControl,
  PushTestControl,
  ServoControl,
} from "@/features/calibration/components/module-calibration-grid";
import { SERVO_PULSE_CENTER, SERVOS } from "@/lib/constants/calibration";
import {
  SORTER_DRAWER_DELAY_FIELDS,
  SORTER_MODEL_PART_COLORS,
} from "@/lib/constants/sorter-model";
import type { SliderKey } from "@/lib/interfaces/calibration";
import type { SorterCalibrationPanelProps } from "@/lib/interfaces/sorter-model";
import { DEFAULT_CALIBRATION } from "@magic-vault/shared";
import { IconX } from "@tabler/icons-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function SorterCalibrationPanel({
  hotspot,
  state,
  onClose,
}: SorterCalibrationPanelProps) {
  const { t } = useTranslation("calibration");
  const [showRaw, setShowRaw] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
  }, [hotspot.key]);

  const canEditTimings = state.isConnected || state.isOfflineCalibration;
  const part = hotspot.kind === "servo" ? hotspot.servo : "feeder";
  const title =
    hotspot.kind === "servo"
      ? t("sorterModel.hotspotLabel", {
          module: hotspot.module,
          part: t(`sorterModel.parts.${hotspot.servo}`),
        })
      : t("sorterModel.parts.feeder");

  const servoBody = () => {
    if (hotspot.kind !== "servo") return null;
    const { module, servo: servoName } = hotspot;
    const servo = SERVOS.find((entry) => entry.name === servoName);
    if (!servo) return null;
    const key: SliderKey = `${module}:${servoName}`;
    const saved = state.configs.find(
      (config) => config.moduleNumber === module,
    )?.calibration;
    const calibration = saved
      ? { ...saved, ...state.pendingCalibration[module] }
      : saved;

    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="sorter-drawer-raw">
            {t("moduleCalibrationGrid.rawPulseToggleLabel")}
          </Label>
          <Switch
            id="sorter-drawer-raw"
            checked={showRaw}
            onCheckedChange={setShowRaw}
          />
        </div>
        <ServoControl
          module={module}
          servo={servo}
          sliderValue={state.sliderValues[key] ?? SERVO_PULSE_CENTER}
          activePosition={state.active[key]}
          calibration={calibration}
          isLoading={state.isLoading}
          canCalibrate={state.canCalibrate}
          canTest={state.canCalibrate && state.isConnected}
          isTesting={state.testingServos[key] ?? false}
          showRaw={showRaw}
          onControl={state.handleControl}
          onSliderChange={state.handleSliderChange}
          onTest={state.handleServoTest}
        />
        {SORTER_DRAWER_DELAY_FIELDS[servoName].map((field) => (
          <ModuleDelayControl
            key={field}
            module={module}
            field={field}
            value={
              state.moduleDelayValues[module]?.[field] ??
              DEFAULT_CALIBRATION[field]
            }
            canEdit={canEditTimings}
            onChange={state.handleModuleDelayChange}
          />
        ))}
        {servoName === "pusher" && (
          <PushTestControl
            module={module}
            isReady={state.isReady}
            isTesting={state.pushTestingModule !== null}
            onTest={state.handlePushTest}
          />
        )}
      </>
    );
  };

  return (
    <aside
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className="absolute inset-0 z-10 flex flex-col bg-background animate-in fade-in slide-in-from-right-4 duration-200 motion-reduce:animate-none md:static md:w-80 md:shrink-0 md:border-l"
    >
      <div className="flex items-start justify-between gap-2 border-b p-4 pb-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full ring-1 ring-foreground/20"
              style={{ backgroundColor: SORTER_MODEL_PART_COLORS[part] }}
            />
            <h3 id={titleId} className="font-heading text-sm font-semibold">
              {title}
            </h3>
          </div>
          <p className="text-xs text-foreground/70">
            {t(`sorterModel.drawerDescriptions.${part}`)}
          </p>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("sorterModel.closeDrawer")}
          className="rounded-sm text-foreground/70 transition-colors hover:text-foreground"
        >
          <IconX size={14} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-4">
        {hotspot.kind === "feeder" ? (
          <FeederCalibrationPanel
            speedValue={state.feederSpeedValue}
            durationValue={state.feederDurationValue}
            pulseDurationValue={state.feederPulseDurationValue}
            pauseDurationValue={state.feederPauseDurationValue}
            settleDurationValue={state.feederSettleDurationValue}
            reverseSpeedValue={state.feederReverseSpeedValue}
            reverseDurationValue={state.feederReverseDurationValue}
            stopPulse={state.feederStopPulse}
            canEditTimings={canEditTimings}
            canCalibrate={state.canCalibrate}
            onSpeedChange={state.handleFeederSpeedChange}
            onStopPulseChange={state.handleFeederStopPulseChange}
            onResetStopPulse={state.handleResetFeederStopPulse}
            onDurationChange={state.handleFeederDurationChange}
            onPulseDurationChange={state.handleFeederPulseDurationChange}
            onPauseDurationChange={state.handleFeederPauseDurationChange}
            onSettleDurationChange={state.handleFeederSettleDurationChange}
            onReverseSpeedChange={state.handleFeederReverseSpeedChange}
            onReverseDurationChange={state.handleFeederReverseDurationChange}
            onSelectContinuous={state.handleFeederSelectContinuous}
            fullWidth
          />
        ) : (
          servoBody()
        )}
      </div>
    </aside>
  );
}
