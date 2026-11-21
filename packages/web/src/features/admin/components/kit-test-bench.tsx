import { useKitServoStressTest } from "@/features/admin/api/use-kit-servo-stress-test";
import { useKitServoWatchCamera } from "@/features/admin/api/use-kit-servo-watch-camera";
import { useKitTestSession } from "@/features/admin/api/use-kit-test-session";
import { KitBoardPanel } from "@/features/admin/components/kit-board-panel";
import { KitLedBench } from "@/features/admin/components/kit-led-bench";
import { KitRawCommandConsole } from "@/features/admin/components/kit-raw-command-console";
import { KitServoBench } from "@/features/admin/components/kit-servo-bench";
import { KitServoStressBench } from "@/features/admin/components/kit-servo-stress-bench";
import { useChannelLayout } from "@/features/calibration/api/use-channel-layout";
import { useDevice } from "@/features/calibration/api/use-device";
import { useModuleConfigs } from "@/features/calibration/api/use-module-configs";
import { useSerial } from "@/features/scanner/api/use-serial";
import type { KitStressPlanInputs } from "@/lib/interfaces/kit-test";
import { useMemo } from "react";

export function KitTestBench() {
  const { isConnected } = useSerial();
  const session = useKitTestSession();
  const watchCamera = useKitServoWatchCamera();
  const stressTest = useKitServoStressTest(watchCamera);
  const isBenchLocked = !isConnected || stressTest.isRunning;
  const channelLayout = useChannelLayout();
  const device = useDevice();
  const { configs } = useModuleConfigs();
  const planInputs = useMemo<KitStressPlanInputs>(
    () => ({
      channelLayout,
      moduleCalibrations: configs,
      hasSavedCalibration: !!device,
    }),
    [channelLayout, configs, device],
  );

  return (
    <div className="flex flex-col gap-6 md:gap-2">
      <KitBoardPanel />
      <KitServoBench session={session} disabled={isBenchLocked} />
      <KitServoStressBench
        stressTest={stressTest}
        watchCamera={watchCamera}
        planInputs={planInputs}
        disabled={!isConnected}
      />
      <KitLedBench disabled={isBenchLocked} />
      <KitRawCommandConsole disabled={!isConnected} />
    </div>
  );
}
