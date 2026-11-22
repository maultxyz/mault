import { ApiUsagePanel } from "@/features/admin/components/api-usage-panel";
import { ErrorReportingTestPanel } from "@/features/admin/components/error-reporting-test-panel";
import { ServerCachesPanel } from "@/features/admin/components/server-caches-panel";

export default function AdminDeveloperPage() {
  return (
    <>
      <ApiUsagePanel />
      <ServerCachesPanel />
      <ErrorReportingTestPanel />
    </>
  );
}
