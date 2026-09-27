import { billingQueryOptions } from "@/features/billing/api/billing";
import { SupportPromptToast } from "@/features/billing/components/support-prompt-toast";
import {
  markSupportPromptShown,
  shouldShowSupportPrompt,
} from "@/features/billing/lib/support-prompt";
import { hasActiveSubscription } from "@/features/billing/lib/subscription";
import { useOrg } from "@/features/companies/api/use-organization";
import { SUPPORT_PROMPT_TOAST_ID } from "@/lib/constants/billing";
import { SESSION_TIMER_RUNNING_STATUSES } from "@/lib/constants/scanner";
import type { ScannerStatus } from "@magic-vault/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/lib/toast";

export function useSupportPrompt(status: ScannerStatus) {
  const navigate = useNavigate();
  const { activeOrg } = useOrg();
  const { data: billing } = useQuery(billingQueryOptions(activeOrg?.id));

  const latestRef = useRef({ billing, navigate });
  latestRef.current = { billing, navigate };
  const previousStatusRef = useRef(status);

  useEffect(() => {
    const wasRunning = SESSION_TIMER_RUNNING_STATUSES.includes(
      previousStatusRef.current,
    );
    previousStatusRef.current = status;
    if (status !== "paused" || !wasRunning || document.hidden) return;

    const now = Date.now();
    if (!shouldShowSupportPrompt(now)) return;
    const { billing: currentBilling, navigate: go } = latestRef.current;
    if (hasActiveSubscription(currentBilling ?? null)) return;

    markSupportPromptShown(now);
    toast.custom(
      (id) => (
        <SupportPromptToast
          toastId={id}
          showSubscribe={!!currentBilling}
          onSubscribe={() => go("/app/settings")}
        />
      ),
      { id: SUPPORT_PROMPT_TOAST_ID, duration: Infinity },
    );
  }, [status]);
}
