import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { testServerErrorReporting } from "@/lib/api/admin";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

export function ErrorReportingTestPanel() {
  const { t } = useTranslation("admin");

  const testServerMutation = useMutation({
    mutationFn: testServerErrorReporting,
    onSuccess: (result) => toast.success(result.message),
    onError: () => toast.error(t("errorReportingTest.toasts.serverError")),
  });

  function handleTestClient() {
    (null as unknown as { hello: () => void }).hello();
    toast.success(t("errorReportingTest.toasts.clientSent"));
  }

  return (
    <SettingsSection
      heading={t("errorReportingTest.heading")}
      description={t("errorReportingTest.description")}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" onClick={handleTestClient}>
          {t("errorReportingTest.testClientButton")}
        </Button>
        <Button
          variant="outline"
          disabled={testServerMutation.isPending}
          onClick={() => testServerMutation.mutate()}
        >
          {testServerMutation.isPending
            ? t("errorReportingTest.testingButton")
            : t("errorReportingTest.testServerButton")}
        </Button>
      </div>
    </SettingsSection>
  );
}
