import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  devicesQueryOptions,
  saveDevice,
  type Device,
} from "@/features/calibration/api/devices";
import { useDevice } from "@/features/calibration/api/use-device";
import { useFeederConfig } from "@/features/calibration/api/use-feeder-config";
import { useModuleConfigs } from "@/features/calibration/api/use-module-configs";
import { useModuleCountConfig } from "@/features/calibration/api/use-module-count-config";
import { useSetupWizard } from "@/features/calibration/api/use-setup-wizard";
import { useOrg } from "@/features/companies/api/use-organization";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  emptySetupIrSeen,
  pulseToPercent,
  pulseToSignedPercent,
  SERVO_PULSE_MAX,
  SERVO_PULSE_MIN,
  SETUP_INTRO_PARTS,
  SETUP_SERVO_POSITIONS,
  signedPercentToPulse,
} from "@/lib/constants/calibration";
import {
  CALIBRATION_PREVIEW_DEBOUNCE_MS,
  SETUP_IR_POLL_MS,
  SETUP_IR_RESPONSE_TIMEOUT_MS,
} from "@/lib/constants/timing";
import type {
  ReadIrResponse,
  SetupControlPanelProps,
  SetupIrReading,
  SetupIrSeen,
  SetupIrSensor,
  SetupIrSensorRowProps,
  SetupServoStepProps,
  SetupStepHeadingProps,
  SetupTestState,
  SetupWizardStep,
} from "@/lib/interfaces/calibration";
import { cn } from "@/lib/utils";
import {
  CHANNEL_OFFSET,
  DEFAULT_CALIBRATION,
  DEFAULT_CHANNEL_LAYOUT,
  type ServoCalibration,
} from "@magic-vault/shared";
import {
  IconAlertTriangle,
  IconCheck,
  IconCircleCheck,
  IconLoader2,
  IconMinus,
  IconPlayerPlay,
  IconPlus,
} from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function buildSteps(moduleCount: number): SetupWizardStep[] {
  const steps: SetupWizardStep[] = [{ kind: "intro" }, { kind: "moduleCount" }];
  for (let module = 1; module <= moduleCount; module++) {
    for (const position of SETUP_SERVO_POSITIONS) {
      steps.push({ kind: "servo", module, position });
    }
  }
  steps.push({ kind: "irSensors" }, { kind: "feeder" }, { kind: "test" });
  return steps;
}

