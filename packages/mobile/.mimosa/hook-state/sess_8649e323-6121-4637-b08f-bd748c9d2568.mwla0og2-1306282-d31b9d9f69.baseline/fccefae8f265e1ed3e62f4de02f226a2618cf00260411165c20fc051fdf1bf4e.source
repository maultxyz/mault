import { useTranslation } from "react-i18next";
import { AppText } from "@/components/ui/app-text";
import { Surface } from "@/components/ui/surface";
import { COMM_LOG_VISIBLE_ENTRIES } from "@/lib/constants/sorter";
import type { CommLogProps } from "@/lib/interfaces/ui";

export function CommLog({ entries }: CommLogProps) {
  const { t } = useTranslation();
  const visible = entries.slice(-COMM_LOG_VISIBLE_ENTRIES).reverse();
  if (visible.length === 0) {
    return (
      <Surface>
        <AppText tone="secondary">{t("sorter.commLogEmpty")}</AppText>
      </Surface>
    );
  }
  return (
    <Surface style={{ gap: 2 }}>
      {visible.map((entry, index) => (
        <AppText
          key={`${entry.timestamp}-${index}`}
          size="2xs"
          mono
          tone={entry.direction === "sent" ? "primary" : "default"}
          numberOfLines={3}
        >
          {`${entry.direction === "sent" ? "→" : "←"} ${entry.text}`}
        </AppText>
      ))}
    </Surface>
  );
}
