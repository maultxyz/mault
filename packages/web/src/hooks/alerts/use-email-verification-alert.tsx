import { Button } from "@/components/ui/button";
import type { AppAlert } from "@/lib/alerts";
import { neon } from "@/lib/auth/client";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function useEmailVerificationAlertNeon(): AppAlert | null {
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

  return {
    id: "email-verification",
    severity: "warning",
    icon: IconAlertTriangle,
    message: t("emailVerification.banner", { email }),
    actions: (
      <>
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
      </>
    ),
  };
}

function useEmailVerificationAlertLocal(): AppAlert | null {
  return null;
}

export const useEmailVerificationAlert =
  AUTH_PROVIDER === "local"
    ? useEmailVerificationAlertLocal
    : useEmailVerificationAlertNeon;
