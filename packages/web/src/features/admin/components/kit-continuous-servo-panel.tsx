import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useKitChannel } from "@/features/admin/api/use-kit-channel";
import {
  KIT_CHANNELS,
  KIT_SPIN_FORWARD_PULSE,
  KIT_SPIN_REVERSE_PULSE,
} from "@/lib/constants/kit-test";
import type { KitContinuousServoPanelProps } from "@/lib/interfaces/kit-test";
import {
  IconPlayerStop,
  IconRotate,
  IconRotateClockwise,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function KitContinuousServoPanel({
  disabled,
}: KitContinuousServoPanelProps) {
  const { t } = useTranslation("admin");
  const { drive, stop, isBusy } = useKitChannel();
  const [channel, setChannel] = useState(KIT_CHANNELS.length - 1);

  return (
    <SettingsSection
      heading={t("kitTest.continuous.heading")}
      description={t("kitTest.continuous.description")}
    >
      <div className="flex flex-col gap-2">
        <Label>{t("kitTest.servos.channel")}</Label>
        <div className="grid grid-cols-8 gap-2">
          {KIT_CHANNELS.map((ch) => (
            <Button
              key={ch}
              variant={channel === ch ? "outline-selected" : "outline"}
              className="px-0"
              disabled={disabled || isBusy}
              onClick={() => setChannel(ch)}
            >
              {ch}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={disabled || isBusy}
          onClick={() => void drive(channel, KIT_SPIN_FORWARD_PULSE)}
        >
          <IconRotateClockwise />
          {t("kitTest.continuous.forward")}
        </Button>
        <Button
          variant="outline"
          disabled={disabled || isBusy}
          onClick={() => void drive(channel, KIT_SPIN_REVERSE_PULSE)}
        >
          <IconRotate />
          {t("kitTest.continuous.reverse")}
        </Button>
        <Button
          variant="destructive"
          disabled={disabled}
          onClick={() => void stop(channel)}
        >
          <IconPlayerStop />
          {t("kitTest.continuous.stop")}
        </Button>
      </div>
    </SettingsSection>
  );
}
