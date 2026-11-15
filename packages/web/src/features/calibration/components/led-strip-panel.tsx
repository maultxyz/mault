import { Callout } from "@/components/callout";
import { SettingsSection } from "@/components/settings-section";
import { SliderField } from "@/components/slider-field";
import { Button } from "@/components/ui/button";
import { useLedStripControl } from "@/features/calibration/api/use-led-strip-control";
import {
  LED_STRIP_CHANNELS,
  LED_STRIP_FULL_WHITE_COLOR,
  LED_STRIP_OFF_COLOR,
} from "@/lib/constants/calibration";
import { LED_STRIP_CHANNEL_MAX } from "@magic-vault/shared";
import { IconAlertTriangle, IconBulb, IconBulbOff } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function LedStripPanel() {
  const { t } = useTranslation("calibration");
  const { color, status, isReady, isSupportedBoard, setChannel, setColor } =
    useLedStripControl();
  if (!isSupportedBoard) return null;

  return (
    <SettingsSection
      heading={t("ledStrip.heading")}
      description={t("ledStrip.description")}
    >
      <div className="flex max-w-sm flex-col gap-3">
        {LED_STRIP_CHANNELS.map((channel) => (
          <SliderField
            key={channel}
            label={t(`ledStrip.channels.${channel}`)}
            valueLabel={color[channel]}
            min={0}
            max={LED_STRIP_CHANNEL_MAX}
            value={color[channel]}
            disabled={!isReady}
            onValueChange={(value) => setChannel(channel, value)}
          />
        ))}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            disabled={!isReady}
            onClick={() => setColor(LED_STRIP_FULL_WHITE_COLOR)}
          >
            <IconBulb />
            {t("ledStrip.fullWhite")}
          </Button>
          <Button
            variant="outline"
            disabled={!isReady}
            onClick={() => setColor(LED_STRIP_OFF_COLOR)}
          >
            <IconBulbOff />
            {t("ledStrip.allOff")}
          </Button>
        </div>
        {status === "unsupported" && (
          <Callout variant="warning" icon={IconAlertTriangle}>
            {t("ledStrip.unsupported")}
          </Callout>
        )}
        {status === "failed" && (
          <Callout variant="error" icon={IconAlertTriangle}>
            {t("ledStrip.failed")}
          </Callout>
        )}
      </div>
    </SettingsSection>
  );
}
