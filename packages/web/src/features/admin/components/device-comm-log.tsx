import { EmptyState } from "@/components/empty-state";
import { SettingsSection } from "@/components/settings-section";
import { Button } from "@/components/ui/button";
import { useCommLog } from "@/features/scanner/api/use-serial";
import { CommLogEntries } from "@/features/scanner/components/comm-log-entries";
import { formatCommLog } from "@/features/scanner/lib/comm-log";
import { DEVICE_PLAYGROUND_LOG_LIMIT } from "@/lib/constants/device-playground";
import { toast } from "@/lib/toast";
import {
  IconCopy,
  IconTerminal2,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function DeviceCommLog() {
  const { t } = useTranslation("admin");
  const entries = useCommLog();
  const recent = entries.slice(-DEVICE_PLAYGROUND_LOG_LIMIT).reverse();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formatCommLog(entries));
      toast.success(t("devicePlayground.log.copied"));
    } catch {
      toast.error(t("devicePlayground.log.copyFailed"));
    }
  };

  return (
    <SettingsSection
      heading={t("devicePlayground.log.heading")}
      description={t("devicePlayground.log.description")}
      action={
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          disabled={entries.length === 0}
        >
          <IconCopy />
          {t("devicePlayground.log.copy")}
        </Button>
      }
    >
      {recent.length === 0 ? (
        <EmptyState size="compact" icon={IconTerminal2} title={t("devicePlayground.log.empty")} />
      ) : (
        <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted">
          <CommLogEntries entries={recent} />
        </div>
      )}
    </SettingsSection>
  );
}
