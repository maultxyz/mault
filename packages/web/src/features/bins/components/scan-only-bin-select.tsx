import { FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ScanOnlyBinSelectProps } from "@/lib/interfaces/bins";
import { useTranslation } from "react-i18next";

export function ScanOnlyBinSelect({
  id,
  label,
  description,
  value,
  binNumbers,
  disabled,
  onChange,
}: ScanOnlyBinSelectProps) {
  const { t } = useTranslation("bins");

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <p className="text-2xs text-foreground/70">{description}</p>
      </div>
      <Select
        value={String(value)}
        disabled={disabled}
        onValueChange={(next) => onChange(Number(next))}
      >
        <SelectTrigger id={id} className="w-28 shrink-0">
          <SelectValue>{t("binLabel", { number: value })}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {binNumbers.map((binNumber) => (
            <SelectItem key={binNumber} value={String(binNumber)}>
              {t("binLabel", { number: binNumber })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
