import { LANGUAGE_LABELS } from "@magic-vault/shared";
import { AlertBanner } from "@/components/alert-banner";
import { useCollections } from "@/features/collections/api/use-collections";
import { IconInfoCircle } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function NonEnglishRulesBanner() {
  const { t } = useTranslation("bins");
  const { activeCollection } = useCollections();

  if (!activeCollection?.lang || activeCollection.lang === "en") return null;

  const language =
    LANGUAGE_LABELS[activeCollection.lang] ?? activeCollection.lang;

  return (
    <AlertBanner
      alert={{
        id: "non-english-rules",
        severity: "info",
        icon: IconInfoCircle,
        message: t("nonEnglishRulesBanner.message", { language }),
      }}
    />
  );
}
