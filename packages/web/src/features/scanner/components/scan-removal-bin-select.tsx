import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { useScanRemoval } from "@/features/scanner/api/use-scan-removal";
import type { ScanRemovalBinSelectProps } from "@/lib/interfaces/scan-removal";
import type { BinConfig } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function ScanRemovalBinSelect({ className }: ScanRemovalBinSelectProps) {
  const { t } = useTranslation("scanner");
  const { configs } = useBinConfigs();
  const { removalBinNumber, setRemovalBinNumber } = useScanRemoval();
  const selectableBins = configs
    .filter((bin) => !bin.isDisabled)
    .sort((first, second) => first.binNumber - second.binNumber);
  const binLabel = (bin: BinConfig) =>
    bin.isCatchAll
      ? t("scanRemoval.catchAllBinOption", { number: bin.binNumber })
      : t("scanRemoval.bin", { number: bin.binNumber });
  const selectedBin = selectableBins.find(
    (bin) => bin.binNumber === removalBinNumber,
  );

  return (
    <Field className={className}>
      <FieldLabel htmlFor="scan-removal-bin">
        {t("scanRemoval.binLabel")}
      </FieldLabel>
      <Select
        value={removalBinNumber != null ? String(removalBinNumber) : null}
        onValueChange={(value) => value && setRemovalBinNumber(Number(value))}
      >
        <SelectTrigger id="scan-removal-bin" className="w-full">
          <SelectValue placeholder={t("scanRemoval.binPlaceholder")}>
            {selectedBin ? binLabel(selectedBin) : undefined}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {selectableBins.map((bin) => (
            <SelectItem key={bin.guid} value={String(bin.binNumber)}>
              {binLabel(bin)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
