import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNewBoardFlash } from "@/features/scanner/api/use-new-board-flash";
import { useSerial } from "@/features/scanner/api/use-serial";
import { NewBoardFlashDialog } from "@/features/scanner/components/new-board-flash-dialog";
import type { KitPanelProps } from "@/lib/interfaces/kit-test";
import {
  IconDeviceUsb,
  IconDownload,
  IconLoader2,
  IconPlugX,
  IconStethoscope,
} from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function KitBoardPanel({ session }: KitPanelProps) {
  const { t } = useTranslation("admin");
  const {
    isConnected,
    firmwareVersion,
    board,
    deviceId,
    transport,
    connect,
    connectBluetooth,
    disconnect,
    sendTest,
  } = useSerial();
  const { isSupported: flashSupported } = useNewBoardFlash();
  const [flashDialogOpen, setFlashDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const bluetoothSupported =
    typeof navigator !== "undefined" && !!navigator.bluetooth;
  const { selfTest } = session;

  const handleSelfTest = async () => {
    setIsTesting(true);
    try {
      const { ok, error } = await sendTest();
      session.setSelfTest(
        ok
          ? { status: "passed", at: Date.now() }
          : { status: "failed", at: Date.now(), error },
      );
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <SettingsSection
      heading={t("kitTest.board.heading")}
      description={t("kitTest.board.description")}
      action={
        isConnected ? (
          <Button variant="outline" size="sm" onClick={() => disconnect()}>
            <IconPlugX />
            {t("kitTest.board.disconnect")}
          </Button>
        ) : (
          <div className="flex gap-2">
            {flashSupported && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFlashDialogOpen(true)}
              >
                <IconDownload />
                {t("kitTest.board.flash")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" />}>
                <IconDeviceUsb />
                {t("kitTest.board.connect")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => connect({ skipAutoTest: true })}
                >
                  {t("kitTest.board.connectUsb")}
                </DropdownMenuItem>
                {bluetoothSupported && (
                  <DropdownMenuItem
                    onClick={() => connectBluetooth({ skipAutoTest: true })}
                  >
                    {t("kitTest.board.connectBluetooth")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      }
    >
      {isConnected ? (
        <div className="flex flex-wrap items-center gap-2">
          {board && <Badge variant="outline">{board}</Badge>}
          {transport && <Badge variant="outline">{transport}</Badge>}
          <Badge variant="outline">
            {firmwareVersion
              ? t("kitTest.board.firmware", { version: firmwareVersion })
              : t("kitTest.board.firmwareUnknown")}
          </Badge>
          {deviceId && (
            <Badge variant="outline" className="font-mono">
              {deviceId}
            </Badge>
          )}
        </div>
      ) : (
        <p className="text-sm text-foreground/70">
          {t("kitTest.board.notConnected")}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={!isConnected || isTesting}
          onClick={handleSelfTest}
        >
          {isTesting ? (
            <IconLoader2 className="animate-spin" />
          ) : (
            <IconStethoscope />
          )}
          {isTesting
            ? t("kitTest.board.testing")
            : t("kitTest.board.runSelfTest")}
        </Button>
        {selfTest.status === "passed" && (
          <Badge variant="success">{t("kitTest.board.selfTestPassed")}</Badge>
        )}
        {selfTest.status === "failed" && (
          <Badge variant="destructive">
            {t("kitTest.board.selfTestFailed")}
          </Badge>
        )}
        {selfTest.status === "failed" && selfTest.error && (
          <span className="text-xs text-destructive">{selfTest.error}</span>
        )}
      </div>

      <NewBoardFlashDialog
        open={flashDialogOpen}
        onOpenChange={setFlashDialogOpen}
        onConnect={() => connect({ skipAutoTest: true })}
      />
    </SettingsSection>
  );
}
