import { PlanPreviewSection } from "@/features/admin/components/plan-preview-section";
import { PricingModeSection } from "@/features/admin/components/pricing-mode-section";
import { PlanSettingsManager } from "@/features/admin/components/plan-settings-manager";
import { SubscriptionSummaryPanel } from "@/features/admin/components/subscription-summary-panel";

export default function AdminPlansPage() {
  return (
    <>
      <SubscriptionSummaryPanel />
      <PricingModeSection />
      <PlanPreviewSection />
      <PlanSettingsManager />
    </>
  );
}
