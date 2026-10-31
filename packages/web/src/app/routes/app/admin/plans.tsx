import { PlanPreviewSection } from "@/features/admin/components/plan-preview-section";
import { PricingModeSection } from "@/features/admin/components/pricing-mode-section";
import { PlanSettingsManager } from "@/features/admin/components/plan-settings-manager";

export default function AdminPlansPage() {
  return (
    <>
      <PricingModeSection />
      <PlanPreviewSection />
      <PlanSettingsManager />
    </>
  );
}
