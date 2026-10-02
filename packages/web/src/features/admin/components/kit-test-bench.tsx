import { useKitTestSession } from "@/features/admin/api/use-kit-test-session";
import { KitBoardPanel } from "@/features/admin/components/kit-board-panel";
import { KitContinuousServoPanel } from "@/features/admin/components/kit-continuous-servo-panel";
import { KitSensorPanel } from "@/features/admin/components/kit-sensor-panel";
import { KitServoBench } from "@/features/admin/components/kit-servo-bench";
import { KitTestReport } from "@/features/admin/components/kit-test-report";
import { useSerial } from "@/features/scanner/api/use-serial";

export function KitTestBench() {
  const { isConnected } = useSerial();
  const session = useKitTestSession();
  const disabled = !isConnected;

  return (
    <div className="flex flex-col gap-6">
      <KitBoardPanel session={session} disabled={disabled} />
      <KitServoBench session={session} disabled={disabled} />
      <KitContinuousServoPanel disabled={disabled} />
      <KitSensorPanel session={session} disabled={disabled} />
      <KitTestReport session={session} />
    </div>
  );
}
