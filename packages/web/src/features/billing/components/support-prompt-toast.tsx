import { Button } from "@/components/ui/button";
import { optOutOfSupportPrompt } from "@/features/billing/lib/support-prompt";
import { DONATE_URL } from "@/lib/constants/links";
import type { SupportPromptToastProps } from "@/lib/interfaces/billing";
import { IconCoffee, IconHeart, IconSparkles } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { toast } from "@/lib/toast";

export function SupportPromptToast({
  toastId,
  showSubscribe,
  onSubscribe,
}: SupportPromptToastProps) {
  const { t } = useTranslation("billing");
  const close = () => toast.dismiss(toastId);

  return (
    <div className="flex w-[356px] max-w-full flex-col gap-3 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
      <div className="flex items-start gap-2.5">
        <IconHeart className="mt-0.5 size-4 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">{t("supportPrompt.title")}</p>
          <p className="text-xs text-foreground/70">
            {t("supportPrompt.description")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          nativeButton={false}
          render={
            <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" />
          }
          onClick={close}
        >
          <IconCoffee />
          {t("supportPrompt.support")}
        </Button>
        {showSubscribe && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              close();
              onSubscribe();
            }}
          >
            <IconSparkles />
            {t("supportPrompt.subscribe")}
          </Button>
        )}
      </div>
      <div className="flex justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={close}>
          {t("supportPrompt.later")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            optOutOfSupportPrompt();
            close();
          }}
        >
          {t("supportPrompt.dontAskAgain")}
        </Button>
      </div>
    </div>
  );
}
