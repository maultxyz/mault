import { useKitTestSession } from "@/features/admin/api/use-kit-test-session";
import { KitBoardPanel } from "@/features/admin/components/kit-board-panel";
import { KitServoBench } from "@/features/admin/components/kit-servo-bench";
import { useSerial } from "@/features/scanner/api/use-serial";

export function KitTestBench() {
  const { isConnected } = useSerial();
  const session = useKitTestSession();

  return (
    <div className="flex flex-col gap-6">
      <KitBoardPanel />
      <KitServoBench session={session} disabled={!isConnected} />
    </div>
  );
}
