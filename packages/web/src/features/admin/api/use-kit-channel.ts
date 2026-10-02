import { useSerial } from "@/features/scanner/api/use-serial";
import {
  KIT_COMMAND_TIMEOUT_MS,
  KIT_SWEEP_PULSES,
  KIT_SWEEP_STEP_MS,
} from "@/lib/constants/kit-test";
import { toast } from "@/lib/toast";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function useKitChannel() {
  const { t } = useTranslation("admin");
  const { sendRawCommand } = useSerial();
  const [isBusy, setIsBusy] = useState(false);

  const send = useCallback(
    async (payload: unknown): Promise<boolean> => {
      const result = await sendRawCommand(
        JSON.stringify(payload),
        KIT_COMMAND_TIMEOUT_MS,
      );
      const ok = result.status === "ok" && !result.line?.includes('"error"');
      if (!ok) {
        toast.error(t("kitTest.toasts.commandFailed"), {
          description: result.line ?? t(`kitTest.status.${result.status}`),
        });
      }
      return ok;
    },
    [sendRawCommand, t],
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
