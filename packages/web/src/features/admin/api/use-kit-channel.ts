import { useKitCommand } from "@/features/admin/api/use-kit-command";
import { KIT_SWEEP_PULSES, KIT_SWEEP_STEP_MS } from "@/lib/constants/kit-test";
import { useCallback, useState } from "react";
import { delay } from "@/lib/delay";

export function useKitChannel() {
  const sendCommand = useKitCommand();
  const [isBusy, setIsBusy] = useState(false);

  const send = useCallback(
    async (payload: unknown): Promise<boolean> =>
      (await sendCommand(payload)) !== null,
    [sendCommand],
  );

  const run = useCallback(async (task: () => Promise<unknown>) => {
    setIsBusy(true);
    try {
      await task();
    } finally {
      setIsBusy(false);
    }
  }, []);

  const drive = useCallback(
    (channel: number, value: number) => run(() => send({ channel, value })),
    [run, send],
  );

  const stop = useCallback(
    (channel: number) => run(() => send({ channelStop: channel })),
    [run, send],
  );

  const sweep = useCallback(
    (channel: number) =>
      run(async () => {
        for (const value of KIT_SWEEP_PULSES) {
          if (!(await send({ channel, value }))) return;
          await delay(KIT_SWEEP_STEP_MS);
        }
      }),
    [run, send],
  );

  return { drive, stop, sweep, isBusy };
}
