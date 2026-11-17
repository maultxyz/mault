import { Switch } from "@/components/ui/switch";
import type { ResetAutoAssignToggleProps } from "@/lib/interfaces/storage";
import { useTranslation } from "react-i18next";

export function ResetAutoAssignToggle({
  checked,
  onCheckedChange,
}: ResetAutoAssignToggleProps) {
  const { t } = useTranslation("storage");
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="flex flex-col">
        <span className="text-sm">{t("emptyAllDialog.resetAutoAssign")}</span>
        <span className="text-xs text-foreground/70">
          {t("emptyAllDialog.resetAutoAssignDescription")}
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
}
