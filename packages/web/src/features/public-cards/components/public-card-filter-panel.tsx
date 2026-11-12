import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PublicCardFilterGroup,
  PublicCardRadioGroup,
} from "@/features/public-cards/components/public-card-filter-group";
import { colorSwatch } from "@/lib/card-swatches";
import {
  ALL_PUBLIC_CARD_GAMES,
  PUBLIC_CARD_FILTER_LEGEND_CLASS,
  PUBLIC_CARD_FILTER_SEARCHABLE_MIN_OPTIONS,
} from "@/lib/constants/public-cards";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { countActivePublicCardFilters } from "@/features/public-cards/lib/public-card-filters";
import type { PublicCardFilterPanelProps } from "@/lib/interfaces/public-cards";
import {
  CARD_CONDITIONS,
  isCardCondition,
  rarityLabel,
  sortRarities,
  type PublicCardFinish,
  type PublicCardSort,
} from "@magic-vault/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function PublicCardFilterPanel({
  info,
  facets,
  gameKey,
  onGameKeyChange,
  sort,
  sorts,
  onSortChange,
  filters,
  onFiltersChange,
  minPriceInput,
  maxPriceInput,
  onMinPriceInputChange,
  onMaxPriceInputChange,
  onClear,
}: PublicCardFilterPanelProps) {
  const { t } = useTranslation("cards");
  const { t: tCards } = useTranslation("cards");
  const sortSelectId = useId();
  const minPriceId = useId();
  const maxPriceId = useId();
  const activeCount = countActivePublicCardFilters(filters, gameKey);
  const conditions = [...(facets?.conditions ?? [])].sort(
    (left, right) =>
      CARD_CONDITIONS.indexOf(left.key as (typeof CARD_CONDITIONS)[number]) -
      CARD_CONDITIONS.indexOf(right.key as (typeof CARD_CONDITIONS)[number]),
  );
  const finishOptions: { key: PublicCardFinish; label: string; count?: number }[] = [
    { key: "all", label: t("publicBrowse.finishAll") },
    { key: "nonfoil", label: t("publicBrowse.finishNonFoil"), count: facets?.nonFoilCount },
    { key: "foil", label: t("publicBrowse.finishFoil"), count: facets?.foilCount },
  ];

  return (
    <div className="flex min-w-0 shrink-0 flex-col gap-5">
      <div className="flex items-center gap-2">
        <h2 className="min-w-0 truncate text-sm font-semibold">{t("publicBrowse.filtersHeading")}</h2>
        {activeCount > 0 && (
          <Button variant="ghost" className="ml-auto shrink-0" onClick={onClear}>
            {t("publicBrowse.clearFilters", { count: activeCount })}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={sortSelectId} className={PUBLIC_CARD_FILTER_LEGEND_CLASS}>
          {t("publicBrowse.sortLabel")}
        </label>
        <Select value={sort} onValueChange={(next) => onSortChange(next as PublicCardSort)}>
          <SelectTrigger id={sortSelectId} className="w-full">
            <SelectValue>{t(`publicBrowse.sorts.${sort}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {sorts.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`publicBrowse.sorts.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {info.games.length > 1 && (
        <PublicCardRadioGroup
          legend={t("publicBrowse.gameFilter")}
          name="game"
          value={gameKey}
          onChange={onGameKeyChange}
          options={[
            { key: ALL_PUBLIC_CARD_GAMES, label: t("publicBrowse.allGames"), count: info.cardCount },
            ...info.games.map((game) => ({ key: game.key, label: game.name, count: game.cardCount })),
          ]}
        />
      )}
      {info.showsPrices && (
        <fieldset className="flex min-w-0 flex-col">
          <legend className={PUBLIC_CARD_FILTER_LEGEND_CLASS}>
            {t("publicBrowse.priceFilter")}
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
                value={minPriceInput}
                onChange={(event) => onMinPriceInputChange(event.target.value)}
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
                value={maxPriceInput}
                onChange={(event) => onMaxPriceInputChange(event.target.value)}
              />
            </Field>
          </div>
        </fieldset>
      )}
      <PublicCardRadioGroup
        legend={t("publicBrowse.finishFilter")}
        name="finish"
        value={filters.finish}
        onChange={(finish) => onFiltersChange({ ...filters, finish })}
        options={finishOptions}
      />
      {(facets?.foilTypes.length ?? 0) > 1 && (
        <PublicCardFilterGroup
          legend={t("publicBrowse.foilTypeFilter")}
          options={(facets?.foilTypes ?? []).map(({ key, count }) => ({ key, label: key, count }))}
          selected={filters.foilTypes}
          onChange={(foilTypes) => onFiltersChange({ ...filters, foilTypes })}
        />
      )}
      <PublicCardFilterGroup
        legend={tCards("condition.label")}
        options={conditions.map(({ key, count }) => ({
          key,
          label: isCardCondition(key) ? tCards(`condition.names.${key}`) : key,
          count,
        }))}
        selected={filters.conditions}
        onChange={(selectedConditions) =>
          onFiltersChange({ ...filters, conditions: selectedConditions })
        }
      />
      {(facets?.languages.length ?? 0) > 1 && (
        <PublicCardFilterGroup
          legend={t("publicBrowse.languageFilter")}
          options={(facets?.languages ?? []).map(({ key, count }) => ({
            key,
            label: LANGUAGE_LABELS[key] ?? key,
            count,
          }))}
          selected={filters.languages}
          onChange={(languages) => onFiltersChange({ ...filters, languages })}
        />
      )}
      <PublicCardFilterGroup
        legend={t("publicBrowse.rarityFilter")}
        options={sortRarities(facets?.rarities ?? []).map(({ key, count }) => ({
          key,
          label: rarityLabel(key),
          count,
        }))}
        selected={filters.rarities}
        onChange={(rarities) => onFiltersChange({ ...filters, rarities })}
      />
      <PublicCardFilterGroup
        legend={t("publicBrowse.colorFilter")}
        options={(facets?.colors ?? []).map(({ key, count }) => ({
          key,
          label: colorSwatch(key).label,
          count,
        }))}
        selected={filters.colors}
        onChange={(colors) => onFiltersChange({ ...filters, colors })}
      />
      <PublicCardFilterGroup
        legend={t("publicBrowse.setFilter")}
        searchPlaceholder={
          (facets?.sets.length ?? 0) > PUBLIC_CARD_FILTER_SEARCHABLE_MIN_OPTIONS
            ? t("publicBrowse.findSet")
            : undefined
        }
        options={(facets?.sets ?? []).map(({ code, name, count }) => ({
          key: code,
          label: name || code,
          count,
        }))}
        selected={filters.sets}
        onChange={(sets) => onFiltersChange({ ...filters, sets })}
      />
    </div>
  );
}
