import { KitTestBench } from "@/features/admin/components/kit-test-bench";
import { SessionLock } from "@/features/scanner/components/session-lock";

export default function AdminServosPage() {
  return (
    <SessionLock bannerClassName="mb-4 rounded-lg border">
      <KitTestBench />
    </SessionLock>
  );
}
