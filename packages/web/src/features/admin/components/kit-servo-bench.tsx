import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useKitChannel } from "@/features/admin/api/use-kit-channel";
import { SERVO_PULSE_MAX, SERVO_PULSE_MIN } from "@/lib/constants/calibration";
import { KIT_CENTER_PULSE, KIT_CHANNELS } from "@/lib/constants/kit-test";
import type { KitPanelProps } from "@/lib/interfaces/kit-test";
import {
  IconArrowsHorizontal,
  IconCheck,
  IconFocusCentered,
  IconPlayerStop,
  IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function KitServoBench({ session, disabled }: KitPanelProps) {
  const { t } = useTranslation("admin");
  const { drive, stop, sweep, isBusy } = useKitChannel();
  const [channel, setChannel] = useState(0);
  const [pulse, setPulse] = useState(KIT_CENTER_PULSE);
  const locked = disabled || isBusy;
  const passed = session.servoResults.filter((r) => r.verdict === "pass");
  const failed = session.servoResults.filter((r) => r.verdict === "fail");

  const driveTo = (value: number) => {
    setPulse(value);
    void drive(channel, value);
  };

  return (
    <SettingsSection
      heading={t("kitTest.servos.heading")}
      description={t("kitTest.servos.description")}
      action={
        <Button
          variant="outline"
          size="sm"
          disabled={session.servoResults.length === 0}
          onClick={session.resetServos}
        >
          {t("kitTest.servos.reset")}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
        <Label>{t("kitTest.servos.channel")}</Label>
        <div className="grid grid-cols-8 gap-2">
          {KIT_CHANNELS.map((ch) => (
            <Button
              key={ch}
              variant={channel === ch ? "outline-selected" : "outline"}
              className="px-0"
              disabled={locked}
              onClick={() => setChannel(ch)}
            >
              {ch}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button disabled={locked} onClick={() => void sweep(channel)}>
          <IconArrowsHorizontal />
          {t("kitTest.servos.sweep")}
        </Button>
        <Button
          variant="outline"
          disabled={locked}
          onClick={() => driveTo(KIT_CENTER_PULSE)}
        >
          <IconFocusCentered />
          {t("kitTest.servos.center")}
        </Button>
        <Button
          variant="outline"
          disabled={locked}
          onClick={() => driveTo(SERVO_PULSE_MIN)}
        >
          {t("kitTest.servos.min")}
        </Button>
        <Button
          variant="outline"
          disabled={locked}
          onClick={() => driveTo(SERVO_PULSE_MAX)}
        >
          {t("kitTest.servos.max")}
        </Button>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => void stop(channel)}
        >
          <IconPlayerStop />
          {t("kitTest.servos.release")}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>{t("kitTest.servos.pulse")}</Label>
          <span className="font-mono text-sm font-semibold">{pulse}</span>
        </div>
        <Slider
          min={SERVO_PULSE_MIN}
          max={SERVO_PULSE_MAX}
          step={1}
          disabled={locked}
          value={pulse}
          onValueChange={setPulse}
          onValueCommitted={(value) => void drive(channel, value)}
        />
        <p className="text-xs text-foreground/70">
          {t("kitTest.servos.centerHint", { pulse: KIT_CENTER_PULSE })}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border p-2">
        <span className="mr-auto text-sm">
          {t("kitTest.servos.verdictPrompt", { channel })}
        </span>
        <Button
          variant="outline"
          disabled={disabled}
          onClick={() => session.recordServo(channel, "pass")}
        >
          <IconCheck />
          {t("kitTest.servos.pass")}
        </Button>
        <Button
          variant="destructive"
          disabled={disabled}
          onClick={() => session.recordServo(channel, "fail")}
        >
          <IconX />
          {t("kitTest.servos.fail")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="success">
          {t("kitTest.servos.passedCount", { count: passed.length })}
        </Badge>
        <Badge variant={failed.length > 0 ? "destructive" : "outline"}>
          {t("kitTest.servos.failedCount", { count: failed.length })}
        </Badge>
      </div>

      {session.servoResults.length > 0 && (
        <ol className="flex flex-wrap gap-1.5">
          {session.servoResults.map((result, index) => (
            <li key={result.id}>
              <Badge
                variant={result.verdict === "pass" ? "outline" : "destructive"}
                title={new Date(result.testedAt).toLocaleTimeString()}
              >
                {t("kitTest.servos.historyItem", {
                  number: session.servoResults.length - index,
                  channel: result.channel,
                })}
              </Badge>
            </li>
          ))}
        </ol>
      )}
    </SettingsSection>
  );
}
