import { KIT_SERVO_HISTORY_LIMIT } from "@/lib/constants/kit-test";
import type {
  KitServoVerdict,
  KitServoResult,
  KitTestSession,
} from "@/lib/interfaces/kit-test";
import { useCallback, useState } from "react";

export function useKitTestSession(): KitTestSession {
  const [servoResults, setServoResults] = useState<KitServoResult[]>([]);

  const recordServo = useCallback(
    (channel: number, verdict: KitServoVerdict) => {
      setServoResults((prev) =>
        [
          { id: crypto.randomUUID(), channel, verdict, testedAt: Date.now() },
          ...prev,
        ].slice(0, KIT_SERVO_HISTORY_LIMIT),
      );
    },
    [],
  );

  return {
    servoResults,
    recordServo,
    resetServos: useCallback(() => setServoResults([]), []),
  };
}
