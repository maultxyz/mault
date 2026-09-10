import { useCollections } from "@/features/collections/api/use-collections";
import { LANGUAGE_LABELS } from "@/lib/constants/languages";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function NonEnglishRulesBanner() {
  const { t } = useTranslation("bins");
  const { activeCollection } = useCollections();

  if (!activeCollection?.lang || activeCollection.lang === "en") return null;

  const language =
    LANGUAGE_LABELS[activeCollection.lang] ?? activeCollection.lang;

  return (
    <div className="flex items-start gap-2 border-b border-blue-500/30 bg-blue-400/10 px-4 py-2 text-xs text-blue-900 dark:bg-blue-400/10 dark:text-blue-200">
      <IconInfoCircle className="size-3.5 shrink-0 mt-0.5" />
      <span>{t("nonEnglishRulesBanner.message", { language })}</span>
    </div>
  );
}
