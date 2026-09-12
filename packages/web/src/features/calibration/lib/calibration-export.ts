import {
  calibrationExportSchema,
  type CalibrationExport,
} from "@/schemas/calibration-export.schema";
import type {
  BinRoute,
  ChannelLayout,
  FeederCalibration,
  ModuleConfig,
} from "@magic-vault/shared";

export function buildCalibrationExport({
  channelLayout,
  moduleCount,
  configs,
  feederConfig,
  binRoutes,
}: {
  channelLayout: ChannelLayout;
  moduleCount: number;
  configs: ModuleConfig[];
  feederConfig: FeederCalibration;
  binRoutes: BinRoute[];
}): CalibrationExport {
  return {
    formatVersion: 1,
    moduleCount,
    channelLayout,
    modules: configs,
    feeder: feederConfig,
    binRoutes,
  };
}

export function parseCalibrationExport(text: string): CalibrationExport {
  return calibrationExportSchema.parse(JSON.parse(text));
}

export function downloadCalibrationExport(data: CalibrationExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `magic-vault-calibration-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
