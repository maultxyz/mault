import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REVIEW_GRID_NO_SELECTION_VALUE } from "@/lib/constants/card-grid";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import type { ReviewGridAttributeFieldsProps } from "@/lib/interfaces/cards";
import {
  CARD_CONDITIONS,
  CARD_LANGUAGES,
  cardFoilTypeOptions,
  cardStampOptionsFor,
  isCardCondition,
  isCardLanguage,
} from "@magic-vault/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function ReviewGridAttributeFields({
  card,
  attributes,
  onChange,
}: ReviewGridAttributeFieldsProps) {
  const { t } = useTranslation("cards");
  const foilSelectId = useId();
  const stampSelectId = useId();
  const conditionSelectId = useId();
  const languageSelectId = useId();
  const foilOptions = cardFoilTypeOptions(
    [t("foil")],
    card.card,
    attributes.foilType,
  );
  const stampOptions = cardStampOptionsFor(card.card, attributes.stamp);
  const languageOptions: string[] = isCardLanguage(attributes.language)
    ? [...CARD_LANGUAGES]
    : [attributes.language, ...CARD_LANGUAGES];

  return (
    <div className="grid grid-cols-2 gap-1.5">
      <div className="flex min-w-0 flex-col gap-1">
        <Label htmlFor={foilSelectId} className="text-2xs text-foreground/70">
          {t("foil")}
        </Label>
        <Select
          value={attributes.foilType ?? REVIEW_GRID_NO_SELECTION_VALUE}
          onValueChange={(value) =>
            onChange({
              ...attributes,
              foilType: !value || value === REVIEW_GRID_NO_SELECTION_VALUE ? null : value,
            })
          }
        >
          <SelectTrigger id={foilSelectId} className="w-full">
            <SelectValue>{attributes.foilType ?? t("foilNone")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={REVIEW_GRID_NO_SELECTION_VALUE}>{t("foilNone")}</SelectItem>
            {foilOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {stampOptions.length > 0 && (
        <div className="flex min-w-0 flex-col gap-1">
          <Label
            htmlFor={stampSelectId}
            className="text-2xs text-foreground/70"
          >
            {t("stamp")}
          </Label>
          <Select
            value={attributes.stamp ?? REVIEW_GRID_NO_SELECTION_VALUE}
            onValueChange={(value) =>
              onChange({
                ...attributes,
                stamp: !value || value === REVIEW_GRID_NO_SELECTION_VALUE ? null : value,
              })
            }
          >
            <SelectTrigger id={stampSelectId} className="w-full">
              <SelectValue>{attributes.stamp ?? t("stampNone")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={REVIEW_GRID_NO_SELECTION_VALUE}>
                {t("stampNone")}
              </SelectItem>
              {stampOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <Label
          htmlFor={conditionSelectId}
          className="text-2xs text-foreground/70"
        >
          {t("condition.label")}
        </Label>
        <Select
          value={attributes.condition}
          onValueChange={(value) => {
            if (isCardCondition(value))
              onChange({ ...attributes, condition: value });
          }}
        >
          <SelectTrigger id={conditionSelectId} className="w-full">
            <SelectValue>
              {t(`condition.names.${attributes.condition}`)}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {CARD_CONDITIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {t(`condition.names.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <Label
          htmlFor={languageSelectId}
          className="text-2xs text-foreground/70"
        >
          {t("language")}
        </Label>
        <Select
          value={attributes.language}
          onValueChange={(value) => {
            if (value) onChange({ ...attributes, language: value });
          }}
        >
          <SelectTrigger id={languageSelectId} className="w-full">
            <SelectValue>
              {LANGUAGE_LABELS[attributes.language] ?? attributes.language}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {LANGUAGE_LABELS[option] ?? option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
