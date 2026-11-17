import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useOrg } from "@/features/companies/api/use-organization";
import { useDevice } from "@/features/calibration/api/use-device";
import { useCameraContext } from "@/features/scanner/api/use-camera";
import { useSerial } from "@/features/scanner/api/use-serial";
import { useIsSessionActive } from "@/features/scanner/api/use-is-session-active";
import { useStationToast } from "@/features/scanner/api/use-station-toast";
import { releaseCanvases } from "@/features/scanner/lib/scan-canvas";
import { assertFoilLightingReply, captureFoilSequence, foilExperimentSteps, waitForFoilExposure, withFoilLedMask } from "@/features/calibration/lib/foil-capture-sequence";
import { deleteFoilSample, exportFoilSample, loadFoilSamples, saveFoilSample, updateFoilSample } from "@/features/calibration/lib/foil-calibration-store";
import { analyzeFoilSample } from "@/features/calibration/lib/analyze-foil-sample";
import { FOIL_CALIBRATION_MAX_DIMENSION, FOIL_CALIBRATION_SAMPLE_LIMIT, FOIL_CALIBRATION_SETTLE_MS } from "@/lib/constants/foil-calibration";
import type { FoilCalibrationOptions, FoilCalibrationSample, FoilCaptureForm, FoilLighting } from "@/lib/interfaces/foil-calibration";
import { assertLightLedCountReply, isFirmwareFeatureSupported, toSetLightCommand, type LightSettings } from "@magic-vault/shared";

