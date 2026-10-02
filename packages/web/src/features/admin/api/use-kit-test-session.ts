import { KIT_SERVO_HISTORY_LIMIT } from "@/lib/constants/kit-test";
import type {
  KitSelfTestState,
  KitSensorReading,
  KitSensorState,
  KitServoVerdict,
  KitServoResult,
  KitTestSession,
} from "@/lib/interfaces/kit-test";
import { useCallback, useState } from "react";

function sensorId(module: number | null): string {
  return module == null ? "hopper" : `module-${module}`;
}

function updateSensor(
  sensors: KitSensorState[],
  module: number | null,
  value: boolean,
): KitSensorState[] {
  const id = sensorId(module);
  const existing = sensors.find((sensor) => sensor.id === id);
  const next: KitSensorState = {
    id,
    module,
    current: value,
    seenCard: (existing?.seenCard ?? false) || value,
    seenClear: (existing?.seenClear ?? false) || !value,
  };
  return existing
    ? sensors.map((sensor) => (sensor.id === id ? next : sensor))
    : [...sensors, next];
}

export function useKitTestSession(): KitTestSession {
  const [selfTest, setSelfTest] = useState<KitSelfTestState>({
    status: "notRun",
  });
  const [servoResults, setServoResults] = useState<KitServoResult[]>([]);
  const [sensors, setSensors] = useState<KitSensorState[]>([]);

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

  const recordSensorReading = useCallback((reading: KitSensorReading) => {
    setSensors((prev) => {
      let next = prev;
      reading.ir.forEach((value, index) => {
        next = updateSensor(next, index + 1, value);
      });
      if (reading.hopper != null)
        next = updateSensor(next, null, reading.hopper);
      return next;
    });
  }, []);

  return {
    selfTest,
    setSelfTest,
    servoResults,
    recordServo,
    resetServos: useCallback(() => setServoResults([]), []),
    sensors,
    recordSensorReading,
    resetSensors: useCallback(() => setSensors([]), []),
  };
}