export function DeviceSetupWizard() {
  const { t } = useTranslation("calibration");
  const { isOpen, close } = useSetupWizard();
  const device = useDevice();
  const { activeOrg } = useOrg();
  const queryClient = useQueryClient();
  const { sendCommand, receiveResponse, sendTest, runTest, isReady } =
    useSerial();
  const { configs, saveConfig, moveServo } = useModuleConfigs();
  const {
    feederConfig,
    saveConfig: saveFeederConfig,
    previewSpeed,
  } = useFeederConfig();
  const moduleCount = useModuleCountConfig();

  const [stepIndex, setStepIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<number, ServoCalibration>>({});
  const [feederSpeed, setFeederSpeed] = useState(feederConfig.speed);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [testState, setTestState] = useState<SetupTestState>("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [irReading, setIrReading] = useState<SetupIrReading | null>(null);
  const [irSeen, setIrSeen] = useState<SetupIrSeen>(emptySetupIrSeen);
  const servoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feederDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const steps = useMemo(
    () => buildSteps(moduleCount.displayCount),
    [moduleCount.displayCount],
  );
  const step = steps[Math.min(stepIndex, steps.length - 1)];

  const calibrationFor = useCallback(
    (module: number): ServoCalibration =>
      drafts[module] ??
      configs.find((c) => c.moduleNumber === module)?.calibration ??
      DEFAULT_CALIBRATION,
    [drafts, configs],
  );

  const latest = useRef({
    feederSpeed: feederConfig.speed,
    channelLayout: device?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT,
    step,
    calibrationFor,
    moveServo,
    sendCommand,
    receiveResponse,
  });
  latest.current = {
    feederSpeed: feederConfig.speed,
    channelLayout: device?.channelLayout ?? DEFAULT_CHANNEL_LAYOUT,
    step,
    calibrationFor,
    moveServo,
    sendCommand,
    receiveResponse,
  };

  useEffect(() => {
    if (!isOpen) return;
    const current = latest.current;
    setStepIndex(0);
    setDrafts({});
    setFeederSpeed(current.feederSpeed);
    setTestState("idle");
    setTestError(null);
    setIrReading(null);
    setIrSeen(emptySetupIrSeen());
    const response = current.receiveResponse();
    void current
      .sendCommand(
        JSON.stringify({
          setChannelOffset: CHANNEL_OFFSET[current.channelLayout],
        }),
      )
      .then(() => response);
  }, [isOpen]);

  useEffect(() => {
    const current = latest.current;
    if (!isOpen || current.step.kind !== "servo") return;
    const { module, position } = current.step;
    current.moveServo(
      module,
      position.servo,
      current.calibrationFor(module)[position.calKey],
    );
  }, [isOpen, stepIndex]);

  useEffect(() => {
    if (!isOpen || step.kind !== "irSensors") return;
    let cancelled = false;
    let busy = false;
    const poll = async () => {
      if (busy) return;
      busy = true;
      try {
        const response = receiveResponse(SETUP_IR_RESPONSE_TIMEOUT_MS);
        if (!(await sendCommand(JSON.stringify({ readIR: true })))) return;
        const line = await response;
        if (cancelled || !line) return;
        const parsed = JSON.parse(line) as ReadIrResponse;
        if (!Array.isArray(parsed.ir)) return;
        const reading: SetupIrReading = {
          modules: (parsed.ir as unknown[]).map(Boolean),
          hopper: parsed.hopper === true,
        };
        setIrReading(reading);
        setIrSeen((prev) => {
          const modules = new Set(prev.modules);
          reading.modules.forEach(
            (present, i) => present && modules.add(i + 1),
          );
          return { modules, hopper: prev.hopper || reading.hopper };
        });
      } catch {
      } finally {
        busy = false;
      }
    };
    void poll();
    const id = setInterval(() => void poll(), SETUP_IR_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [isOpen, step.kind, sendCommand, receiveResponse]);

  const handleServoChange = (value: number) => {
    if (step.kind !== "servo") return;
    const { module, position } = step;
    setDrafts((prev) => ({
      ...prev,
      [module]: { ...calibrationFor(module), [position.calKey]: value },
    }));
    if (servoDebounceRef.current) clearTimeout(servoDebounceRef.current);
    servoDebounceRef.current = setTimeout(
      () => moveServo(module, position.servo, value),
      CALIBRATION_PREVIEW_DEBOUNCE_MS,
    );
  };

  const handleFeederChange = (signedPercent: number) => {
    const pulse = signedPercentToPulse(signedPercent);
    setFeederSpeed(pulse);
    if (feederDebounceRef.current) clearTimeout(feederDebounceRef.current);
    feederDebounceRef.current = setTimeout(
      () => previewSpeed(pulse),
      CALIBRATION_PREVIEW_DEBOUNCE_MS,
    );
  };

  const leaveStep = async () => {
    if (step.kind === "moduleCount" && moduleCount.isDirty) {
      await moduleCount.commit();
    }
    if (step.kind === "servo") {
      const next = steps[stepIndex + 1];
      const { module, position } = step;
      const cal = calibrationFor(module);
      const servoDone =
        next?.kind !== "servo" ||
        next.module !== module ||
        next.position.servo !== position.servo;
      if (servoDone) moveServo(module, position.servo, cal[position.restKey]);
      if (next?.kind !== "servo" || next.module !== module) {
        await saveConfig(module, cal);
      }
    }
    if (step.kind === "feeder") {
      void sendCommand(JSON.stringify({ feederStop: true }));
      await saveFeederConfig({ ...feederConfig, speed: feederSpeed });
    }
  };

  const handleNext = async () => {
    setIsAdvancing(true);
    try {
      await leaveStep();
      setStepIndex((i) => Math.min(i + 1, steps.length - 1));
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const handleRunTest = async () => {
    setTestState("running");
    setTestError(null);
    const { ok, error } = await sendTest();
    setTestState(ok ? "passed" : "failed");
    setTestError(ok ? null : error);
  };

  const markSetupComplete = async () => {
    if (!device?.guid) return;
    const result = await saveDevice(device.guid, {
      setupCompleted: true,
    }).catch(() => null);
    if (!result?.success || !result.data) return;
    const saved = result.data;
    queryClient.setQueryData(
      devicesQueryOptions(activeOrg?.id).queryKey,
      (old: Device[] | undefined) =>
        old?.map((d) => (d.guid === saved.guid ? saved : d)),
    );
  };

  const handleFinish = async () => {
    await markSetupComplete();
    close();
  };

  const handleSkip = async () => {
    void sendCommand(JSON.stringify({ feederStop: true }));
    await markSetupComplete();
    close();
    if (!isReady) void runTest();
  };

  const isLast = stepIndex === steps.length - 1;
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const sectionLabel =
    step.kind === "servo"
      ? t("setupWizard.sections.module", {
          module: step.module,
          total: moduleCount.displayCount,
          servo: t(`servos.${step.position.servo}.label`),
        })
      : t(`setupWizard.sections.${step.kind}`);

  return (
    <DynamicDialog
      open={isOpen}
      onOpenChange={() => {}}
      dismissible={false}
      className="sm:max-w-xl"
      title={t("setupWizard.title")}
      description={sectionLabel}
      footerClassName="flex-row items-center"
      footer={
        <>
          <Button variant="ghost" className="mr-auto" onClick={handleSkip}>
            {t("setupWizard.skip")}
          </Button>
          <Button
            variant="outline"
            disabled={stepIndex === 0 || isAdvancing || testState === "running"}
            onClick={handleBack}
          >
            {t("setupWizard.back")}
          </Button>
          {isLast ? (
            <Button disabled={testState !== "passed"} onClick={handleFinish}>
              <IconCheck />
              {t("setupWizard.finish")}
            </Button>
          ) : (
            <Button disabled={isAdvancing} onClick={handleNext}>
              {isAdvancing && <IconLoader2 className="animate-spin" />}
              {t("setupWizard.next")}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="self-end text-xs text-foreground/70">
          {t("setupWizard.stepCounter", {
            current: stepIndex + 1,
            total: steps.length,
          })}
        </p>
      </div>

      <div className="flex min-h-80 flex-col gap-4 overflow-y-auto py-1 text-sm">
        {step.kind === "intro" && (
          <>
            <StepHeading
              title={t("setupWizard.intro.heading")}
              body={t("setupWizard.intro.body")}
            />
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
                {t("setupWizard.partsHeading")}
              </p>
              <ul className="flex flex-col gap-2.5">
                {SETUP_INTRO_PARTS.map(({ key, icon: PartIcon }) => (
                  <li key={key} className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <PartIcon size={16} />
                    </span>
                    <span className="flex flex-col">
                      <span className="font-medium">
                        {t(`setupWizard.intro.parts.${key}.name`)}
                      </span>
                      <span className="text-foreground/70">
                        {t(`setupWizard.intro.parts.${key}.desc`)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-foreground/70">
              {t("setupWizard.intro.skipNote")}
            </p>
          </>
        )}

        {step.kind === "moduleCount" && (
          <>
            <StepHeading
              title={t("setupWizard.moduleCount.heading")}
              body={t("setupWizard.moduleCount.body")}
            />
            <ControlPanel>
              <Select
                value={String(moduleCount.displayCount)}
                onValueChange={(value) => moduleCount.stage(Number(value))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue>
                    {t("moduleCountStepper.value", {
                      count: moduleCount.displayCount,
                    })}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {moduleCount.options.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {t("moduleCountStepper.value", { count: n })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ControlPanel>
          </>
        )}

        {step.kind === "servo" && (
          <ServoStep
            servo={step.position.servo}
            currentKey={step.position.calKey}
            value={calibrationFor(step.module)[step.position.calKey]}
            onChange={handleServoChange}
          />
        )}

        {step.kind === "irSensors" && (
          <>
            <StepHeading
              title={t("setupWizard.irSensors.heading")}
              body={t("setupWizard.irSensors.body")}
            />
            <div className="flex flex-col divide-y rounded-lg border">
              {[
                ...Array.from(
                  { length: moduleCount.displayCount },
                  (_, i): SetupIrSensor => ({
                    key: `module-${i + 1}`,
                    label: t("setupWizard.irSensors.moduleSensor", {
                      module: i + 1,
                    }),
                    hint: t("setupWizard.irSensors.moduleHint"),
                    present: irReading?.modules[i] ?? false,
                    seen: irSeen.modules.has(i + 1),
                  }),
                ),
                {
                  key: "hopper",
                  label: t("setupWizard.irSensors.hopperSensor"),
                  hint: t("setupWizard.irSensors.hopperHint"),
                  present: irReading?.hopper ?? false,
                  seen: irSeen.hopper,
                },
              ].map((sensor) => (
                <IrSensorRow {...sensor} />
              ))}
            </div>
            <p className="text-xs text-foreground/70">
              {irReading
                ? t("setupWizard.irSensors.footnote")
                : t("setupWizard.irSensors.waiting")}
            </p>
          </>
        )}

        {step.kind === "feeder" && (
          <>
            <StepHeading
              title={t("setupWizard.feeder.heading")}
              body={t("setupWizard.feeder.body")}
            />
            <ControlPanel
              label={t("setupWizard.feeder.speedLabel")}
              value={t("setupWizard.percent", {
                value: pulseToSignedPercent(feederSpeed),
              })}
              hint={t("setupWizard.feeder.hint")}
            >
              <Slider
                min={-100}
                max={100}
                step={1}
                value={pulseToSignedPercent(feederSpeed)}
                onValueChange={handleFeederChange}
              />
            </ControlPanel>
          </>
        )}

        {step.kind === "test" && (
          <>
            <StepHeading
              title={t("setupWizard.test.heading")}
              body={t("setupWizard.test.body")}
            />
            <Button
              className="self-start"
              disabled={testState === "running"}
              onClick={handleRunTest}
            >
              {testState === "running" ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconPlayerPlay />
              )}
              {testState === "running"
                ? t("setupWizard.test.running")
                : t("setupWizard.test.run")}
            </Button>
            {testState === "passed" && (
              <Callout
                variant="success"
                icon={IconCircleCheck}
                title={t("setupWizard.test.passed")}
              />
            )}
            {testState === "failed" && (
              <Callout
                variant="error"
                icon={IconAlertTriangle}
                title={t("setupWizard.test.failed")}
              >
                {testError && <p>{testError}</p>}
                <p>{t("setupWizard.test.failedHint")}</p>
              </Callout>
            )}
          </>
        )}
      </div>
    </DynamicDialog>
  );
}

function StepHeading({ title, body }: SetupStepHeadingProps) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="font-heading text-base font-semibold">{title}</h3>
      {body && <p className="text-foreground/70">{body}</p>}
    </div>
  );
}

function IrSensorRow({ label, hint, present, seen }: SetupIrSensorRowProps) {
  const { t } = useTranslation("calibration");
  return (
    <div className="flex items-center gap-3 p-3">
      <span
        className={cn(
          "size-2.5 shrink-0 rounded-full transition-colors",
          present ? "bg-primary" : "bg-muted-foreground/40",
        )}
      />
      <span className="flex flex-1 flex-col">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-foreground/70">{hint}</span>
      </span>
      <span className="text-xs text-foreground/70">
        {present
          ? t("setupWizard.irSensors.present")
          : t("setupWizard.irSensors.clear")}
      </span>
      {seen ? (
        <IconCircleCheck
          size={18}
          className="shrink-0 text-primary"
          aria-label={t("setupWizard.irSensors.verified")}
        />
      ) : (
        <span className="size-[18px] shrink-0 rounded-full border border-dashed border-foreground/30" />
      )}
    </div>
  );
}

function ControlPanel({
  label,
  value,
  hint,
  children,
}: SetupControlPanelProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      {(label || value) && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-foreground/70">
            {label}
          </span>
          <span className="font-heading text-2xl font-semibold tabular-nums">
            {value}
          </span>
        </div>
      )}
      {children}
      {hint && <p className="text-xs text-foreground/70">{hint}</p>}
    </div>
  );
}

function ServoStep({
  servo,
  currentKey,
  value,
  onChange,
}: SetupServoStepProps) {
  const { t } = useTranslation("calibration");
  const positions = SETUP_SERVO_POSITIONS.filter((p) => p.servo === servo);
  const currentIndex = positions.findIndex((p) => p.calKey === currentKey);
  const nudge = (delta: number) =>
    onChange(
      Math.min(SERVO_PULSE_MAX, Math.max(SERVO_PULSE_MIN, value + delta)),
    );

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {positions.map((p, i) => (
          <span
            key={p.calKey}
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
              i === currentIndex && "border-primary bg-primary/10 text-primary",
              i < currentIndex && "text-foreground/70",
              i > currentIndex && "text-foreground/70",
            )}
          >
            {i < currentIndex && <IconCheck size={12} />}
            {t(`moduleCalibrationGrid.positions.${p.position}`)}
          </span>
        ))}
      </div>

      <StepHeading title={t(`setupWizard.positions.${currentKey}.title`)} />

      <div className="rounded-lg bg-muted p-3">
        <p className="text-xs font-medium text-foreground/70">
          {t("setupWizard.aboutPart", { servo: t(`servos.${servo}.label`) })}
        </p>
        <p className="mt-0.5 text-xs text-foreground/70">
          {t(`setupWizard.servos.${servo}`)}
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/70">
          {t("setupWizard.howToSet")}
        </p>
        <p>{t(`setupWizard.positions.${currentKey}.body`)}</p>
      </div>

      <ControlPanel
        label={t("setupWizard.positionLabel")}
        value={t("setupWizard.percent", { value: pulseToPercent(value) })}
      >
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("setupWizard.nudgeDown")}
            onClick={() => nudge(-1)}
          >
            <IconMinus />
          </Button>
          <Slider
            min={SERVO_PULSE_MIN}
            max={SERVO_PULSE_MAX}
            step={1}
            value={value}
            onValueChange={onChange}
          />
          <Button
            variant="outline"
            size="icon-sm"
            aria-label={t("setupWizard.nudgeUp")}
            onClick={() => nudge(1)}
          >
            <IconPlus />
          </Button>
        </div>
      </ControlPanel>
    </>
  );
}
