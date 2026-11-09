import { useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";
import { OptionSheet } from "@/components/ui/option-sheet";
import { SelectField } from "@/components/ui/select-field";
import { ADMIN_DEFAULT_SYNC_LANGUAGE } from "@/lib/constants/admin-cards";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { SPACING } from "@/lib/constants/theme";
import type { CardsSyncSourceFieldsProps } from "@/lib/interfaces/admin-cards";

export function CardsSyncSourceFields({ sources, selection, onChange, disabled = false }: CardsSyncSourceFieldsProps) {
  const { t } = useTranslation();
  const [openSheet, setOpenSheet] = useState<"game" | "lang" | null>(null);
  const selectedSource = sources.find((source) => source.gameKey === selection.gameKey);
  const languages = selectedSource?.languages ?? [];
  return (
    <View style={{ gap: SPACING.md }}>
      <SelectField
        label={t("admin.cards.sync.gameLabel")}
        value={selectedSource?.label ?? null}
        placeholder={t("admin.cards.sync.gamePlaceholder")}
        disabled={disabled}
        onPress={() => setOpenSheet("game")}
      />
      {languages.length > 1 ? (
        <SelectField
          label={t("admin.cards.sync.languageLabel")}
          value={LANGUAGE_LABELS[selection.lang] ?? selection.lang}
          placeholder={t("admin.cards.sync.languagePlaceholder")}
          disabled={disabled}
          onPress={() => setOpenSheet("lang")}
        />
      ) : null}
      <OptionSheet
        visible={openSheet === "game"}
        title={t("admin.cards.sync.gameLabel")}
        options={sources.map((source) => ({ value: source.gameKey, label: source.label }))}
        selected={selection.gameKey ? [selection.gameKey] : []}
        onSelect={(gameKey) => {
          setOpenSheet(null);
          const source = sources.find((candidate) => candidate.gameKey === gameKey);
          onChange({ gameKey, lang: source?.languages[0] ?? ADMIN_DEFAULT_SYNC_LANGUAGE });
        }}
        onClose={() => setOpenSheet(null)}
      />
      <OptionSheet
        visible={openSheet === "lang"}
        title={t("admin.cards.sync.languageLabel")}
        options={languages.map((lang) => ({ value: lang, label: LANGUAGE_LABELS[lang] ?? lang }))}
        selected={[selection.lang]}
        onSelect={(lang) => {
          setOpenSheet(null);
          onChange({ ...selection, lang });
        }}
        onClose={() => setOpenSheet(null)}
      />
    </View>
  );
}
