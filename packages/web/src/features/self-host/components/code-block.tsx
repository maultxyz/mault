import { Button } from "@/components/ui/button";
import type { SelfHostCodeBlockProps } from "@/lib/interfaces/self-host";
import { toast } from "@/lib/toast";
import { IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function SelfHostCodeBlock({ code }: SelfHostCodeBlockProps) {
  const { t } = useTranslation("selfhost");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t("code.copied"));
    } catch {
      toast.error(t("code.copyFailed"));
    }
  };

  return (
    <div className="relative mt-2 rounded-md border bg-background">
      <pre className="overflow-x-auto py-2.5 pr-11 pl-3 font-heading text-xs/relaxed">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => void copy()}
        aria-label={t("code.copy")}
        title={t("code.copy")}
        className="absolute top-1.5 right-1.5 text-foreground/70 hover:text-foreground"
      >
        <IconCopy />
      </Button>
    </div>
  );
}