export function useFoilCalibration(options: FoilCalibrationOptions) {
  const { t } = useTranslation("calibration");
  const toast = useStationToast();
  const { activeOrg } = useOrg();
  const device = useDevice();
  const camera = useCameraContext();
  const serial = useSerial();
  const sessionActive = useIsSessionActive();
  const videoRef = useRef<HTMLVideoElement>(null);
  const runRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const analysisRef = useRef(false);
  const [step, setStep] = useState<string | null>(null);
  const [samples, setSamples] = useState<FoilCalibrationSample[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const current = useRef({ device, serial, camera, sessionActive, orgId: activeOrg?.id });
  current.current = { device, serial, camera, sessionActive, orgId: activeOrg?.id };
  const orgId = activeOrg?.id;
  const guid = device?.guid;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !camera.stream) return;
    video.srcObject = camera.stream;
    void video.play().catch((cause: unknown) => {
      console.error("Foil calibration camera preview failed:", cause);
      setError(t("foilCalibration.failed"));
    });
    return () => { video.srcObject = null; };
  }, [camera.stream, t]);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setSamples([]);
    if (orgId && guid) {
      void loadFoilSamples(orgId, guid).then((saved) => {
        if (!cancelled) {
          setSamples(saved.samples);
          setTotalCount(saved.totalCount);
          setLoaded(true);
        }
      }).catch((cause: unknown) => {
        console.error("Foil calibration storage failed:", cause);
        if (!cancelled) setError(t("foilCalibration.storageFailed"));
      });
    }
    return () => { cancelled = true; };
  }, [orgId, guid, revision, t]);

  useEffect(() => () => { runRef.current?.abort(); },
    [orgId, guid, camera.cameraSource, camera.stream, serial.deviceId]);

  useEffect(() => {
    if (sessionActive || !serial.isReady) runRef.current?.abort();
  }, [sessionActive, serial.isReady]);

  const cameraReady = camera.cameraSource === "phone"
    ? camera.phonePairingStatus === "connected"
    : camera.status === "ready" && !!camera.stream;
  const canCapture = loaded && !!orgId && !!device && serial.isReady &&
    isFirmwareFeatureSupported(serial.firmwareVersion, "lighting") &&
    cameraReady && !options.disabled && !sessionActive && !busy && !analyzingId &&
    totalCount < FOIL_CALIBRATION_SAMPLE_LIMIT;

  const capture = async (label: FoilCaptureForm) => {
    if (runRef.current) return;
    if (!canCapture || !device || !orgId || serial.isRouteBusy()) {
      setError(t("foilCalibration.unavailable"));
      return;
    }
    const controller = new AbortController();
    runRef.current = controller;
    setBusy(true);
    setError(null);
    const canvas = document.createElement("canvas");
    let saving = false;
    const restore: LightSettings = {
      lightMode: device.lightMode,
      lightColor: device.lightColor,
      lightBrightness: device.lightBrightness,
      lightWhite: device.lightWhite,
      lightLedCount: device.lightLedCount,
    };
    const deviceId = serial.deviceId;
    const source = camera.cameraSource;
    const settleMs = Math.max(FOIL_CALIBRATION_SETTLE_MS, options.captureSettleDelayMs);
    const assertConnection = () => {
      const active = current.current;
      if (active.device?.guid !== device.guid || active.orgId !== orgId ||
        active.serial.deviceId !== deviceId || !active.serial.isReady) {
        throw new Error("Sorter connection changed during foil calibration");
      }
    };
    const setLight = async (settings: FoilLighting) => {
      assertConnection();
      const rgbwSupported = isFirmwareFeatureSupported(current.current.serial.firmwareVersion, "rgbwLighting");
      const configurableLightingSupported = isFirmwareFeatureSupported(current.current.serial.firmwareVersion, "configurableLighting");
      const { sent, line } = await current.current.serial.sendRequest(withFoilLedMask(
        toSetLightCommand({ ...settings, lightLedCount: device.lightLedCount }, { rgbwSupported, configurableLightingSupported }),
        settings.ledMask,
      ));
      if (!sent || !line) throw new Error("Lighting acknowledgement missing");
      if (configurableLightingSupported) assertLightLedCountReply(line, device.lightLedCount);
      assertFoilLightingReply(line, settings);
    };
    try {
      const frames = await captureFoilSequence({
        steps: foilExperimentSteps(label.captureMode, label.brightness,
          isFirmwareFeatureSupported(serial.firmwareVersion, "configurableLighting") ? device.lightLedCount : 16),
        restore,
        signal: controller.signal,
        settleMs,
        setLight,
        wait: waitForFoilExposure,
        onStep: setStep,
        capture: async (captureStep) => {
          assertConnection();
          if (current.current.sessionActive) throw new Error("Scanning started during calibration");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) throw new Error("Canvas unavailable");
          if (source === "phone") {
            const imageUrl = await camera.requestPhoneCapture();
            if (!imageUrl) throw new Error("Phone capture failed");
            controller.signal.throwIfAborted();
            const image = new Image();
            image.src = imageUrl;
            await image.decode();
            const scale = Math.min(1, FOIL_CALIBRATION_MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
            canvas.width = Math.round(image.naturalWidth * scale);
            canvas.height = Math.round(image.naturalHeight * scale);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          } else {
            const video = videoRef.current;
            if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight ||
              !camera.stream?.getVideoTracks().some((track) => track.readyState === "live")) {
              throw new Error("Camera frame unavailable");
            }
            const scale = Math.min(1, FOIL_CALIBRATION_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
            canvas.width = Math.round(video.videoHeight * scale);
            canvas.height = Math.round(video.videoWidth * scale);
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(Math.PI / 2);
            ctx.drawImage(video, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width);
            ctx.restore();
          }
          if (!canvas.width || !canvas.height) throw new Error("Empty camera frame");
          const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let brightness = 0;
          let clipped = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            brightness += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) >= 250) clipped++;
          }
          return {
            step: captureStep.id,
            lighting: captureStep.lighting,
            capturedAt: new Date().toISOString(),
            width: canvas.width,
            height: canvas.height,
            image: canvas.toDataURL("image/jpeg", 0.92),
            meanBrightness: brightness / (pixels.length / 4),
            clippedFraction: clipped / (pixels.length / 4),
          };
        },
      });
      controller.signal.throwIfAborted();
      assertConnection();
      const sample: FoilCalibrationSample = {
        version: 1,
        id: crypto.randomUUID(),
        orgId,
        deviceGuid: device.guid,
        createdAt: new Date().toISOString(),
        label,
        cameraSource: source,
        cameraLabel: source === "phone" ? "phone" :
          camera.cameras.find((item) => item.deviceId === camera.selectedCameraId)?.label ?? "local",
        cameraSettings: source === "local" ? camera.stream?.getVideoTracks()[0]?.getSettings() ?? null : null,
        firmwareVersion: serial.firmwareVersion,
        scanRegion: structuredClone(options.scanRegion),
        settleMs,
        frames,
      };
      saving = true;
      await saveFoilSample(sample);
      setRevision((value) => value + 1);
      toast.success(t("foilCalibration.saved"));
      await analyze(sample);
    } catch (cause) {
      console.error("Foil calibration capture failed or cancelled:", cause);
      setError(t(saving ? "foilCalibration.storageFailed" :
        controller.signal.aborted ? "foilCalibration.cancelled" : "foilCalibration.failed"));
      toast.error(t(saving ? "foilCalibration.storageFailed" : "foilCalibration.checkLighting"));
    } finally {
      releaseCanvases([canvas]);
      runRef.current = null;
      setBusy(false);
      setStep(null);
    }
  };

  const analyze = async (sample: FoilCalibrationSample) => {
    if (analysisRef.current) return;
    analysisRef.current = true;
    setAnalyzingId(sample.id);
    try {
      const analysis = await analyzeFoilSample(sample);
      await updateFoilSample({ ...sample, analysis });
      setRevision((value) => value + 1);
      const verdict = analysis.direction?.verdict;
      if (verdict) toast(t("foilCalibration.verdictToast", { card: sample.label.card, verdict: t(`foilCalibration.verdict.${verdict}`) }));
    } catch (cause) {
      console.error("Foil card analysis failed:", cause);
      setError(t("foilCalibration.analysisFailed"));
      toast.error(t("foilCalibration.analysisFailed"));
    } finally {
      analysisRef.current = false;
      setAnalyzingId(null);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteFoilSample(id);
      setRevision((value) => value + 1);
    } catch (cause) {
      console.error("Foil calibration deletion failed:", cause);
      setError(t("foilCalibration.storageFailed"));
    }
  };

  const exportSample = (sample: FoilCalibrationSample) => {
    try {
      exportFoilSample(sample);
    } catch (cause) {
      console.error("Foil calibration export failed:", cause);
      setError(t("foilCalibration.storageFailed"));
    }
  };

  return { videoRef, busy, analyzingId, step, samples, loaded, totalCount, error, canCapture, capture, analyze, remove, exportSample,
    cancel: () => runRef.current?.abort() };
}
