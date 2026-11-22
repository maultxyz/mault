import { Button } from "@/components/ui/button";
import { useOpenBuy } from "@/features/business/api/use-open-buy";
import { useScannerBuyStartBarHidden } from "@/features/business/lib/scanner-buy-start-bar";
import { useCollections } from "@/features/collections/api/use-collections";
import { IconCash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ScannerBuyShowButton() {
  const { t } = useTranslation("business");
  const { activeCollection } = useCollections();
  const { openBuy, canStartBuy } = useOpenBuy(activeCollection?.guid);
  const [isHidden, setHidden] = useScannerBuyStartBarHidden();
  if (!canStartBuy || !isHidden || openBuy) return null;

  return (
    <Button
      variant="outline"
      className="shrink-0"
      title={t("scannerBuy.startPrompt.show")}
      onClick={() => setHidden(false)}
    >
      <IconCash />
      {t("scannerBuy.startPrompt.showShort")}
    </Button>
  );
}
