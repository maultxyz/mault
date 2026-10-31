import { PlanPreviewSection } from "@/features/admin/components/plan-preview-section";
import { PlanSettingsManager } from "@/features/admin/components/plan-settings-manager";

export default function AdminPlansPage() {
  return (
    <>
      <PlanPreviewSection />
      <PlanSettingsManager />
    </>
  );
}
