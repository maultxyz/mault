import { SettingsSection } from "@/components/settings-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeviceCommandCard } from "@/features/admin/components/device-command-card";
import { DeviceCommLog } from "@/features/admin/components/device-comm-log";
import { DeviceRawConsole } from "@/features/admin/components/device-raw-console";
import { DeviceStopBar } from "@/features/admin/components/device-stop-bar";
import { useSerial } from "@/features/scanner/api/use-serial";
import {
  DEVICE_COMMAND_GROUPS,
  DEVICE_COMMANDS,
} from "@/lib/constants/device-playground";
import {
  IconAlertTriangle,
  IconDeviceUsb,
  IconPlugX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DevicePlayground() {
  const { t } = useTranslation("admin");
  const {
    isConnected,
    isReady,
    firmwareVersion,
    board,
    transport,
    connect,
    connectBluetooth,
    disconnect,
  } = useSerial();
  const bluetoothSupported =
    typeof navigator !== "undefined" && !!navigator.bluetooth;
  const disabled = !isConnected;

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        heading={t("devicePlayground.heading")}
        description={t("devicePlayground.description")}
        action={
          isConnected ? (
            <Button variant="outline" size="sm" onClick={() => disconnect()}>
              <IconPlugX />
              {t("devicePlayground.disconnect")}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="sm" />}>
                <IconDeviceUsb />
                {t("devicePlayground.connect")}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => connect()}>
                  {t("devicePlayground.connectUsb")}
                </DropdownMenuItem>
                {bluetoothSupported && (
                  <DropdownMenuItem onClick={() => connectBluetooth()}>
                    {t("devicePlayground.connectBluetooth")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={isConnected ? "success" : "outline"}>
            {isConnected
              ? t("devicePlayground.statusConnected")
              : t("devicePlayground.statusDisconnected")}
          </Badge>
          {isConnected && (
            <>
              {transport && <Badge variant="outline">{transport}</Badge>}
              {board && <Badge variant="outline">{board}</Badge>}
              <Badge variant="outline">
                {firmwareVersion
                  ? t("devicePlayground.firmware", { version: firmwareVersion })
                  : t("devicePlayground.firmwareUnknown")}
              </Badge>
              <Badge variant={isReady ? "success" : "destructive"}>
                {isReady
                  ? t("devicePlayground.selfTestPassed")
                  : t("devicePlayground.selfTestPending")}
              </Badge>
            </>
          )}
        </div>
        <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
          <IconAlertTriangle size={14} className="mt-0.5 shrink-0" />
          {t("devicePlayground.warning")}
        </p>
      </SettingsSection>

      <DeviceStopBar disabled={disabled} />

      {DEVICE_COMMAND_GROUPS.map((group) => (
        <SettingsSection
          key={group}
          heading={t(`devicePlayground.groups.${group}`)}
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {DEVICE_COMMANDS.filter((command) => command.group === group).map(
              (command) => (
                <DeviceCommandCard
                  key={command.id}
                  command={command}
                  disabled={disabled}
                />
              ),
            )}
          </div>
        </SettingsSection>
      ))}

      <DeviceRawConsole disabled={disabled} />
      <DeviceCommLog />
    </div>
  );
}
