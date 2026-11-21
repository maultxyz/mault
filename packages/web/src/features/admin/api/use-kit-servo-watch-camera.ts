import {
  createWatchChannelState,
  recordSettledPatch,
  samplePatch,
} from "@/features/admin/lib/servo-motion-watch";
import {
  acquirePiRelayStream,
  isPiCameraId,
  listPiCameras,
} from "@/features/scanner/lib/pi-camera";
import { KIT_WATCH_FRAME_LAG_MS } from "@/lib/constants/kit-test";
import { delay } from "@/lib/delay";
import type {
  KitServoStressTarget,
  KitServoWatchCamera,
  KitWatchBox,
  KitWatchChannelState,
  KitWatchChannelSummary,
} from "@/lib/interfaces/kit-test";
import { loadPiHost } from "@/lib/pi-host";
import { useCallback, useEffect, useRef, useState } from "react";

async function listLocalCameras(): Promise<MediaDeviceInfo[]> {
  const mediaDevices = navigator.mediaDevices;
  if (!mediaDevices?.enumerateDevices) return [];
  const devices = await mediaDevices.enumerateDevices();
  return devices.filter(
    (device) => device.kind === "videoinput" && device.deviceId,
  );
}

function summarize(state: KitWatchChannelState): KitWatchChannelSummary {
  return {
    status: state.status,
    consecutiveMisses: state.consecutiveMisses,
    lastMovementPercent: state.lastMovementPercent,
  };
}

export function useKitServoWatchCamera(): KitServoWatchCamera {
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [boxes, setBoxes] = useState<Record<number, KitWatchBox>>({});
  const [watchSummaries, setWatchSummaries] = useState<
    Record<number, KitWatchChannelSummary>
  >({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const boxesRef = useRef(boxes);
  boxesRef.current = boxes;
  const watchStatesRef = useRef<Record<number, KitWatchChannelState>>({});
  const scratchCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const refreshCameras = useCallback(async () => {
    try {
      setCameras(
        (await loadPiHost()) ? await listPiCameras() : await listLocalCameras(),
      );
    } catch {
      setCameras([]);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const startCamera = useCallback(
    async (cameraId: string) => {
      stopCamera();
      setSelectedCameraId(cameraId);
      setIsStarting(true);
      setHasError(false);
      try {
        const nextStream = isPiCameraId(cameraId)
          ? await acquirePiRelayStream(cameraId)
          : await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: cameraId } },
              audio: false,
            });
        streamRef.current = nextStream;
        setStream(nextStream);
        if (!isPiCameraId(cameraId)) void refreshCameras();
      } catch {
        setHasError(true);
      } finally {
        setIsStarting(false);
      }
    },
    [refreshCameras, stopCamera],
  );

  const setBox = useCallback((channel: number, box: KitWatchBox) => {
    setBoxes((previous) => ({ ...previous, [channel]: box }));
  }, []);

  const clearBox = useCallback((channel: number) => {
    setBoxes((previous) => {
      const next = { ...previous };
      delete next[channel];
      return next;
    });
  }, []);

  const publishSummaries = useCallback(() => {
    const summaries: Record<number, KitWatchChannelSummary> = {};
    for (const [channel, state] of Object.entries(watchStatesRef.current)) {
      summaries[Number(channel)] = summarize(state);
    }
    setWatchSummaries(summaries);
  }, []);

  const resetForRun = useCallback(
    (channels: number[]) => {
      const states: Record<number, KitWatchChannelState> = {};
      if (streamRef.current) {
        for (const channel of channels) {
          if (boxesRef.current[channel]) {
            states[channel] = createWatchChannelState();
          }
        }
      }
      watchStatesRef.current = states;
      publishSummaries();
    },
    [publishSummaries],
  );

  const checkSettledPositions = useCallback(
    async (target: KitServoStressTarget, channels: number[]) => {
      const watchedChannels = channels.filter(
        (channel) => watchStatesRef.current[channel],
      );
      const video = videoRef.current;
      if (watchedChannels.length === 0 || !video || !streamRef.current) {
        return [];
      }
      await delay(KIT_WATCH_FRAME_LAG_MS);
      scratchCanvasRef.current ??= document.createElement("canvas");
      const stoppedChannels: number[] = [];
      for (const channel of watchedChannels) {
        const box = boxesRef.current[channel];
        const state = watchStatesRef.current[channel];
        if (!box || !state) continue;
        const patch = samplePatch(
          video,
          video.videoWidth,
          video.videoHeight,
          box,
          scratchCanvasRef.current,
        );
        const result = recordSettledPatch(state, target, patch);
        watchStatesRef.current[channel] = result.state;
        if (result.isStopped) stoppedChannels.push(channel);
      }
      publishSummaries();
      return stoppedChannels;
    },
    [publishSummaries],
  );

  useEffect(() => {
    void refreshCameras();
  }, [refreshCameras]);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    cameras,
    selectedCameraId,
    stream,
    isStarting,
    hasError,
    videoRef,
    boxes,
    watchSummaries,
    refreshCameras,
    startCamera,
    stopCamera,
    setBox,
    clearBox,
    resetForRun,
    checkSettledPositions,
  };
}
