import { Button } from "@/components/ui/button";
import type { OrgProfileReorderButtonsProps } from "@/lib/interfaces/org-profile";
import { IconArrowDown, IconArrowUp, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function OrgProfileReorderButtons({
  itemLabel,
  index,
  count,
  disabled,
  onMove,
  onRemove,
}: OrgProfileReorderButtonsProps) {
  const { t } = useTranslation("org-profile");
  return (
    <div className="flex shrink-0 gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("reorder.moveUp", { name: itemLabel })}
        disabled={disabled || index === 0}
        onClick={() => onMove(index, index - 1)}
      >
        <IconArrowUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("reorder.moveDown", { name: itemLabel })}
        disabled={disabled || index === count - 1}
        onClick={() => onMove(index, index + 1)}
      >
        <IconArrowDown />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("reorder.remove", { name: itemLabel })}
        disabled={disabled}
        onClick={onRemove}
      >
        <IconTrash />
      </Button>
    </div>
  );
}
