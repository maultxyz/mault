import {
  DOCUMENT_SCANNER_CARD_ARRIVAL_POLL_MS,
  DOCUMENT_SCANNER_FLATBED_CARD_ARRIVAL_TIMEOUT_MS,
  FLATBED_COUNTDOWN_TICK_MS,
  FLATBED_IDLE_STEPS,
} from "@/lib/constants/scanner";
import type {
  FlatbedCardWaitOutcome,
  FlatbedScanFlow,
  FlatbedScanFlowOptions,
  FlatbedScanStep,
} from "@/lib/interfaces/scanner";
import { useCallback, useEffect, useRef, useState } from "react";

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function useFlatbedScan({
  isEnabled,
  hasSorter,
  ignoreIrSensors,
  scannerStatus,
  readIR,
  scanFlatbedCard,
  discardDocumentScannerPage,
  onCardReady,
  onScanFailed,
  onModuleOneNotEmpty,
}: FlatbedScanFlowOptions): FlatbedScanFlow {
  const [step, setStepState] = useState<FlatbedScanStep>("place-card");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const stepRef = useRef<FlatbedScanStep>("place-card");
  const waitTokenRef = useRef(0);
  const sawSearchingRef = useRef(false);
  const latest = { readIR, scanFlatbedCard, onCardReady, onScanFailed, onModuleOneNotEmpty };
  const latestRef = useRef(latest);
  latestRef.current = latest;

  const setStep = useCallback((nextStep: FlatbedScanStep) => {
    stepRef.current = nextStep;
    setStepState(nextStep);
  }, []);

  const isModuleOneLoaded = useCallback(async () => {
    const ir = await latestRef.current.readIR();
    return ir?.[0] === true;
  }, []);

  const handOffScannedCard = useCallback(() => {
    sawSearchingRef.current = false;
    setStep("identifying");
    latestRef.current.onCardReady();
  }, [setStep]);

  const waitForCardInModuleOne = useCallback(async (): Promise<FlatbedCardWaitOutcome> => {
    const token = ++waitTokenRef.current;
    const deadline = Date.now() + DOCUMENT_SCANNER_FLATBED_CARD_ARRIVAL_TIMEOUT_MS;
    let nextPollAt = 0;
    try {
      while (Date.now() < deadline) {
        if (waitTokenRef.current !== token) return "cancelled";
        setSecondsLeft(Math.ceil((deadline - Date.now()) / 1000));
        if (Date.now() >= nextPollAt) {
          if (ignoreIrSensors || (await isModuleOneLoaded())) {
            return waitTokenRef.current === token ? "arrived" : "cancelled";
          }
          nextPollAt = Date.now() + DOCUMENT_SCANNER_CARD_ARRIVAL_POLL_MS;
        }
        await wait(FLATBED_COUNTDOWN_TICK_MS);
      }
      return waitTokenRef.current === token ? "timed-out" : "cancelled";
    } finally {
      if (waitTokenRef.current === token) setSecondsLeft(null);
    }
  }, [ignoreIrSensors, isModuleOneLoaded]);

  const waitThenHandOff = useCallback(async () => {
    setStep("move-card");
    const outcome = await waitForCardInModuleOne();
    if (outcome === "arrived") handOffScannedCard();
    else if (outcome === "timed-out") setStep("missed-card");
  }, [setStep, waitForCardInModuleOne, handOffScannedCard]);

  const scanGlass = useCallback(async () => {
    setStep("scanning");
    const result = await latestRef.current.scanFlatbedCard();
    if (result.type === "error") {
      latestRef.current.onScanFailed(result.reason);
      setStep("place-card");
      return false;
    }
    return true;
  }, [setStep]);

  const scanCard = useCallback(async () => {
    if (!FLATBED_IDLE_STEPS.includes(stepRef.current)) return;
    if (hasSorter && !ignoreIrSensors && (await isModuleOneLoaded())) {
      latestRef.current.onModuleOneNotEmpty();
      return;
    }
    if (!(await scanGlass())) return;
    if (hasSorter) await waitThenHandOff();
    else handOffScannedCard();
  }, [hasSorter, ignoreIrSensors, isModuleOneLoaded, scanGlass, waitThenHandOff, handOffScannedCard]);

  const rescan = useCallback(async () => {
    if (stepRef.current !== "move-card" && stepRef.current !== "missed-card") return;
    waitTokenRef.current++;
    if (!(await scanGlass())) return;
    await waitThenHandOff();
  }, [scanGlass, waitThenHandOff]);

  const cancelWait = useCallback(() => {
    if (stepRef.current !== "move-card" && stepRef.current !== "missed-card") return;
    waitTokenRef.current++;
    discardDocumentScannerPage();
    setStep("place-card");
  }, [discardDocumentScannerPage, setStep]);

  const continueAfterMissedCard = useCallback(() => {
    if (stepRef.current !== "missed-card") return;
    void waitThenHandOff();
  }, [waitThenHandOff]);

  useEffect(() => {
    if (stepRef.current !== "identifying") return;
    if (scannerStatus === "searching" || scannerStatus === "settling") {
      sawSearchingRef.current = true;
      return;
    }
    if (sawSearchingRef.current) setStep("done");
  }, [scannerStatus, setStep]);

  useEffect(() => {
    if (isEnabled) return;
    waitTokenRef.current++;
    setStep("place-card");
  }, [isEnabled, setStep]);

  return {
    step,
    secondsLeft,
    hasSorter,
    isScanning: step === "scanning",
    scanCard: () => void scanCard(),
    rescan: () => void rescan(),
    cancelWait,
    continueAfterMissedCard,
  };
}
