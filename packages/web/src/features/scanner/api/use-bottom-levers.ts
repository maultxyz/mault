import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useModuleCount } from "@/features/calibration/api/use-module-count";
import { setPiScanBottoms } from "@/features/scanner/api/pi-scan-session";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import type { PiScanBottomPosition } from "@magic-vault/shared";

export function useBottomLevers(canUsePi: boolean) {
  const { t } = useTranslation("scanner");
  const toast = useStationToast();
  const { isReady, sendRequest } = useSerial();
  const moduleCount = useModuleCount();
  const [bottomsOpen, setBottomsOpen] = useState(false);
  const [isMovingBottoms, setIsMovingBottoms] = useState(false);

  const markBottomsClosed = useCallback(() => {
    setBottomsOpen(false);
  }, []);

  const fail = useCallback(
    (description?: string) => {
      toast.error(t("cardScanner.bottomsFailed.title"), {
        description: description ?? t("cardScanner.bottomsFailed.description"),
      });
    },
    [toast, t],
  );

  const moveOnSorter = useCallback(
    async (position: PiScanBottomPosition) => {
      if (!isReady || moduleCount < 1) return false;
      for (let module = 1; module <= moduleCount; module += 1) {
        const { sent, line } = await sendRequest({
          servo: "bottom",
          module,
          position,
        });
        if (!sent || !line) return false;
        try {
          const parsed = JSON.parse(line) as { status?: string };
          if (parsed.status !== "ok") return false;
        } catch {
          return false;
        }
      }
      return true;
    },
    [isReady, moduleCount, sendRequest],
  );

  const move = useCallback(
    async (
      position: PiScanBottomPosition,
    ): Promise<{ ok: boolean; message?: string }> => {
      if (isReady) return { ok: await moveOnSorter(position) };
      if (!canUsePi) return { ok: false };
      const result = await setPiScanBottoms(position);
      if (!result.success) return { ok: false, message: result.message };
      return { ok: true };
    },
    [isReady, canUsePi, moveOnSorter],
  );

  const toggleBottoms = useCallback(async () => {
    if (isMovingBottoms) return;
    const position: PiScanBottomPosition = bottomsOpen ? "closed" : "open";
    setIsMovingBottoms(true);
    try {
      const result = await move(position);
      if (!result.ok) {
        fail(result.message);
        return;
      }
      setBottomsOpen(position === "open");
    } finally {
      setIsMovingBottoms(false);
    }
  }, [isMovingBottoms, bottomsOpen, move, fail]);

  const ensureBottomsClosed = useCallback(async () => {
    if (!bottomsOpen) return true;
    setIsMovingBottoms(true);
    try {
      const result = await move("closed");
      if (!result.ok) {
        fail(result.message);
        return false;
      }
      setBottomsOpen(false);
      return true;
    } finally {
      setIsMovingBottoms(false);
    }
  }, [bottomsOpen, move, fail]);

  return {
    bottomsOpen,
    isMovingBottoms,
    toggleBottoms,
    ensureBottomsClosed,
    markBottomsClosed,
  };
}
