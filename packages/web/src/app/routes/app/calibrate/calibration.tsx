import { AuditDrawer, type AuditEntry } from "@/components/audit-drawer";
import { SaveBar } from "@/components/save-bar";
import { Label } from "@/components/ui/label";
import { UnsavedChangesGuard } from "@/components/unsaved-changes-guard";
import { useCalibrationOutletContext } from "@/app/routes/app/calibrate/layout";
import {
  feederQueryOptions,
  getFeederHistory,
  revertFeederConfig,
  type FeederConfigAuditEntry,
} from "@/features/calibration/api/feeder-config";
import {
  getModuleHistory,
  modulesQueryOptions,
  revertModuleConfig,
  type ModuleConfigAuditEntry,
} from "@/features/calibration/api/module-configs";
import { useDevice } from "@/features/calibration/api/use-device";
import { FeederCalibrationPanel } from "@/features/calibration/components/feeder-calibration-panel";
import { ModuleCalibrationGrid } from "@/features/calibration/components/module-calibration-grid";
import { IconClockHour3 } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

function ModuleHistoryBody({ entry }: { entry: ModuleConfigAuditEntry }) {
  const { t } = useTranslation("calibration");
  const { calibration: c } = entry;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex gap-2">
        <span className="w-16 shrink-0 text-muted-foreground">
          {t("calibratePage.moduleHistory.bottom")}
        </span>
        <span>
          {c.bottomClosed} / {c.bottomOpen}
        </span>
      </div>
      <div className="flex gap-2">
        <span className="w-16 shrink-0 text-muted-foreground">
          {t("calibratePage.moduleHistory.paddle")}
        </span>
        <span>
          {c.paddleClosed} / {c.paddleOpen}
        </span>
      </div>
      <div className="flex gap-2">
        <span className="w-16 shrink-0 text-muted-foreground">
          {t("servos.pusher.label")}
        </span>
        <span>
          {c.pusherLeft} / {c.pusherNeutral} / {c.pusherRight}
        </span>
      </div>
      <div className="flex gap-2">
        <span className="w-16 shrink-0 text-muted-foreground">
          {t("calibratePage.moduleHistory.pusherHoldDuration")}
        </span>
        <span>
          {t("calibratePage.msValue", { value: c.pusherHoldDuration })}
        </span>
      </div>
      <div className="flex gap-2">
        <span className="w-16 shrink-0 text-muted-foreground">
          {t("calibratePage.moduleHistory.paddleCloseDelay")}
        </span>
        <span>
          {t("calibratePage.msValue", { value: c.paddleCloseDelay })}
        </span>
      </div>
    </div>
  );
}

function FeederHistoryBody({ entry }: { entry: FeederConfigAuditEntry }) {
  const { t } = useTranslation("calibration");
  const { calibration: c } = entry;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
      <span className="text-muted-foreground">
        {t("calibratePage.feederHistory.speed")}
      </span>
      <span>{c.speed}</span>
      <span className="text-muted-foreground">
        {t("calibratePage.feederHistory.duration")}
      </span>
      <span>{t("calibratePage.msValue", { value: c.duration })}</span>
      <span className="text-muted-foreground">
        {t("calibratePage.feederHistory.pulse")}
      </span>
      <span>
        {c.pulseDuration <= 0
          ? t("continuous")
          : t("calibratePage.msValue", {
              value: c.pulseDuration,
            })}
      </span>
      <span className="text-muted-foreground">
        {t("calibratePage.feederHistory.pause")}
      </span>
      <span>{t("calibratePage.msValue", { value: c.pauseDuration })}</span>
      <span className="text-muted-foreground">
        {t("calibratePage.feederHistory.settle")}
      </span>
      <span>{t("calibratePage.msValue", { value: c.settleDuration })}</span>
    </div>
  );
}

