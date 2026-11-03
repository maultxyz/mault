import { Badge } from "@/components/ui/badge";
import type { PresetPickerItem } from "@/lib/interfaces/bins";
import { binSetMode } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function PresetPickerBadge({ item }: { item: PresetPickerItem }) {
  const { t } = useTranslation("bins");
  if (item.kind === "workflow") {
    return (
      <Badge variant="outline" className="shrink-0">
        {t("presetWorkflows.badge")}
      </Badge>
    );
  }
  const mode = binSetMode(item.preset);
  if (mode === "rules") return null;
  return (
    <Badge variant="outline" className="shrink-0">
      {t(`presetSelector.modeBadges.${mode}`)}
    </Badge>
  );
}
