import { ApiUsagePanel } from "@/features/admin/components/api-usage-panel";
import { ErrorReportingTestPanel } from "@/features/admin/components/error-reporting-test-panel";

export default function AdminDeveloperPage() {
  return (
    <>
      <ApiUsagePanel />
      <ErrorReportingTestPanel />
    </>
  );
}
