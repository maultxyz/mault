import { ServoChannelTester } from "@/features/admin/components/servo-channel-tester";
import { SessionLock } from "@/features/scanner/components/session-lock";

export default function AdminServosPage() {
  return (
    <SessionLock bannerClassName="mb-4 rounded-lg border">
      <ServoChannelTester />
    </SessionLock>
  );
}