export default function CalibrateCalibrationPage() {
  const { t } = useTranslation("calibration");
  const queryClient = useQueryClient();
  const device = useDevice();
  const [moduleHistoryOpen, setModuleHistoryOpen] = useState(false);
  const [feederHistoryOpen, setFeederHistoryOpen] = useState(false);

  const {
    configs,
    modules,
    isLoading,
    active,
    sliderValues,
    pendingCalibration,
    moduleDelayValues,
    isConnected,
    handleControl,
    handleSliderChange,
    testingServos,
    handleServoTest,
    handleModuleDelayChange,
    pushTestingModule,
    handlePushTest,
    feederSpeedValue,
    feederDurationValue,
    feederPulseDurationValue,
    feederPauseDurationValue,
    feederSettleDurationValue,
    handleFeederSpeedChange,
    handleFeederDurationChange,
    handleFeederPulseDurationChange,
    handleFeederPauseDurationChange,
    handleFeederSettleDurationChange,
    handleFeederSelectContinuous,
    isFeederModuleDirty,
    isSavingFeederModule,
    handleSaveFeederModuleCalibration,
    handleDiscardFeederModuleCalibration,
  } = useCalibrationOutletContext();

  const { data: moduleHistoryResult, isLoading: moduleHistoryLoading } =
    useQuery({
      queryKey: ["modules", "history", device?.guid],
      queryFn: () => getModuleHistory(device!.guid),
      enabled: moduleHistoryOpen && !!device,
      staleTime: 0,
    });

  const { data: feederHistoryResult, isLoading: feederHistoryLoading } =
    useQuery({
      queryKey: ["feeder", "history", device?.guid],
      queryFn: () => getFeederHistory(device!.guid),
      enabled: feederHistoryOpen && !!device,
      staleTime: 0,
    });

  const revertModuleMutation = useMutation({
    mutationFn: (guid: string) => revertModuleConfig(device!.guid, guid),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(
          modulesQueryOptions(device?.guid).queryKey,
          result.data,
        );
        queryClient.invalidateQueries({ queryKey: ["modules", "history"] });
        setModuleHistoryOpen(false);
        toast.success(t("calibratePage.toasts.moduleReverted"));
      }
    },
    onError: () => toast.error(t("calibratePage.toasts.revertFailed")),
  });

  const revertFeederMutation = useMutation({
    mutationFn: (guid: string) => revertFeederConfig(device!.guid, guid),
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(
          feederQueryOptions(device?.guid).queryKey,
          result.data,
        );
        queryClient.invalidateQueries({ queryKey: ["feeder", "history"] });
        setFeederHistoryOpen(false);
        toast.success(t("calibratePage.toasts.feederReverted"));
      }
    },
    onError: () => toast.error(t("calibratePage.toasts.revertFailed")),
  });

  const moduleHistoryEntries = useMemo((): AuditEntry[] => {
    return (moduleHistoryResult?.data ?? []).map(
      (entry: ModuleConfigAuditEntry) => ({
        guid: entry.guid,
        createdAt: entry.createdAt,
        label: t("moduleLabel", {
          module: entry.moduleNumber,
        }),
        body: <ModuleHistoryBody entry={entry} />,
      }),
    );
  }, [moduleHistoryResult, t]);

  const feederHistoryEntries = useMemo((): AuditEntry[] => {
    return (feederHistoryResult?.data ?? []).map(
      (entry: FeederConfigAuditEntry) => ({
        guid: entry.guid,
        createdAt: entry.createdAt,
        body: <FeederHistoryBody entry={entry} />,
      }),
    );
  }, [feederHistoryResult]);

  return (
    <>
      <div className="flex items-center justify-between">
        <Label>{t("sections.moduleCalibration")}</Label>
        <button
          type="button"
          onClick={() => setFeederHistoryOpen(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconClockHour3 size={12} />
          {t("calibratePage.history")}
        </button>
      </div>
      <FeederCalibrationPanel
        speedValue={feederSpeedValue}
        durationValue={feederDurationValue}
        pulseDurationValue={feederPulseDurationValue}
        pauseDurationValue={feederPauseDurationValue}
        settleDurationValue={feederSettleDurationValue}
        isConnected={isConnected}
        onSpeedChange={handleFeederSpeedChange}
        onDurationChange={handleFeederDurationChange}
        onPulseDurationChange={handleFeederPulseDurationChange}
        onPauseDurationChange={handleFeederPauseDurationChange}
        onSettleDurationChange={handleFeederSettleDurationChange}
        onSelectContinuous={handleFeederSelectContinuous}
      />

      <div className="flex items-center justify-between">
        <Label>{t("sections.moduleCalibration")}</Label>
        <button
          type="button"
          onClick={() => setModuleHistoryOpen(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <IconClockHour3 size={12} />
          {t("calibratePage.history")}
        </button>
      </div>
      <ModuleCalibrationGrid
        modules={modules}
        configs={configs}
        active={active}
        sliderValues={sliderValues}
        moduleDelayValues={moduleDelayValues}
        pendingCalibration={pendingCalibration}
        isLoading={isLoading}
        isConnected={isConnected}
        onControl={handleControl}
        onSliderChange={handleSliderChange}
        testingServos={testingServos}
        onTest={handleServoTest}
        onModuleDelayChange={handleModuleDelayChange}
        pushTestingModule={pushTestingModule}
        onPushTest={handlePushTest}
      />

      <AuditDrawer
        open={feederHistoryOpen}
        onOpenChange={setFeederHistoryOpen}
        title={t("calibratePage.feederHistoryTitle")}
        entries={feederHistoryEntries}
        isLoading={feederHistoryLoading}
        onRevert={(guid) => revertFeederMutation.mutate(guid)}
        isReverting={revertFeederMutation.isPending}
      />

      <AuditDrawer
        open={moduleHistoryOpen}
        onOpenChange={setModuleHistoryOpen}
        title={t("calibratePage.moduleHistoryTitle")}
        entries={moduleHistoryEntries}
        isLoading={moduleHistoryLoading}
        onRevert={(guid) => revertModuleMutation.mutate(guid)}
        isReverting={revertModuleMutation.isPending}
      />

      <SaveBar
        show={isFeederModuleDirty}
        onSave={handleSaveFeederModuleCalibration}
        isSaving={isSavingFeederModule}
        onDiscard={handleDiscardFeederModuleCalibration}
      />
      <UnsavedChangesGuard
        isDirty={isFeederModuleDirty}
        onDiscard={handleDiscardFeederModuleCalibration}
      />
    </>
  );
}
