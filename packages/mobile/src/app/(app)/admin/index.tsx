import { router } from "expo-router";
import { PRICE_SOURCE_FIELDS } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";
import { ListGroup } from "@/components/ui/list-group";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { AdminGate } from "@/features/admin/components/admin-gate";
import { SectionHeader } from "@/components/ui/section-header";
import { useToast } from "@/components/ui/toast-provider";
import {
  displayedScanIdForGiftReveal,
  isScanGiftWrapped,
  showScanGiftReveal,
} from "@/features/scanner/lib/scan-gift-reveal-store";
import { usePricing } from "@/hooks/use-pricing";
import { useRole } from "@/hooks/use-role";
import { SCAN_GIFT_REVEAL_DEBUG_SAMPLE } from "@/lib/constants/scan-gift-reveal";
import { ADMIN_SECTIONS } from "@/lib/constants/admin";

export default function AdminScreen() {
  const { t } = useTranslation();
  const { isAdmin } = useRole();
  const pricing = usePricing();
  const { showToast } = useToast();
  const simulateGiftReveal = () => {
    const scanId = displayedScanIdForGiftReveal();
    if (scanId) {
      showScanGiftReveal({
        ...SCAN_GIFT_REVEAL_DEBUG_SAMPLE,
        scanId,
        currency: PRICE_SOURCE_FIELDS[pricing.source].currency,
      });
    }
    const isWrapped = !!scanId && isScanGiftWrapped(scanId);
    showToast({
      message: t(isWrapped ? "admin.debug.simulateGiftReveal.wrapped" : "admin.debug.simulateGiftReveal.scanFirst"),
      tone: isWrapped ? "success" : "default",
    });
  };
  return (
    <AdminGate>
      <Screen header={<PageHeader title={t("admin.title")} subtitle={t("admin.subtitle")} onBack={() => router.back()} />}>
        <ListGroup>
          {ADMIN_SECTIONS.filter((section) => isAdmin || !section.requiresPlatformAdmin).map((section) => (
            <ListRow
              key={section.key}
              icon={section.icon}
              title={t(`admin.sections.${section.key}.title`)}
              subtitle={t(`admin.sections.${section.key}.subtitle`)}
              onPress={() => router.push(section.route)}
            />
          ))}
        </ListGroup>
        <SectionHeader title={t("admin.debug.title")} />
        <ListGroup>
          <ListRow
            icon="gift"
            title={t("admin.debug.simulateGiftReveal.title")}
            subtitle={t("admin.debug.simulateGiftReveal.subtitle")}
            onPress={simulateGiftReveal}
          />
        </ListGroup>
      </Screen>
    </AdminGate>
  );
}
