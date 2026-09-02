import { Button } from "@/components/ui/button";
import { neon } from "@/lib/auth/client";
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// Neon-only - local mode has no email verification step. Never mounted in
// local mode (see app/routes/app/layout.tsx) rather than gated internally:
// neon.auth.useSession() below is a real network call, and a hook can't be
// skipped by an early return placed after it (rules of hooks) - it has to
// not render at all.
export function EmailVerificationBanner() {
  const { t } = useTranslation("common");
  const { data, isPending } = neon.auth.useSession();
  const navigate = useNavigate();
  const [isSending, setIsSending] = useState(false);

  if (isPending || !data?.user || data.user.emailVerified) return null;

  const email = data.user.email;

  const handleVerify = async () => {
    setIsSending(true);
    try {
      await neon.auth.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });
      toast.success(t("emailVerification.codeSentTitle"), {
        description: t("emailVerification.codeSentDescription", { email }),
      });
      navigate("/app/verify-email");
    } catch {
      toast.error(t("emailVerification.codeFailedTitle"), {
        description: t("emailVerification.codeFailedDescription"),
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 border-b border-amber-500/30 bg-amber-400/20 px-4 py-1.5 text-xs text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">
      <IconAlertTriangle className="size-3.5 shrink-0" />
      <span>{t("emailVerification.banner", { email })}</span>
      <Button
        variant="outline"
        size="xs"
        onClick={handleVerify}
        disabled={isSending}
        className="border-amber-500/40 bg-transparent text-amber-900 hover:bg-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10"
      >
        {isSending && <IconLoader2 className="size-3 animate-spin" />}
        {t("emailVerification.sendCode")}
      </Button>
      <Button
        variant="ghost"
        size="xs"
        onClick={() => navigate("/app/verify-email")}
        className="text-amber-900 hover:bg-amber-400/20 dark:text-amber-200 dark:hover:bg-amber-400/10"
      >
        {t("emailVerification.haveCode")}
      </Button>
    </div>
  );
}
