import { ApiUsagePanel } from "@/features/admin/components/api-usage-panel";
import { RollbarTestPanel } from "@/features/admin/components/rollbar-test-panel";

export default function AdminDeveloperPage() {
  return (
    <>
      <ApiUsagePanel />
      <RollbarTestPanel />
    </>
  );
}
