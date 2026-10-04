import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { PlanLimitInputProps } from "@/lib/interfaces/admin";
import { useTranslation } from "react-i18next";

export function PlanLimitInput({
  id,
  label,
  value,
  fallback,
  invalid,
  onChange,
}: PlanLimitInputProps) {
  const { t } = useTranslation("admin");
  const isUnlimited = value === null;

  return (
    <div className="flex flex-col gap-1.5">
      <Input
        id={id}
        type="number"
        min={0}
        inputMode="numeric"
        className="h-8"
        aria-label={label}
        aria-invalid={invalid || undefined}
        disabled={isUnlimited}
        placeholder={isUnlimited ? t("plans.unlimited") : undefined}
        value={isUnlimited || Number.isNaN(value) ? "" : value}
        onChange={(e) =>
          onChange(e.target.value === "" ? Number.NaN : Number(e.target.value))
        }
      />
      <label className="flex items-center gap-1.5 text-2xs text-foreground/70">
        <Switch
          size="sm"
          checked={isUnlimited}
          onCheckedChange={(checked) => onChange(checked ? null : fallback)}
        />
        {t("plans.unlimited")}
      </label>
    </div>
  );
}
