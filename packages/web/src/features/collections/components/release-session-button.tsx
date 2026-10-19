import { releaseScanLock } from "@/features/collections/api/collections";
import type { ReleaseSessionButtonProps } from "@/lib/interfaces/collections";
import { toast } from "@/lib/toast";
import { IconLoader2, IconLockOpen } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function ReleaseSessionButton({ guid }: ReleaseSessionButtonProps) {
  const { t } = useTranslation("scanner");
  const [releasing, setReleasing] = useState(false);

  const handleRelease = async () => {
    setReleasing(true);
    try {
      await releaseScanLock(guid);
      toast.success(t("monitorSessions.sessionReleased"));
    } catch {
      toast.error(t("monitorSessions.releaseFailed"));
    } finally {
      setReleasing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleRelease()}
      disabled={releasing}
      title={t("monitorSessions.leaveSession")}
      aria-label={t("monitorSessions.leaveSession")}
      className="flex size-7 shrink-0 items-center justify-center rounded-md border border-warning-border text-warning-foreground transition-colors hover:bg-warning-muted disabled:opacity-50"
    >
      {releasing ? (
        <IconLoader2 className="size-3.5 animate-spin" />
      ) : (
        <IconLockOpen className="size-3.5" />
      )}
    </button>
  );
}
