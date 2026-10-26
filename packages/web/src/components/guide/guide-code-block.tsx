import { Button } from "@/components/ui/button";
import type { GuideCodeBlockProps } from "@/lib/interfaces/guide";
import { IconCopy } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { copyWithToast } from "@/lib/clipboard";

export function GuideCodeBlock({ code }: GuideCodeBlockProps) {
  const { t } = useTranslation("common");

  const copy = async () => {
    await copyWithToast(
      code,
      t("guide.code.copied"),
      t("guide.code.copyFailed"),
    );
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
        aria-label={t("guide.code.copy")}
        title={t("guide.code.copy")}
        className="absolute top-1.5 right-1.5 text-foreground/70 hover:text-foreground"
      >
        <IconCopy />
      </Button>
    </div>
  );
}
