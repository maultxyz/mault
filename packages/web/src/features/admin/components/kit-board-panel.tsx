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
import { IconDeviceUsb, IconDownload, IconPlugX } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isWebBluetoothSupported } from "@/lib/web-bluetooth";

export function KitBoardPanel() {
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
  } = useSerial();
  const { isSupported: flashSupported } = useNewBoardFlash();
  const [flashDialogOpen, setFlashDialogOpen] = useState(false);
  const bluetoothSupported = isWebBluetoothSupported();

  return (
    <SettingsSection
      heading={t("kitTest.board.heading")}
      description={t("kitTest.board.description")}
      action={
        isConnected ? (
          <Button variant="outline" onClick={() => disconnect()}>
            <IconPlugX />
            {t("kitTest.board.disconnect")}
          </Button>
        ) : (
          <div className="flex gap-1.5">
            {flashSupported && (
              <Button
                variant="outline"
                onClick={() => setFlashDialogOpen(true)}
              >
                <IconDownload />
                {t("kitTest.board.flash")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button />}>
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

      <NewBoardFlashDialog
        open={flashDialogOpen}
        onOpenChange={setFlashDialogOpen}
        onConnect={() => connect({ skipAutoTest: true })}
      />
    </SettingsSection>
  );
}
