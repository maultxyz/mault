import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { SortTestResult } from "@/features/bins/components/sort-test-result";
import type { CardSortTestButtonProps } from "@/lib/interfaces/bins";
import { IconTestPipe } from "@tabler/icons-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function CardSortTestButton({
  card,
  isFoil,
  foilType,
  scannedBinNumber,
}: CardSortTestButtonProps) {
  const { t } = useTranslation("bins");
  const { selectedSet } = useBinConfigs();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <IconTestPipe />
        {t("sortTest.cardButton")}
      </Button>
      <DynamicDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        className="sm:max-w-2xl md:max-h-[85dvh]"
        title={t("sortTest.title")}
        description={t("sortTest.cardDescription", {
          name: selectedSet?.name,
        })}
        footer={
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {t("sortTest.close")}
          </Button>
        }
      >
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SortTestResult
            card={card}
            isFoil={isFoil}
            foilType={foilType}
            scannedBinNumber={scannedBinNumber}
          />
        </div>
      </DynamicDialog>
    </>
  );
}
