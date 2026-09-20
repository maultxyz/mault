import { Button } from "@/components/ui/button";
import { useImpersonation } from "@/hooks/use-impersonation";
import { IconUserScan } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function ImpersonationBanner() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const { isImpersonating, impersonatedUser, stop } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) return null;

  async function handleExit() {
    await stop();
    navigate("/app/admin/users");
  }

  return (
    <div className="flex items-center justify-center gap-2 border-b border-violet-500/30 bg-violet-500/20 px-4 py-1.5 text-xs text-violet-900 dark:bg-violet-500/10 dark:text-violet-200">
      <IconUserScan className="size-3.5 shrink-0" />
      <span>
        {t("impersonation.banner", {
          name: impersonatedUser.name || impersonatedUser.email,
        })}
      </span>
      <Button
        size="xs"
        variant="outline"
        className="shrink-0 border-violet-500/40 bg-transparent text-violet-900 hover:bg-violet-500/20 dark:text-violet-200"
        onClick={handleExit}
      >
        {t("impersonation.exitButton")}
      </Button>
    </div>
  );
}
