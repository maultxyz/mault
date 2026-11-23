import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { parsePriceInput } from "@/features/public-cards/lib/public-card-filters";
import { usePriceSource } from "@/hooks/use-price-source";
import { CARD_FILTER_PRICE_INPUT_DEBOUNCE_MS } from "@/lib/constants/cards";
import { PUBLIC_CARD_FILTER_LEGEND_CLASS } from "@/lib/constants/public-cards";
import type { CardPriceRangeFilterProps } from "@/lib/interfaces/cards";
import { PRICE_SOURCE_FIELDS } from "@magic-vault/shared";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

function priceInputText(price: number | null): string {
  return price === null ? "" : String(price);
}

export function CardPriceRangeFilter({ minPrice, maxPrice, onChange }: CardPriceRangeFilterProps) {
  const { t } = useTranslation("cards");
  const { source } = usePriceSource();
  const minPriceId = useId();
  const maxPriceId = useId();
  const [minInput, setMinInput] = useState(() => priceInputText(minPrice));
  const [maxInput, setMaxInput] = useState(() => priceInputText(maxPrice));
  const [syncedRange, setSyncedRange] = useState({ minPrice, maxPrice });
  const onChangeRef = useRef(onChange);
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (syncedRange.minPrice !== minPrice || syncedRange.maxPrice !== maxPrice) {
    setSyncedRange({ minPrice, maxPrice });
    if (parsePriceInput(minInput) !== minPrice) setMinInput(priceInputText(minPrice));
    if (parsePriceInput(maxInput) !== maxPrice) setMaxInput(priceInputText(maxPrice));
  }

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  useEffect(
    () => () => {
      if (commitTimer.current) clearTimeout(commitTimer.current);
    },
    [],
  );

  function scheduleCommit(nextMinInput: string, nextMaxInput: string) {
    if (commitTimer.current) clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      commitTimer.current = null;
      onChangeRef.current({
        minPrice: parsePriceInput(nextMinInput),
        maxPrice: parsePriceInput(nextMaxInput),
      });
    }, CARD_FILTER_PRICE_INPUT_DEBOUNCE_MS);
  }

  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className={PUBLIC_CARD_FILTER_LEGEND_CLASS}>
        {t("cardFilterPopover.priceInCurrency", {
          currency: PRICE_SOURCE_FIELDS[source].currency,
        })}
      </legend>
      <div className="grid min-w-0 grid-cols-2 gap-1.5">
        <Field className="min-w-0">
          <FieldLabel htmlFor={minPriceId}>{t("publicBrowse.minPrice")}</FieldLabel>
          <Input
            id={minPriceId}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={minInput}
            onChange={(event) => {
              setMinInput(event.target.value);
              scheduleCommit(event.target.value, maxInput);
            }}
          />
        </Field>
        <Field className="min-w-0">
          <FieldLabel htmlFor={maxPriceId}>{t("publicBrowse.maxPrice")}</FieldLabel>
          <Input
            id={maxPriceId}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={maxInput}
            onChange={(event) => {
              setMaxInput(event.target.value);
              scheduleCommit(minInput, event.target.value);
            }}
          />
        </Field>
      </div>
    </fieldset>
  );
}
