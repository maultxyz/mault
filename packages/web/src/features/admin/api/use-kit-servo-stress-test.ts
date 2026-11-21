import { useKitCommand } from "@/features/admin/api/use-kit-command";
import { stressRestOrder } from "@/features/admin/lib/kit-stress-plan";
import { KIT_STRESS_STEP_MS } from "@/lib/constants/kit-test";
import { delay } from "@/lib/delay";
import type {
  KitStressChannelPlan,
  KitServoStressMotionWatch,
  KitServoStressTarget,
  KitServoStressTest,
  KitStressChannelResult,
  KitStressEndReason,
  KitStressStopSource,
} from "@/lib/interfaces/kit-test";
import { useCallback, useEffect, useRef, useState } from "react";

const STRESS_TARGETS: KitServoStressTarget[] = ["min", "max"];

export function useKitServoStressTest(
  motionWatch: KitServoStressMotionWatch,
): KitServoStressTest {
  const sendCommand = useKitCommand();
  const motionWatchRef = useRef(motionWatch);
  motionWatchRef.current = motionWatch;
  const [isRunning, setIsRunning] = useState(false);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [endedAtMs, setEndedAtMs] = useState<number | null>(null);
  const [endReason, setEndReason] = useState<KitStressEndReason | null>(null);
  const [results, setResults] = useState<KitStressChannelResult[]>([]);
  const isStopRequestedRef = useRef(false);
  const isRunningRef = useRef(false);
  const resultsRef = useRef<KitStressChannelResult[]>([]);
  const channelsAwaitingReleaseRef = useRef<number[]>([]);
  const plansByChannelRef = useRef(new Map<number, KitStressChannelPlan>());

  const publishResults = useCallback(() => {
    setResults(resultsRef.current.map((result) => ({ ...result })));
  }, []);

  const send = useCallback(
    async (payload: unknown) => (await sendCommand(payload)) !== null,
    [sendCommand],
  );

  const releaseChannels = useCallback(
    async (channels: number[]) => {
      for (const channel of channels) {
        if (!(await send({ channelStop: channel }))) return false;
      }
      return true;
    },
    [send],
  );

  const restAndReleaseChannels = useCallback(
    async (channels: number[]) => {
      const plans = channels
        .map((channel) => plansByChannelRef.current.get(channel))
        .filter((plan) => plan !== undefined);
      for (const plan of stressRestOrder(plans)) {
        if (plan.restPulse === null) continue;
        if (!(await send({ channel: plan.channel, value: plan.restPulse }))) {
          return false;
        }
      }
      if (plans.some((plan) => plan.restPulse !== null)) {
        await delay(KIT_STRESS_STEP_MS);
      }
      return releaseChannels(channels);
    },
    [releaseChannels, send],
  );

  const markResultStopped = useCallback(
    (channel: number, stoppedBy: KitStressStopSource) => {
      const result = resultsRef.current.find(
        (candidate) => candidate.channel === channel,
      );
      if (!result || result.stoppedAtMs !== null) return;
      result.stoppedAtMs = Date.now();
      result.stoppedBy = stoppedBy;
      channelsAwaitingReleaseRef.current.push(channel);
      publishResults();
    },
    [publishResults],
  );

  const runCycles = useCallback(async (): Promise<KitStressEndReason> => {
    while (!isStopRequestedRef.current) {
      const channelsToRelease = channelsAwaitingReleaseRef.current.splice(0);
      if (!(await releaseChannels(channelsToRelease))) return "boardStopped";
      const movingChannels = resultsRef.current
        .filter((result) => result.stoppedAtMs === null)
        .map((result) => result.channel);
      if (movingChannels.length === 0) return "allServosStopped";
      for (const target of STRESS_TARGETS) {
        for (const channel of movingChannels) {
          if (isStopRequestedRef.current) return "manual";
          const pulse = plansByChannelRef.current.get(channel)?.pulses?.[target];
          if (pulse === undefined) continue;
          if (!(await send({ channel, value: pulse }))) return "boardStopped";
        }
        await delay(KIT_STRESS_STEP_MS);
        const stoppedChannels =
          await motionWatchRef.current.checkSettledPositions(
            target,
            movingChannels,
          );
        for (const channel of stoppedChannels) {
          markResultStopped(channel, "camera");
        }
      }
      for (const result of resultsRef.current) {
        if (result.stoppedAtMs === null) result.cycles += 1;
      }
      publishResults();
    }
    return "manual";
  }, [markResultStopped, publishResults, releaseChannels, send]);

  const start = useCallback(
    (plans: KitStressChannelPlan[]) => {
      const runnablePlans = plans.filter((plan) => plan.pulses !== null);
      const channels = runnablePlans.map((plan) => plan.channel);
      if (isRunningRef.current || channels.length === 0) return;
      plansByChannelRef.current = new Map(
        runnablePlans.map((plan) => [plan.channel, plan]),
      );
      isRunningRef.current = true;
      isStopRequestedRef.current = false;
      channelsAwaitingReleaseRef.current = [];
      resultsRef.current = [...channels]
        .sort((a, b) => a - b)
        .map((channel) => ({
          channel,
          cycles: 0,
          stoppedAtMs: null,
          stoppedBy: null,
        }));
      motionWatchRef.current.resetForRun(channels);
      publishResults();
      setStartedAtMs(Date.now());
      setEndedAtMs(null);
      setEndReason(null);
      setIsRunning(true);
      void (async () => {
        const reason = await runCycles();
        if (reason !== "boardStopped") {
          const isReleased = await releaseChannels(
            channelsAwaitingReleaseRef.current.splice(0),
          );
          if (isReleased) {
            await restAndReleaseChannels(
              resultsRef.current
                .filter((result) => result.stoppedAtMs === null)
                .map((result) => result.channel),
            );
          }
        }
        isRunningRef.current = false;
        setEndReason(reason);
        setEndedAtMs(Date.now());
        setIsRunning(false);
      })();
    },
    [publishResults, releaseChannels, restAndReleaseChannels, runCycles],
  );

  const stop = useCallback(() => {
    isStopRequestedRef.current = true;
  }, []);

  const markServoStopped = useCallback(
    (channel: number) => markResultStopped(channel, "manual"),
    [markResultStopped],
  );

  useEffect(
    () => () => {
      isStopRequestedRef.current = true;
    },
    [],
  );

  return {
    isRunning,
    startedAtMs,
    endedAtMs,
    endReason,
    results,
    start,
    stop,
    markServoStopped,
  };
}
