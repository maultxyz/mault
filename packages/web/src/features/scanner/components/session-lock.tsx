import { AlertBanner } from "@/components/alert-banner";
import { Button } from "@/components/ui/button";
import { useIsSessionActive } from "@/features/scanner/api/use-is-session-active";
import { SESSION_LOCK_ALERT_ID } from "@/lib/constants/scanner";
import type { SessionLockProps } from "@/lib/interfaces/scanner";
import { cn } from "@/lib/utils";
import { IconLock } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function SessionLock({
  className,
  bannerClassName,
  children,
}: SessionLockProps) {
  const { t } = useTranslation("scanner");
  const navigate = useNavigate();
  const isLocked = useIsSessionActive();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isLocked && (
        <AlertBanner
          className={bannerClassName}
          alert={{
            id: SESSION_LOCK_ALERT_ID,
            severity: "warning",
            icon: IconLock,
            message: t("sessionLock.message"),
            actions: (
              <Button
                size="xs"
                variant="outline"
                onClick={() => navigate("/app")}
                className="shrink-0 border-amber-500/40 bg-transparent text-amber-900 hover:bg-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10"
              >
                {t("sessionLock.openScanner")}
              </Button>
            ),
          }}
        />
      )}
      <div
        inert={isLocked}
        aria-disabled={isLocked}
        className={cn(className, isLocked && "opacity-50 select-none")}
      >
        {children}
      </div>
    </div>
  );
}
