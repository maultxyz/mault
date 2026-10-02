import { Button } from "@/components/ui/button";
import { ALERT_BANNER_ACTION_CLASS } from "@/lib/constants/colors";
import type { AppAlert } from "@/lib/interfaces/alerts";
import { neon } from "@/lib/auth/client";
import { AUTH_PROVIDER } from "@/lib/auth/provider";
import { IconAlertTriangle, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";

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
          className={ALERT_BANNER_ACTION_CLASS}
        >
          {isSending && <IconLoader2 className="size-3 animate-spin" />}
          {t("emailVerification.sendCode")}
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => navigate("/app/verify-email")}
          className="text-warning-foreground hover:bg-warning-border/40"
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
