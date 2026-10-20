import { DevicePlayground } from "@/features/admin/components/device-playground";
import { KitTestBench } from "@/features/admin/components/kit-test-bench";
import { SessionLock } from "@/features/scanner/components/session-lock";

export default function AdminHardwarePage() {
  return (
    <SessionLock bannerClassName="mb-4 rounded-lg border">
      <div className="flex flex-col gap-6">
        <KitTestBench />

        <DevicePlayground />
      </div>
    </SessionLock>
  );
}
