import { Button } from "@/components/ui/button";
import { testServerRollbar } from "@/lib/api/admin";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
    <div className="rounded-lg border p-4 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="text-sm font-medium">{t("rollbarTest.heading")}</p>
        <p className="text-xs text-muted-foreground">
          {t("rollbarTest.description")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
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
    </div>
  );
}
