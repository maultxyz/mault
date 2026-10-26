import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import type { CardSearchLanguageSelectProps } from "@/lib/interfaces/cards";
import { CARD_LANGUAGES, CARD_SEARCH_ALL_LANGUAGES } from "@magic-vault/shared";
import { useTranslation } from "react-i18next";

export function CardSearchLanguageSelect({
  value,
  onChange,
}: CardSearchLanguageSelectProps) {
  const { t } = useTranslation("cards");
  const labelFor = (language: string) =>
    language === CARD_SEARCH_ALL_LANGUAGES
      ? t("cardPicker.allLanguages")
      : (LANGUAGE_LABELS[language] ?? language);

  return (
    <Select
      value={value}
      onValueChange={(language) => {
        if (language) onChange(language);
      }}
    >
      <SelectTrigger className="w-40 shrink-0" aria-label={t("language")}>
        <SelectValue>{labelFor(value)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {[CARD_SEARCH_ALL_LANGUAGES, ...CARD_LANGUAGES].map((language) => (
          <SelectItem key={language} value={language}>
            {labelFor(language)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
