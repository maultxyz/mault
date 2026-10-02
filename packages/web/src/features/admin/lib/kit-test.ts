import type {
  KitReportDevice,
  KitSensorReading,
  KitSensorState,
  KitTestSession,
} from "@/lib/interfaces/kit-test";
import type { TFunction } from "i18next";

export function parseSensorReading(
  line: string | null,
): KitSensorReading | null {
  if (!line) return null;
  try {
    const parsed = JSON.parse(line) as { ir?: unknown; hopper?: unknown };
    if (!Array.isArray(parsed.ir)) return null;
    return {
      ir: parsed.ir.map((value) => value === true),
      hopper: typeof parsed.hopper === "boolean" ? parsed.hopper : null,
    };
  } catch {
    return null;
  }
}

export function isSensorVerified(sensor: KitSensorState): boolean {
  return sensor.seenCard && sensor.seenClear;
}

export function buildKitReport(
  t: TFunction<"admin">,
  session: KitTestSession,
  device: KitReportDevice,
): string {
  const passed = session.servoResults.filter((r) => r.verdict === "pass");
  const failed = session.servoResults.filter((r) => r.verdict === "fail");
  const selfTest = session.selfTest;
  const lines = [
    t("kitTest.report.title"),
    t("kitTest.report.date", { date: new Date().toLocaleString() }),
    t("kitTest.report.board", {
      board: device.board ?? "?",
      version: device.firmwareVersion ?? "?",
      id: device.deviceId ?? "?",
    }),
    t(`kitTest.report.selfTest.${selfTest.status}`, {
      error: selfTest.status === "failed" ? (selfTest.error ?? "") : "",
    }),
    t("kitTest.report.servos", {
      passed: passed.length,
      failed: failed.length,
    }),
  ];
  if (failed.length > 0) {
    lines.push(
      t("kitTest.report.failedChannels", {
        channels: failed.map((r) => r.channel).join(", "),
      }),
    );
  }
  for (const sensor of session.sensors) {
    const name =
      sensor.module == null
        ? t("kitTest.sensors.hopper")
        : t("kitTest.sensors.module", { module: sensor.module });
    lines.push(
      isSensorVerified(sensor)
        ? t("kitTest.report.sensorVerified", { name })
        : t("kitTest.report.sensorUnverified", { name }),
    );
  }
  return lines.join("\n");
}
