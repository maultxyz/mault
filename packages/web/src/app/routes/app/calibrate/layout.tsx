import { StaleDeviceDialog } from "@/components/stale-device-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCalibrationPage } from "@/features/calibration/api/use-calibration-page";
import { CalibrationTour } from "@/features/calibration/components/calibration-tour";
import type { CalibrationSection } from "@/lib/interfaces/calibration";
import { cn } from "@/lib/utils";
import {
  IconAdjustmentsHorizontal,
  IconClipboard,
  IconDeviceUsb,
  IconDeviceUsbFilled,
  IconDownload,
  IconFocus2,
  IconLoader2,
  IconSettingsCog,
  IconUpload,
} from "@tabler/icons-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";

const SECTION_PATHS: Record<CalibrationSection, string> = {
  modules: "modules",
  scanRegion: "scan-region",
  calibration: "calibration",
};

const PATH_SECTIONS: Record<string, CalibrationSection> = {
  modules: "modules",
  "scan-region": "scanRegion",
  calibration: "calibration",
};

type CalibrationPageState = ReturnType<typeof useCalibrationPage>;

export function useCalibrationOutletContext() {
  return useOutletContext<CalibrationPageState>();
}

export default function CalibrateLayout() {
  const { t } = useTranslation("calibration");
  const location = useLocation();
  const navigate = useNavigate();

  const activePathSegment = location.pathname.split("/").pop() ?? "modules";
  const section = PATH_SECTIONS[activePathSegment] ?? "modules";
  const setSection = (next: CalibrationSection) =>
    navigate(`/app/calibrate/${SECTION_PATHS[next]}`);

  const sectionNavItems: {
    value: CalibrationSection;
    icon: React.ReactNode;
    label: string;
  }[] = [
    {
      value: "modules",
      icon: <IconAdjustmentsHorizontal size={16} />,
      label: t("sections.moduleSetup"),
    },
    {
      value: "scanRegion",
      icon: <IconFocus2 size={16} />,
      label: t("sections.scanRegion"),
    },
    {
      value: "calibration",
      icon: <IconSettingsCog size={16} />,
      label: t("sections.calibration"),
    },
  ];

  const calibrationPage = useCalibrationPage();
  const {
    isConnected,
    connect,
    connectBluetooth,
    staleDialogOpen,
    onDismissStaleDialog,
    onRunTest,
    onCalibrateFirst,
    disconnect,
    activeBin,
    isTesting,
    isUnconfigured,
    handleTest,
    handleFeed,
    isSampleRunning,
    handleCopyCalibration,
    handleExportConfig,
    handleImportConfig,
    isImporting,
  } = calibrationPage;

  const importInputRef = useRef<HTMLInputElement>(null);
  const bluetoothSupported =
    typeof navigator !== "undefined" && !!navigator.bluetooth;

  return (
    <div className="grid grid-cols-12 flex-1 min-h-0 overflow-hidden">
      <nav
        className="col-span-2 min-h-0 h-full overflow-y-auto flex flex-col border-r p-2 gap-2 bg-sidebar/70"
        data-tour="calibration-sections"
      >
        {sectionNavItems.map((item) => (
          <NavLink
            key={item.value}
            to={SECTION_PATHS[item.value]}
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: isActive ? "secondary" : "ghost" }),
                "w-full justify-start gap-2 px-2.5 border-0",
              )
            }
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="col-span-10 min-h-0 h-full overflow-y-auto @container p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          <div
            className="flex items-center gap-2 shrink-0"
            data-tour="calibration-connect"
          >
            {isConnected ? (
              <Button variant="outline" onClick={disconnect}>
                <IconDeviceUsbFilled />
                {t("calibratePage.disconnect")}
              </Button>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button />}>
                  <IconDeviceUsb />
                  {t("calibratePage.connectDevice")}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={connect}>
                    {t("calibratePage.connectUsb")}
                  </DropdownMenuItem>
                  {bluetoothSupported && (
                    <DropdownMenuItem onClick={connectBluetooth}>
                      {t("calibratePage.connectBluetooth")}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button
              variant="outline"
              disabled={!isConnected || isTesting || isUnconfigured}
              onClick={handleTest}
            >
              {isTesting
                ? t("calibratePage.testing")
                : t("calibratePage.runTest")}
            </Button>
            <Button
              variant="outline"
              disabled={!isConnected || activeBin !== null || isSampleRunning}
              onClick={handleFeed}
            >
              {t("binRoutingControls.feed")}
            </Button>
            {isUnconfigured && (
              <span className="text-sm text-muted-foreground">
                {t("calibratePage.calibrateBeforeTest")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={handleCopyCalibration}>
              <IconClipboard />
              {t("calibratePage.copyCalibration")}
            </Button>
            <Button variant="outline" onClick={handleExportConfig}>
              <IconDownload />
              {t("calibratePage.exportConfig")}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleImportConfig(file);
              }}
            />
            <Button
              variant="outline"
              disabled={isImporting}
              onClick={() => importInputRef.current?.click()}
            >
              {isImporting ? (
                <IconLoader2 className="animate-spin" />
              ) : (
                <IconUpload />
              )}
              {isImporting
                ? t("calibratePage.importing")
                : t("calibratePage.importConfig")}
            </Button>
            <CalibrationTour section={section} setSection={setSection} />
          </div>
        </div>

        <Outlet context={calibrationPage} />
      </div>

      <StaleDeviceDialog
        open={staleDialogOpen}
        onOpenChange={(open) => {
          if (!open) onDismissStaleDialog();
        }}
        onRunTest={onRunTest}
        onCalibrateFirst={onCalibrateFirst}
      />
    </div>
  );
}
