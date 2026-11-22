import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { clearServerCaches, reloadCardMatchIndex } from "@/lib/api/admin";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

export function ServerCachesPanel() {
  const { t } = useTranslation("admin");

  const clearCachesMutation = useMutation({
    mutationFn: clearServerCaches,
    onSuccess: (result) =>
      toast.success(
        t("serverCaches.toasts.cleared", { count: result.data?.clearedCacheCount ?? 0 }),
      ),
    onError: () => toast.error(t("serverCaches.toasts.clearError")),
  });

  const reloadMatchIndexMutation = useMutation({
    mutationFn: reloadCardMatchIndex,
    onSuccess: () => toast.success(t("serverCaches.toasts.matchIndexReloading")),
    onError: () => toast.error(t("serverCaches.toasts.matchIndexError")),
  });

  return (
    <SettingsSection
      heading={t("serverCaches.heading")}
      description={t("serverCaches.description")}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          disabled={clearCachesMutation.isPending}
          onClick={() => clearCachesMutation.mutate()}
        >
          {clearCachesMutation.isPending
            ? t("serverCaches.clearingButton")
            : t("serverCaches.clearButton")}
        </Button>
        <Button
          variant="outline"
          disabled={reloadMatchIndexMutation.isPending}
          onClick={() => reloadMatchIndexMutation.mutate()}
        >
          {reloadMatchIndexMutation.isPending
            ? t("serverCaches.reloadingMatchIndexButton")
            : t("serverCaches.reloadMatchIndexButton")}
        </Button>
      </div>
    </SettingsSection>
  );
}
