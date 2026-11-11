import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type {
  PublicCardFilterGroupProps,
  PublicCardRadioGroupProps,
} from "@/lib/interfaces/public-cards";
import {
  PUBLIC_CARD_FILTER_COUNT_CLASS as COUNT_CLASS,
  PUBLIC_CARD_FILTER_LABEL_CLASS as LABEL_CLASS,
  PUBLIC_CARD_FILTER_LEGEND_CLASS as LEGEND_CLASS,
} from "@/lib/constants/public-cards";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";


export function PublicCardFilterGroup({
  legend,
  options,
  selected,
  onChange,
  searchPlaceholder,
}: PublicCardFilterGroupProps) {
  const { t } = useTranslation("cards");
  const idPrefix = useId();
  const [query, setQuery] = useState("");
  if (options.length === 0) return null;
  const normalizedQuery = query.trim().toLowerCase();
  const visible = normalizedQuery
    ? options.filter((option) => option.label.toLowerCase().includes(normalizedQuery))
    : options;

  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className={LEGEND_CLASS}>{legend}</legend>
      {searchPlaceholder && (
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="mb-1.5"
        />
      )}
      <div className={searchPlaceholder ? "flex min-w-0 max-h-64 flex-col overflow-y-auto" : "flex min-w-0 flex-col"}>
        {visible.map((option) => {
          const id = `${idPrefix}-${option.key}`;
          const checked = selected.includes(option.key);
          return (
            <div key={option.key} className="flex min-h-7 items-center gap-2 py-0.5 max-md:min-h-10">
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(next) =>
                  onChange(
                    next
                      ? [...selected, option.key]
                      : selected.filter((key) => key !== option.key),
                  )
                }
              />
              <label htmlFor={id} className={LABEL_CLASS}>
                <span className="min-w-0 truncate">{option.label}</span>
                <span className={COUNT_CLASS}>{option.count}</span>
              </label>
            </div>
          );
        })}
        {visible.length === 0 && (
          <p className="text-xs text-foreground/70">{t("publicBrowse.noFilterMatches")}</p>
        )}
      </div>
    </fieldset>
  );
}

export function PublicCardRadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: PublicCardRadioGroupProps<T>) {
  const idPrefix = useId();
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className={LEGEND_CLASS}>{legend}</legend>
      {options.map((option) => {
        const id = `${idPrefix}-${option.key}`;
        return (
          <div key={option.key} className="flex min-h-7 items-center gap-2 py-0.5 max-md:min-h-10">
            <input
              id={id}
              type="radio"
              name={`${idPrefix}-${name}`}
              checked={value === option.key}
              onChange={() => onChange(option.key)}
              className="size-4 accent-primary"
            />
            <label htmlFor={id} className={LABEL_CLASS}>
              <span className="min-w-0 truncate">{option.label}</span>
              {option.count !== undefined && (
                <span className={COUNT_CLASS}>{option.count}</span>
              )}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}
