import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import {
  isSensorVerified,
  parseSensorReading,
} from "@/features/admin/lib/kit-test";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  KIT_COMMAND_TIMEOUT_MS,
  KIT_SENSOR_POLL_MS,
} from "@/lib/constants/kit-test";
import type { KitPanelProps } from "@/lib/interfaces/kit-test";
import { cn } from "@/lib/utils";
import {
  IconCircleCheck,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function KitSensorPanel({ session, disabled }: KitPanelProps) {
  const { t } = useTranslation("admin");
  const { sendRawCommand } = useSerial();
  const [isPolling, setIsPolling] = useState(false);
  const { recordSensorReading } = session;
  const active = isPolling && !disabled;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const poll = async () => {
      const result = await sendRawCommand(
        JSON.stringify({ readIR: true }),
        KIT_COMMAND_TIMEOUT_MS,
      );
      if (cancelled) return;
      const reading = parseSensorReading(result.line);
      if (reading) recordSensorReading(reading);
      timer = setTimeout(poll, KIT_SENSOR_POLL_MS);
    };
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, sendRawCommand, recordSensorReading]);

  return (
    <SettingsSection
      heading={t("kitTest.sensors.heading")}
      description={t("kitTest.sensors.description")}
      action={
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={session.sensors.length === 0}
            onClick={session.resetSensors}
          >
            {t("kitTest.sensors.reset")}
          </Button>
          <Button
            size="sm"
            variant={active ? "outline-selected" : "default"}
            disabled={disabled}
            onClick={() => setIsPolling((prev) => !prev)}
          >
            {active ? <IconPlayerPause /> : <IconPlayerPlay />}
            {active ? t("kitTest.sensors.stop") : t("kitTest.sensors.start")}
          </Button>
        </div>
      }
    >
      {session.sensors.length === 0 ? (
        <p className="text-sm text-foreground/70">
          {t("kitTest.sensors.empty")}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {session.sensors.map((sensor) => (
            <div
              key={sensor.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border p-2",
                sensor.current && "border-primary bg-primary/5",
              )}
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {sensor.module == null
                    ? t("kitTest.sensors.hopper")
                    : t("kitTest.sensors.module", { module: sensor.module })}
                </span>
                <span className="text-xs text-foreground/70">
                  {sensor.current
                    ? t("kitTest.sensors.card")
                    : t("kitTest.sensors.clear")}
                </span>
              </div>
              {isSensorVerified(sensor) && (
                <IconCircleCheck
                  className="size-5 shrink-0 text-green-600 dark:text-green-400"
                  aria-label={t("kitTest.sensors.verified")}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </SettingsSection>
  );
}
