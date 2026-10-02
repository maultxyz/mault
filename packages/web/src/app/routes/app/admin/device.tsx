import { DevicePlayground } from "@/features/admin/components/device-playground";
import { SessionLock } from "@/features/scanner/components/session-lock";

export default function AdminDevicePage() {
  return (
    <SessionLock bannerClassName="mb-4 rounded-lg border">
      <DevicePlayground />
    </SessionLock>
  );
}
