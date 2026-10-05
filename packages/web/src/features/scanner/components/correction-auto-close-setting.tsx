import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { CorrectionAutoCloseSettingProps } from "@/lib/interfaces/settings";
import {
  CORRECTION_AUTO_CLOSE_SECONDS_OPTIONS,
  DEFAULT_CORRECTION_AUTO_CLOSE_SECONDS,
} from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function CorrectionAutoCloseSetting({
  value,
  disabled,
  onChange,
}: CorrectionAutoCloseSettingProps) {
  const { t } = useTranslation("settings");
  const enabled = value != null;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm">{t("correctionAutoClose.toggleLabel")}</span>
        <Switch
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(checked) =>
            onChange(checked ? DEFAULT_CORRECTION_AUTO_CLOSE_SECONDS : null)
          }
        />
      </label>
      {enabled && (
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="correction-auto-close-seconds"
            className="text-xs font-medium"
          >
            {t("correctionAutoClose.secondsLabel")}
          </label>
          <Select
            value={String(value)}
            disabled={disabled}
            onValueChange={(next) => onChange(Number(next))}
          >
            <SelectTrigger id="correction-auto-close-seconds" className="w-36">
              <SelectValue>
                {t("correctionAutoClose.seconds", { count: value })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {CORRECTION_AUTO_CLOSE_SECONDS_OPTIONS.map((seconds) => (
                <SelectItem key={seconds} value={String(seconds)}>
                  {t("correctionAutoClose.seconds", { count: seconds })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
