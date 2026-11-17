import { Button } from "@/components/ui/button";
import { useCollections } from "@/features/collections/api/use-collections";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import { ScanRemovalActions } from "@/features/scanner/components/scan-removal-actions";
import { ScanRemovalList } from "@/features/scanner/components/scan-removal-list";
import { useTranslation } from "react-i18next";

export function ScanRemovalPanel() {
  const { t } = useTranslation("scanner");
  const { activeCollection } = useCollections();
  const { setRemoveModeEnabled } = useScanRemoval();

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-heading text-lg font-bold">
            {t("scanRemoval.title")}
          </h2>
          <p className="text-sm text-foreground/70">
            {t("scanRemoval.description", {
              collection: activeCollection?.name ?? "",
            })}
          </p>
        </div>
        <Button variant="outline" onClick={() => setRemoveModeEnabled(false)}>
          {t("scanRemoval.exit")}
        </Button>
      </div>
      <ScanRemovalActions />
      <ScanRemovalList />
    </div>
  );
}
