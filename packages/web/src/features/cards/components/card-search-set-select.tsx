import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { CARD_SEARCH_ALL_SETS } from "@/lib/constants/cards";
import type { CardSearchSetSelectProps } from "@/lib/interfaces/cards";
import type { CardSetOption } from "@magic-vault/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function CardSearchSetSelect({
  sets,
  totalCount,
  value,
  onChange,
}: CardSearchSetSelectProps) {
  const { t } = useTranslation("cards");
  const isMobile = useIsMobile();
  const allSetsLabel = t("cardPicker.allSetsCount", { count: totalCount });
  const setOptions = useMemo<CardSetOption[]>(
    () => [
      { code: CARD_SEARCH_ALL_SETS, name: allSetsLabel, cardCount: totalCount },
      ...sets,
    ],
    [sets, allSetsLabel, totalCount],
  );
  if (sets.length <= 1) return null;

  const setOptionLabel = (set: CardSetOption) =>
    set.code === CARD_SEARCH_ALL_SETS
      ? set.name
      : `${set.name} (${set.code.toUpperCase()})`;

  if (isMobile) {
    return (
      <Select
        value={value}
        onValueChange={(nextValue) =>
          onChange(nextValue ?? CARD_SEARCH_ALL_SETS)
        }
      >
        <SelectTrigger className="w-40 shrink-0">
          <SelectValue placeholder={t("cardPicker.allSets")}>
            {setOptions.find((set) => set.code === value)?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {setOptions.map((set) => (
            <SelectItem key={set.code} value={set.code}>
              {set.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Combobox
      items={setOptions}
      value={setOptions.find((set) => set.code === value) ?? null}
      onValueChange={(set: CardSetOption | null) =>
        onChange(set?.code ?? CARD_SEARCH_ALL_SETS)
      }
      itemToStringLabel={setOptionLabel}
      isItemEqualToValue={(a: CardSetOption, b: CardSetOption) =>
        a?.code === b?.code
      }
    >
      <ComboboxInput
        placeholder={t("cardPicker.allSets")}
        className="w-56 shrink-0"
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("cardPicker.noMatchingSets")}</ComboboxEmpty>
        <ComboboxList>
          {(set: CardSetOption) => (
            <ComboboxItem key={set.code} value={set}>
              <span className="truncate">{set.name}</span>
              {set.code !== CARD_SEARCH_ALL_SETS && (
                <span className="ml-auto shrink-0 pr-5 text-2xs uppercase text-foreground/70">
                  {set.code}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
