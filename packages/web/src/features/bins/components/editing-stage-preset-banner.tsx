import { Callout } from "@/components/callout";
import { Button } from "@/components/ui/button";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { IconPlayerPlay } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function EditingStagePresetBanner() {
  const { t } = useTranslation("bins");
  const isMobile = useIsMobile();
  const { selectedSet, activateSet, isActivating, isBinFormDirty } =
    useBinConfigs();

  if (!selectedSet || selectedSet.isActive) return null;

  return (
    <div className="px-4 pt-3">
      <Callout
        title={t("presetWorkflows.editingInactiveTitle", {
          name: selectedSet.name,
        })}
        action={
          isMobile ? undefined : (
            <Button
              variant="outline"
              disabled={isActivating || isBinFormDirty}
              onClick={() => void activateSet(selectedSet.guid)}
            >
              <IconPlayerPlay />
              {t("presetSelector.makeActive")}
            </Button>
          )
        }
      >
        {t("presetWorkflows.editingInactiveDescription")}
        {!isMobile && isBinFormDirty && (
          <span className="block">{t("presetSelector.saveBeforeMakingActive")}</span>
        )}
      </Callout>
    </div>
  );
}
