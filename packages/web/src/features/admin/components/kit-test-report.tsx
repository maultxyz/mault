import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { buildKitReport } from "@/features/admin/lib/kit-test";
import { useSerial } from "@/features/scanner/api/use-serial";
import type { KitTestReportProps } from "@/lib/interfaces/kit-test";
import { toast } from "@/lib/toast";
import { IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function KitTestReport({ session }: KitTestReportProps) {
  const { t } = useTranslation("admin");
  const { board, firmwareVersion, deviceId } = useSerial();
  const report = buildKitReport(t, session, {
    board,
    firmwareVersion,
    deviceId,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      toast.success(t("kitTest.report.copied"));
    } catch {
      toast.error(t("kitTest.report.copyFailed"));
    }
  };

  return (
    <SettingsSection
      heading={t("kitTest.report.heading")}
      description={t("kitTest.report.description")}
      action={
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <IconCopy />
          {t("kitTest.report.copy")}
        </Button>
      }
    >
      <pre className="whitespace-pre-wrap rounded-md border bg-muted p-2 font-mono text-xs">
        {report}
      </pre>
    </SettingsSection>
  );
}
