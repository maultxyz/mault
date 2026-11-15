import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PriceLabelCardListProps } from "@/lib/interfaces/price-labels";
import { useController, useFormState } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function PriceLabelCardList({ form, items, formatLabelPrice }: PriceLabelCardListProps) {
  const { t } = useTranslation("business");
  const { t: tCards } = useTranslation("cards");
  const { field: deselectedField } = useController({
    control: form.control,
    name: "deselectedScanIds",
  });
  const { field: customPricesField } = useController({
    control: form.control,
    name: "customPrices",
  });
  const { errors } = useFormState({ control: form.control, name: "customPrices" });
  const deselected = new Set(deselectedField.value);
  const selectedCount = items.filter((item) => !deselected.has(item.card.scanId)).length;
  const allSelected = selectedCount === items.length;

  const toggle = (scanId: string, checked: boolean) => {
    const next = new Set(deselected);
    if (checked) next.delete(scanId);
    else next.add(scanId);
    deselectedField.onChange([...next]);
  };
  const setCustomPrice = (scanId: string, value: number) => {
    const nextCustomPrices = { ...customPricesField.value };
    if (Number.isNaN(value)) delete nextCustomPrices[scanId];
    else nextCustomPrices[scanId] = value;
    customPricesField.onChange(nextCustomPrices);
  };

  return (
    <fieldset className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-1.5">
        <legend className="text-sm font-medium">
          {t("priceLabels.cards.selected", { count: selectedCount, total: items.length })}
        </legend>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            deselectedField.onChange(allSelected ? items.map((item) => item.card.scanId) : [])
          }
        >
          {allSelected ? t("priceLabels.cards.selectNone") : t("priceLabels.cards.selectAll")}
        </Button>
      </div>
      <div className="max-h-[28rem] overflow-y-auto rounded-lg bg-foreground/6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <span className="sr-only">{t("priceLabels.cards.include")}</span>
              </TableHead>
              <TableHead>{t("priceLabels.cards.card")}</TableHead>
              <TableHead className="text-right">{t("priceLabels.cards.market")}</TableHead>
              <TableHead className="w-28">{t("priceLabels.cards.customPrice")}</TableHead>
              <TableHead className="text-right">{t("priceLabels.cards.labelPrice")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(({ card, labelPrice }) => {
              const checkboxId = `price-label-card-${card.scanId}`;
              const customPriceId = `price-label-custom-${card.scanId}`;
              const customPriceError = errors.customPrices?.[card.scanId];
              const customPrice = customPricesField.value[card.scanId];
              return (
                <TableRow key={card.scanId}>
                  <TableCell>
                    <Checkbox
                      id={checkboxId}
                      checked={!deselected.has(card.scanId)}
                      onCheckedChange={(checked) => toggle(card.scanId, checked === true)}
                    />
                  </TableCell>
                  <TableCell className="min-w-0">
                    <label htmlFor={checkboxId} className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{card.name}</span>
                      <span className="truncate text-xs text-foreground/70">
                        {[
                          card.setCode.toUpperCase(),
                          card.collectorNumber && `#${card.collectorNumber}`,
                          card.condition,
                          card.isFoil && tCards("foil"),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </label>
                  </TableCell>
                  <TableCell className="text-right">
                    {card.marketPrice === null ? (
                      <span className="text-foreground/70">{t("priceLabels.cards.noPrice")}</span>
                    ) : (
                      formatLabelPrice(card.marketPrice)
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      id={customPriceId}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      placeholder={labelPrice === null ? "" : labelPrice.toFixed(2)}
                      value={customPrice === undefined ? "" : customPrice}
                      onChange={(event) => setCustomPrice(card.scanId, event.target.valueAsNumber)}
                      aria-label={t("priceLabels.cards.customPriceFor", { name: card.name })}
                      aria-invalid={!!customPriceError}
                    />
                    {customPriceError && <FieldError errors={[customPriceError]} />}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {labelPrice === null ? (
                      <span className="font-normal text-foreground/70">
                        {t("priceLabels.cards.noPrice")}
                      </span>
                    ) : (
                      formatLabelPrice(labelPrice)
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </fieldset>
  );
}
