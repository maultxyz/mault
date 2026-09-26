import { SectionNav } from "@/components/section-nav";
import { StaleDeviceDialog } from "@/components/stale-device-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCalibrationPage } from "@/features/calibration/api/use-calibration-page";
import { CalibrationTour } from "@/features/calibration/components/calibration-tour";
import type { CalibrationSection } from "@/lib/interfaces/calibration";
import type { SectionNavItem } from "@/lib/interfaces/nav";
import {
  IconAdjustmentsHorizontal,
  IconChevronDown,
  IconClipboard,
  IconDeviceUsb,
  IconDeviceUsbFilled,
  IconDownload,
  IconFileSettings,
  IconFocus2,
  IconLoader2,
  IconSettingsCog,
  IconUpload,
} from "@tabler/icons-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
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

  const sectionNavItems: SectionNavItem[] = [
    {
      to: SECTION_PATHS.modules,
      icon: <IconAdjustmentsHorizontal size={16} />,
      label: t("sections.moduleSetup"),
    },
    {
      to: SECTION_PATHS.scanRegion,
      icon: <IconFocus2 size={16} />,
      label: t("sections.scanRegion"),
    },
    {
      to: SECTION_PATHS.calibration,
      icon: <IconSettingsCog size={16} />,
      label: t("sections.calibration"),
    },
  ];

  const calibrationPage = useCalibrationPage();
  const {
    isConnected,
    isReady,
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
    handleDropCard,
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden lg:grid lg:grid-cols-12">
      <SectionNav
        title={t("page.title")}
        subtitle={t("page.subtitle")}
        items={sectionNavItems}
        className="lg:col-span-2"
        data-tour="calibration-sections"
      />

      <div className="flex-1 lg:col-span-10 min-h-0 lg:h-full overflow-y-auto @container p-4 pt-0 flex flex-col gap-4">
        <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b bg-background/80 p-2 backdrop-blur-md">
          <div
            className="flex flex-wrap items-center gap-2"
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
              disabled={!isReady || activeBin !== null || isSampleRunning}
              onClick={handleFeed}
            >
              {t("binRoutingControls.feed")}
            </Button>
            <Button
              variant="outline"
              disabled={!isReady || activeBin !== null || isSampleRunning}
              onClick={handleDropCard}
            >
              {t("binRoutingControls.dropCard")}
            </Button>
            {isUnconfigured ? (
              <span className="text-sm text-foreground/70">
                {t("calibratePage.calibrateBeforeTest")}
              </span>
            ) : (
              isConnected &&
              !isReady && (
                <span className="text-xs text-foreground/70">
                  {t("calibratePage.testBeforeControls")}
                </span>
              )
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" />}>
                {isImporting ? (
                  <IconLoader2 className="animate-spin" />
                ) : (
                  <IconFileSettings />
                )}
                {isImporting
                  ? t("calibratePage.importing")
                  : t("calibratePage.configMenu")}
                <IconChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopyCalibration}>
                  <IconClipboard />
                  {t("calibratePage.copyCalibration")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportConfig}>
                  <IconDownload />
                  {t("calibratePage.exportConfig")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isImporting}
                  onClick={() => importInputRef.current?.click()}
                >
                  <IconUpload />
                  {t("calibratePage.importConfig")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
