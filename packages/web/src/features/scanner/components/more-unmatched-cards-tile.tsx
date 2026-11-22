import type { MoreUnmatchedCardsTileProps } from "@/lib/interfaces/scanner";
import { IconQuestionMark } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function MoreUnmatchedCardsTile({
  hiddenCount,
  onOpen,
}: MoreUnmatchedCardsTileProps) {
  const { t } = useTranslation("cards");
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex aspect-[2.5/3.5] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-card border-2 border-dashed border-destructive bg-card p-2 text-center text-sm font-medium"
    >
      <IconQuestionMark className="size-5 text-destructive" />
      {t("cardGrid.moreUnmatched", { count: hiddenCount })}
    </button>
  );
}
