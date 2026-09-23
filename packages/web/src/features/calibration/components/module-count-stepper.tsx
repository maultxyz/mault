import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useModuleCountConfig } from "@/features/calibration/api/use-module-count-config";
import { useTranslation } from "react-i18next";

export function ModuleCountStepper() {
  const { t } = useTranslation("calibration");
  const { displayCount, options, stage } = useModuleCountConfig();

  return (
    <div className="flex flex-col gap-1.5">
      <Select
        value={String(displayCount)}
        onValueChange={(value) => stage(Number(value))}
      >
        <SelectTrigger className="w-40">
          <SelectValue>
            {t("moduleCountStepper.value", { count: displayCount })}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {t("moduleCountStepper.value", { count: n })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs leading-tight text-muted-foreground">
        {t("moduleCountStepper.description")}
      </p>
    </div>
  );
}
