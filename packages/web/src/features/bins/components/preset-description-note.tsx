import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import { IconNotes } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function PresetDescriptionNote() {
  const { t } = useTranslation("bins");
  const { selectedSet } = useBinConfigs();
  const description = selectedSet?.description?.trim();
  if (!description) return null;

  return (
    <section
      aria-label={t("presetSelector.descriptionLabel")}
      className="flex items-start gap-2 rounded-card bg-card p-3 md:p-2.5"
    >
      <IconNotes aria-hidden className="mt-0.5 size-4 shrink-0 text-foreground/70" />
      <p className="min-w-0 whitespace-pre-line break-words text-sm text-foreground">{description}</p>
    </section>
  );
}
