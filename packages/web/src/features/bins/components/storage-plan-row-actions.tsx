import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StoragePlanRowActionsProps } from "@/lib/interfaces/bins";
import {
  IconArrowDown,
  IconArrowUp,
  IconDots,
  IconEdit,
  IconX,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function StoragePlanRowActions({
  row,
  rowCount,
  disabled,
  onMove,
  onEdit,
  onRemove,
}: StoragePlanRowActionsProps) {
  const { t } = useTranslation("bins");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={t("storagePlan.actions.label", {
              name: row.location.name,
            })}
          >
            <IconDots />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={row.order === 1} onClick={() => onMove(-1)}>
          <IconArrowUp />
          {t("storagePlan.actions.moveUp")}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={row.order === rowCount}
          onClick={() => onMove(1)}
        >
          <IconArrowDown />
          {t("storagePlan.actions.moveDown")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <IconEdit />
          {t("storagePlan.actions.edit")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onRemove}>
          <IconX />
          {t("storagePlan.actions.remove")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
