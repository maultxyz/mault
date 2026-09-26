import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useNewBoardFlash } from "@/features/scanner/api/use-new-board-flash";
import { useSerial } from "@/features/scanner/api/use-serial";
import { NewBoardFlashDialog } from "@/features/scanner/components/new-board-flash-dialog";
import { SERVO_PULSE_MAX, SERVO_PULSE_MIN } from "@/lib/constants/calibration";
import { SERVO_SWEEP_STEP_MS } from "@/lib/constants/timing";
import {
  IconDeviceUsb,
  IconDeviceUsbFilled,
  IconDownload,
  IconLoader2,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const CHANNELS = Array.from({ length: 16 }, (_, i) => i);
const SWEEP_PULSES = [SERVO_PULSE_MIN, SERVO_PULSE_MAX, SERVO_PULSE_MIN];

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function ServoChannelTester() {
  const { t } = useTranslation("admin");
  const {
    isConnected,
    isReady,
    connect,
    connectBluetooth,
    disconnect,
    sendCommand,
    sendTest,
  } = useSerial();
  const [activeChannel, setActiveChannel] = useState<number | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [flashDialogOpen, setFlashDialogOpen] = useState(false);
  const { isSupported: flashSupported } = useNewBoardFlash();

  const bluetoothSupported =
    typeof navigator !== "undefined" && !!navigator.bluetooth;

  async function handleRunTest() {
    setIsTesting(true);
    try {
      const { ok, error } = await sendTest();
      if (ok) toast.success(t("servoTester.toasts.testPassed"));
      else
        toast.error(t("servoTester.toasts.testFailed"), {
          description: error ?? undefined,
        });
    } finally {
      setIsTesting(false);
    }
  }

  async function handleSweep(channel: number) {
    if (!isReady) return;
    setActiveChannel(channel);
    setIsSweeping(true);
    try {
      for (const pulse of SWEEP_PULSES) {
        const sent = await sendCommand(
          JSON.stringify({ channel, value: pulse }),
        );
        if (!sent) {
          toast.error(t("servoTester.toasts.sendFailed"));
          return;
        }
        await delay(SERVO_SWEEP_STEP_MS);
      }
    } finally {
      setIsSweeping(false);
    }
  }

  async function handleStop() {
    if (!isReady || activeChannel === null) return;
    const sent = await sendCommand(
      JSON.stringify({ channelStop: activeChannel }),
    );
    if (!sent) toast.error(t("servoTester.toasts.sendFailed"));
  }

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">{t("servoTester.heading")}</p>
        <p className="text-xs text-muted-foreground">
          {t("servoTester.description")}
        </p>
      </div>

      {!isConnected ? (
        <div className="flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" />}>
              <IconDeviceUsb />
              {t("servoTester.connectButton")}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => connect()}>
                {t("servoTester.connectUsb")}
              </DropdownMenuItem>
              {bluetoothSupported && (
                <DropdownMenuItem onClick={() => connectBluetooth()}>
                  {t("servoTester.connectBluetooth")}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {flashSupported && (
            <Button variant="ghost" onClick={() => setFlashDialogOpen(true)}>
              <IconDownload />
              {t("servoTester.flashButton")}
            </Button>
          )}
        </div>
      ) : (
        <>
          {!isReady && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={isTesting}
                onClick={handleRunTest}
              >
                {isTesting && <IconLoader2 className="animate-spin" />}
                {isTesting
                  ? t("servoTester.testing")
                  : t("servoTester.runTest")}
              </Button>
              <span className="text-xs text-foreground/70">
                {t("servoTester.testRequired")}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <Label>{t("servoTester.channelLabel")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("servoTester.sweepDescription")}
            </p>
            <div className="grid grid-cols-8 gap-2">
              {CHANNELS.map((ch) => (
                <Button
                  key={ch}
                  variant={
                    activeChannel === ch ? "outline-selected" : "outline"
                  }
                  className="px-0"
                  disabled={!isReady || isSweeping}
                  onClick={() => handleSweep(ch)}
                >
                  {activeChannel === ch && isSweeping ? (
                    <IconLoader2 className="animate-spin size-3.5" />
                  ) : (
                    ch
                  )}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!isReady || activeChannel === null}
              onClick={handleStop}
            >
              {t("servoTester.stopButton")}
            </Button>
            <Button variant="ghost" onClick={disconnect} className="ml-auto">
              <IconDeviceUsbFilled />
              {t("servoTester.disconnectButton")}
            </Button>
          </div>
        </>
      )}
      <NewBoardFlashDialog
        open={flashDialogOpen}
        onOpenChange={setFlashDialogOpen}
        onConnect={() => connect()}
      />
    </div>
  );
}
