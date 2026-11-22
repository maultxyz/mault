import { IconBadge } from "@/components/icon-badge";
import { Button } from "@/components/ui/button";
import { useScannerBuyStartBarHidden } from "@/features/business/lib/scanner-buy-start-bar";
import type { ScannerBuyStartBarProps } from "@/lib/interfaces/business";
import { IconCash, IconPlus } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScannerBuyStartBar({ onStart }: ScannerBuyStartBarProps) {
  const { t } = useTranslation("business");
  const [isHidden, setIsHidden] = useScannerBuyStartBarHidden();
  if (isHidden) return null;

  return (
    <section
      aria-label={t("scannerBuy.startPrompt.title")}
      className="mx-2 mt-2 flex shrink-0 flex-wrap items-center gap-3 rounded-card bg-card p-4 md:gap-2 md:p-2.5"
    >
      <IconBadge aria-hidden size="compact">
        <IconCash className="size-4" />
      </IconBadge>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">{t("scannerBuy.startPrompt.title")}</h2>
        <p className="text-xs text-foreground/70">{t("scannerBuy.startPrompt.description")}</p>
      </div>
      <div className="flex gap-1.5">
        <Button
          variant="ghost"
          onClick={() => setIsHidden(true)}
        >
          {t("scannerBuy.startPrompt.hide")}
        </Button>
        <Button onClick={onStart}>
          <IconPlus />
          {t("scannerBuy.startPrompt.start")}
        </Button>
      </div>
    </section>
  );
}
