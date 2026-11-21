import { Callout } from "@/components/callout";
import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { KitServoWatchPanel } from "@/features/admin/components/kit-servo-watch-panel";
import {
  conflictingStressChannel,
  stressChannelPlan,
} from "@/features/admin/lib/kit-stress-plan";
import { useNow } from "@/hooks/use-now";
import {
  KIT_CHANNELS,
  KIT_STRESS_DEFAULT_CHANNELS,
} from "@/lib/constants/kit-test";
import { formatElapsed } from "@/lib/format";
import type {
  KitServoStressBenchProps,
  KitStressChannelPlan,
} from "@/lib/interfaces/kit-test";
import {
  IconHandStop,
  IconPlayerPlay,
  IconPlayerStop,
} from "@tabler/icons-react";
import { useId, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

function stressRoleLabel(plan: KitStressChannelPlan, t: TFunction<"admin">) {
  if (plan.role.kind === "moduleServo") {
    return t(`kitTest.stress.role.${plan.role.servo}`, {
      module: plan.role.moduleNumber,
    });
  }
  return t(`kitTest.stress.role.${plan.role.kind}`);
}

export function KitServoStressBench({
  stressTest,
  watchCamera,
  planInputs,
  disabled,
}: KitServoStressBenchProps) {
  const { t } = useTranslation("admin");
  const [chosenChannels, setChosenChannels] = useState<number[]>(
    KIT_STRESS_DEFAULT_CHANNELS,
  );
  const plansByChannel = useMemo(
    () =>
      new Map(
        KIT_CHANNELS.map((channel) => [
          channel,
          stressChannelPlan(channel, planInputs),
        ]),
      ),
    [planInputs],
  );
  const selectedChannels = chosenChannels
    .filter((channel) => plansByChannel.get(channel)?.pulses)
    .filter((channel, index, channels) => {
      const partner = conflictingStressChannel(channel, planInputs);
      return partner === null || !channels.slice(0, index).includes(partner);
    })
    .sort((first, second) => first - second);
  const selectedPlans = selectedChannels
    .map((channel) => plansByChannel.get(channel))
    .filter((plan) => plan !== undefined);
  const feederChannel = KIT_CHANNELS.find(
    (channel) => plansByChannel.get(channel)?.role.kind === "feeder",
  );
  const usesModuleServos = selectedPlans.some(
    (plan) => plan.role.kind === "moduleServo",
  );
  const channelLabelId = useId();
  const now = useNow(1000);
  const { isRunning, startedAtMs, endedAtMs, endReason, results } = stressTest;
  const totalElapsedMs =
    startedAtMs === null ? 0 : (endedAtMs ?? now) - startedAtMs;
  const stoppedCount = results.filter(
    (result) => result.stoppedAtMs !== null,
  ).length;
  const latestCameraStop = results
    .filter((result) => result.stoppedBy === "camera")
    .sort((first, second) => (second.stoppedAtMs ?? 0) - (first.stoppedAtMs ?? 0))[0];

  const isChannelBlocked = (channel: number) => {
    if (!plansByChannel.get(channel)?.pulses) return true;
    const partner = conflictingStressChannel(channel, planInputs);
    return partner !== null && selectedChannels.includes(partner);
  };

  const toggleChannel = (channel: number) =>
    setChosenChannels((previous) =>
      previous.includes(channel)
        ? previous.filter((candidate) => candidate !== channel)
        : [...previous, channel],
    );

  return (
    <SettingsSection
      heading={t("kitTest.stress.heading")}
      description={t("kitTest.stress.description")}
      action={
        isRunning ? (
          <Button variant="destructive" onClick={stressTest.stop}>
            <IconPlayerStop />
            {t("kitTest.stress.stop")}
          </Button>
        ) : (
          <Button
            disabled={disabled || selectedChannels.length === 0}
            onClick={() => stressTest.start(selectedPlans)}
          >
            <IconPlayerPlay />
            {t("kitTest.stress.start")}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-2">
        <Label id={channelLabelId}>{t("kitTest.stress.channels")}</Label>
        <div
          role="group"
          aria-labelledby={channelLabelId}
          className="grid grid-cols-8 gap-1.5"
        >
          {KIT_CHANNELS.map((channel) => {
            const isSelected = selectedChannels.includes(channel);
            const plan = plansByChannel.get(channel);
            return (
              <Button
                key={channel}
                variant={isSelected ? "outline-selected" : "outline"}
                aria-pressed={isSelected}
                aria-label={
                  plan
                    ? t("kitTest.stress.channelButton", {
                        channel,
                        role: stressRoleLabel(plan, t),
                      })
                    : undefined
                }
                className="px-0"
                disabled={
                  disabled ||
                  isRunning ||
                  (!isSelected && isChannelBlocked(channel))
                }
                onClick={() => toggleChannel(channel)}
              >
                {channel}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-foreground/70">
          {t("kitTest.stress.hint")}
        </p>
        <p className="text-xs text-foreground/70">
          {feederChannel === undefined
            ? t("kitTest.stress.calibrationHint")
            : t("kitTest.stress.calibrationHintWithFeeder", {
                channel: feederChannel,
              })}
        </p>
      </div>

      {usesModuleServos && !planInputs.hasSavedCalibration && (
        <Callout variant="warning">
          {t("kitTest.stress.defaultCalibration")}
        </Callout>
      )}

      {selectedPlans.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {selectedPlans.map((plan) => (
            <li key={plan.channel} className="flex flex-wrap gap-x-2">
              <span className="font-semibold">
                {t("kitTest.stress.channel", { channel: plan.channel })}
              </span>
              <span>{stressRoleLabel(plan, t)}</span>
              {plan.pulses && (
                <span className="text-foreground/70">
                  {t(
                    plan.role.kind === "moduleServo"
                      ? `kitTest.stress.pulses.${plan.role.servo}`
                      : "kitTest.stress.pulses.unassigned",
                    { min: plan.pulses.min, max: plan.pulses.max },
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <KitServoWatchPanel
        watchCamera={watchCamera}
        channels={selectedChannels}
        isRunning={isRunning}
        disabled={disabled}
      />

      {results.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">
              {t("kitTest.stress.elapsed", {
                elapsed: formatElapsed(totalElapsedMs),
              })}
            </span>
            <Badge variant={isRunning ? "info" : "outline"}>
              {isRunning
                ? t("kitTest.stress.running")
                : t("kitTest.stress.finished")}
            </Badge>
            <span className="text-foreground/70">
              {t("kitTest.stress.stoppedCount", {
                stopped: stoppedCount,
                total: results.length,
              })}
            </span>
          </div>

          <ul className="flex flex-col gap-1.5">
            {results.map((result) => {
              const isMoving = result.stoppedAtMs === null;
              const watchSummary = watchCamera.watchSummaries[result.channel];
              const resultPlan = plansByChannel.get(result.channel);
              return (
                <li
                  key={result.channel}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-foreground/6 p-2 text-sm"
                >
                  <span className="font-semibold">
                    {t("kitTest.stress.channel", { channel: result.channel })}
                  </span>
                  {resultPlan && (
                    <span className="text-foreground/70">
                      {stressRoleLabel(resultPlan, t)}
                    </span>
                  )}
                  <span className="font-mono">
                    {t("kitTest.stress.cycles", { count: result.cycles })}
                  </span>
                  {result.stoppedAtMs !== null && startedAtMs !== null ? (
                    <Badge variant="destructive">
                      {t(
                        result.stoppedBy === "camera"
                          ? "kitTest.stress.cameraStoppedAfter"
                          : "kitTest.stress.stoppedAfter",
                        {
                          elapsed: formatElapsed(
                            result.stoppedAtMs - startedAtMs,
                          ),
                        },
                      )}
                    </Badge>
                  ) : (
                    <Badge variant="success">
                      {isRunning
                        ? t("kitTest.stress.moving")
                        : t("kitTest.stress.survived")}
                    </Badge>
                  )}
                  {watchSummary && (
                    <span className="text-xs text-foreground/70">
                      {watchSummary.status === "watching" &&
                      watchSummary.lastMovementPercent !== null
                        ? t("kitTest.stress.camera.reached", {
                            percent: watchSummary.lastMovementPercent,
                          })
                        : t(`kitTest.stress.camera.status.${watchSummary.status}`)}
                    </span>
                  )}
                  {isRunning && isMoving && (
                    <Button
                      variant="outline"
                      className="ml-auto"
                      aria-label={t("kitTest.stress.markStoppedOnChannel", {
                        channel: result.channel,
                      })}
                      onClick={() => stressTest.markServoStopped(result.channel)}
                    >
                      <IconHandStop />
                      {t("kitTest.stress.markStopped")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p role="status" className="text-sm empty:hidden">
        {endReason
          ? t(`kitTest.stress.endReason.${endReason}`, {
              elapsed: formatElapsed(totalElapsedMs),
            })
          : latestCameraStop
            ? t("kitTest.stress.camera.announceStopped", {
                channel: latestCameraStop.channel,
              })
            : ""}
      </p>
    </SettingsSection>
  );
}
