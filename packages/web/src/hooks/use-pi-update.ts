import { getPiUpdateStatus, startPiUpdate } from "@/lib/api/pi-update";
import {
  PI_UPDATE_ACTIVE_POLL_MS,
  PI_UPDATE_IDLE_POLL_MS,
  PI_UPDATE_RECONNECT_TIMEOUT_MS,
} from "@/lib/constants/pi-update";
import type { PiUpdateControls } from "@/lib/interfaces/pi-update";
import type { PiUpdateStatus } from "@magic-vault/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export function usePiUpdate(enabled: boolean): PiUpdateControls {
  const { t } = useTranslation("common");
  const [status, setStatus] = useState<PiUpdateStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [pollGeneration, setPollGeneration] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      let active = startedAt.current !== null;
      try {
        const next = await getPiUpdateStatus();
        if (cancelled) return;
        setStatus(next);
        active = next.state.phase === "running";
        const wasWaiting = startedAt.current !== null;
        startedAt.current = active
          ? (next.state.startedAt ?? Date.now())
          : null;
        if (active || wasWaiting) setError(null);
      } catch {
        if (cancelled) return;
        if (
          startedAt.current &&
          Date.now() - startedAt.current > PI_UPDATE_RECONNECT_TIMEOUT_MS
        ) {
          setError(t("appVersion.updateUnconfirmed"));
          startedAt.current = null;
          active = false;
        }
      }
      if (!cancelled)
        timer = setTimeout(
          poll,
          active ? PI_UPDATE_ACTIVE_POLL_MS : PI_UPDATE_IDLE_POLL_MS,
        );
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, pollGeneration, t]);

  const start = useCallback(async () => {
    if (starting || !enabled) return;
    setStarting(true);
    setError(null);
    try {
      const state = await startPiUpdate();
      startedAt.current = state.startedAt;
      setStatus((previous) => ({
        available: false,
        installedVersion: null,
        latestVersion: null,
        ...previous,
        state,
      }));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : t("appVersion.updateFailed"),
      );
    } finally {
      setStarting(false);
      setPollGeneration((value) => value + 1);
    }
  }, [enabled, starting, t]);

  return {
    status: enabled ? status : null,
    error: enabled ? error : null,
    busy:
      enabled && (starting || (status?.state.phase === "running" && !error)),
    start,
  };
}
