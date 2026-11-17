import { Callout } from "@/components/callout";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useTranslation } from "react-i18next";

export function EditingStagePresetBanner() {
  const { t } = useTranslation("bins");
  const { selectedSet } = useBinConfigs();

  if (!selectedSet || selectedSet.isActive) return null;

  return (
    <div className="px-4 pt-3">
      <Callout
        title={t("presetWorkflows.editingInactiveTitle", {
          name: selectedSet.name,
        })}
      >
        {t("presetWorkflows.editingInactiveDescription")}
      </Callout>
    </div>
  );
}
