import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LANGUAGE_NATIVE_NAMES,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/constants/languages";
import { IconCheck, IconLanguage } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language as SupportedLanguage;

  return (
    <Select
      value={current}
      onValueChange={(lang) => void i18n.changeLanguage(lang!)}
    >
      <SelectTrigger id="language-switcher" className="w-40">
        <SelectValue>{LANGUAGE_NATIVE_NAMES[current] ?? current}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <SelectItem key={lang} value={lang}>
            {LANGUAGE_NATIVE_NAMES[lang]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LanguageSwitcherIcon({
  side = "right",
}: {
  side?: "right" | "top";
}) {
  const { t, i18n } = useTranslation();
  const current = i18n.language as SupportedLanguage;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-lg">
            <IconLanguage />
            <span className="sr-only">{t("settings:appearance.language")}</span>
          </Button>
        }
      />
      <DropdownMenuContent side={side} align="end">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => void i18n.changeLanguage(lang)}
          >
            <span className="flex-1">{LANGUAGE_NATIVE_NAMES[lang]}</span>
            {lang === current && (
              <IconCheck size={14} className="text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
