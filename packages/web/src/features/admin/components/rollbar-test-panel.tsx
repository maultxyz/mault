import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { testServerRollbar } from "@/lib/api/admin";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

export function RollbarTestPanel() {
  const { t } = useTranslation("admin");

  const testServerMutation = useMutation({
    mutationFn: testServerRollbar,
    onSuccess: (result) => toast.success(result.message),
    onError: () => toast.error(t("rollbarTest.toasts.serverError")),
  });

  function handleTestClient() {
    var a = null;
    a!.hello();
    toast.success(t("rollbarTest.toasts.clientSent"));
  }

  return (
    <SettingsSection
      heading={t("rollbarTest.heading")}
      description={t("rollbarTest.description")}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={handleTestClient}>
          {t("rollbarTest.testClientButton")}
        </Button>
        <Button
          variant="outline"
          disabled={testServerMutation.isPending}
          onClick={() => testServerMutation.mutate()}
        >
          {testServerMutation.isPending
            ? t("rollbarTest.testingButton")
            : t("rollbarTest.testServerButton")}
        </Button>
      </div>
    </SettingsSection>
  );
}
