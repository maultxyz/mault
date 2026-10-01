import { useSerial } from "@/features/scanner/api/use-serial";
import { JamToastBody } from "@/features/scanner/components/jam-toast-body";
import {
  JAM_CLEAR_DEVICE_TIMEOUT_MS,
  JAM_TOAST_ID_PREFIX,
} from "@/lib/constants/scanner";
import type { JamToastOptions } from "@/lib/interfaces/scanner";
import { toast } from "@/lib/toast";
import { useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

export function useJamToast(onResume: () => void) {
  const { t } = useTranslation("scanner");
  const { isReady, sendCommand, receiveResponse, readIR } = useSerial();
  const latestRef = useRef({ t, isReady, sendCommand, receiveResponse, onResume });
  latestRef.current = { t, isReady, sendCommand, receiveResponse, onResume };
  const busyModulesRef = useRef(new Set<number>());

  const runCommand = useCallback(
    async (command: object, timeoutMs: number) => {
      const { sendCommand, receiveResponse } = latestRef.current;
      if (!(await sendCommand(JSON.stringify(command)))) return null;
      const line = await receiveResponse(timeoutMs);
      if (!line) return null;
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return null;
      }
    },
    [],
  );

  const isModuleBlocked = useCallback(
    async (module: number) => {
      const ir = await readIR();
      return ir ? ir[module - 1] === true : null;
    },
    [readIR],
  );

  return useCallback(
    ({ module, binNumber }: JamToastOptions) => {
      const { t } = latestRef.current;
      const id = `${JAM_TOAST_ID_PREFIX}${module}`;

      const runExclusive = async (task: () => Promise<void>) => {
        if (busyModulesRef.current.has(module)) return;
        if (!latestRef.current.isReady) {
          show(t("cardScanner.jamDetected.notReady"));
          return;
        }
        busyModulesRef.current.add(module);
        try {
          await task();
        } finally {
          busyModulesRef.current.delete(module);
        }
      };

      const handleDrop = () =>
        runExclusive(async () => {
          const response = await runCommand(
            { clearDevice: true },
            JAM_CLEAR_DEVICE_TIMEOUT_MS,
          );
          show(
            !response || response.error
              ? t("cardScanner.jamDetected.dropFailed")
              : t("cardScanner.jamDetected.dropped"),
          );
        });

      const handleMarkCleared = () =>
        runExclusive(async () => {
          if ((await isModuleBlocked(module)) === true) {
            show(t("cardScanner.jamDetected.stillBlocked", { module }));
            return;
          }
          toast.dismiss(id);
          toast.success(t("cardScanner.jamCleared.title"), {
            description: t("cardScanner.jamCleared.description"),
          });
          latestRef.current.onResume();
        });

      function show(description: string) {
        toast.error(t("cardScanner.jamDetected.title"), {
          id,
          description: (
            <JamToastBody
              description={description}
              dropLabel={t("cardScanner.jamDetected.dropCard")}
              markClearedLabel={t("cardScanner.jamDetected.markCleared")}
              onDrop={() => void handleDrop()}
              onMarkCleared={() => void handleMarkCleared()}
            />
          ),
          duration: Infinity,
          dismissible: true,
        });
      }

      show(
        binNumber
          ? t("cardScanner.jamDetected.descriptionWithBin", {
              module,
              bin: binNumber,
            })
          : t("cardScanner.jamDetected.description", { module }),
      );
    },
    [isModuleBlocked, runCommand],
  );
}
