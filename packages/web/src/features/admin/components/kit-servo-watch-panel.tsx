import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KitWatchBoxEditor } from "@/features/admin/components/kit-watch-box-editor";
import type { KitServoWatchPanelProps } from "@/lib/interfaces/kit-test";
import { IconCameraOff, IconEraser } from "@tabler/icons-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function KitServoWatchPanel({
  watchCamera,
  channels,
  isRunning,
  disabled,
}: KitServoWatchPanelProps) {
  const { t } = useTranslation("admin");
  const cameraSelectId = useId();
  const boxChannelLabelId = useId();
  const [chosenChannel, setChosenChannel] = useState<number | null>(null);
  const activeChannel =
    chosenChannel !== null && channels.includes(chosenChannel)
      ? chosenChannel
      : (channels[0] ?? null);
  const {
    cameras,
    selectedCameraId,
    stream,
    isStarting,
    hasError,
    boxes,
    startCamera,
    stopCamera,
    clearBox,
  } = watchCamera;
  const isEditingLocked = disabled || isRunning;
  const selectedCameraLabel =
    cameras.find((camera) => camera.deviceId === selectedCameraId)?.label ||
    t("kitTest.stress.camera.unnamedCamera");

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-foreground/6 p-2">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold">
          {t("kitTest.stress.camera.heading")}
        </span>
        <p className="text-xs text-foreground/70">
          {t("kitTest.stress.camera.description")}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-1.5">
        <div className="flex flex-col gap-1">
          <Label htmlFor={cameraSelectId}>
            {t("kitTest.stress.camera.camera")}
          </Label>
          <Select
            value={stream ? selectedCameraId : null}
            onValueChange={(cameraId) => {
              if (cameraId) void startCamera(cameraId);
            }}
            disabled={isRunning || isStarting || cameras.length === 0}
          >
            <SelectTrigger id={cameraSelectId} className="w-64 max-w-full">
              <SelectValue
                placeholder={
                  cameras.length === 0
                    ? t("kitTest.stress.camera.noCameras")
                    : t("kitTest.stress.camera.pickCamera")
                }
              >
                {stream ? selectedCameraLabel : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {cameras.map((camera, index) => (
                <SelectItem key={camera.deviceId} value={camera.deviceId}>
                  {camera.label ||
                    t("kitTest.stress.camera.cameraNumber", {
                      number: index + 1,
                    })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {stream && (
          <Button variant="outline" disabled={isRunning} onClick={stopCamera}>
            <IconCameraOff />
            {t("kitTest.stress.camera.turnOff")}
          </Button>
        )}
      </div>

      {hasError && (
        <Callout variant="error">{t("kitTest.stress.camera.startFailed")}</Callout>
      )}

      {stream && (
        <>
          {channels.length === 0 ? (
            <p className="text-sm">{t("kitTest.stress.camera.pickChannels")}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span id={boxChannelLabelId} className="text-sm">
                {t("kitTest.stress.camera.boxFor")}
              </span>
              <div
                role="group"
                aria-labelledby={boxChannelLabelId}
                className="flex flex-wrap gap-1.5"
              >
                {channels.map((channel) => (
                  <Button
                    key={channel}
                    variant={
                      channel === activeChannel ? "outline-selected" : "outline"
                    }
                    aria-pressed={channel === activeChannel}
                    disabled={isEditingLocked}
                    onClick={() => setChosenChannel(channel)}
                  >
                    {boxes[channel]
                      ? t("kitTest.stress.camera.channelWithBox", { channel })
                      : t("kitTest.stress.channel", { channel })}
                  </Button>
                ))}
              </div>
              {activeChannel !== null && boxes[activeChannel] && (
                <Button
                  variant="ghost"
                  className="ml-auto"
                  disabled={isEditingLocked}
                  onClick={() => clearBox(activeChannel)}
                >
                  <IconEraser />
                  {t("kitTest.stress.camera.clearBox")}
                </Button>
              )}
            </div>
          )}
          <KitWatchBoxEditor
            watchCamera={watchCamera}
            channels={channels}
            activeChannel={activeChannel}
            disabled={isEditingLocked}
          />
        </>
      )}
    </div>
  );
}
