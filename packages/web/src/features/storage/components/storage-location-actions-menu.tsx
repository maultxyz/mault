import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StorageLocationActionsMenuProps } from "@/lib/interfaces/storage";
import { storageLabelsPath } from "@/lib/constants/storage";
import { IconDots, IconEdit, IconPrinter, IconShare, IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function StorageLocationActionsMenu({
  location,
  disabled = false,
  className,
  onShare,
  onRename,
  onDelete,
}: StorageLocationActionsMenuProps) {
  const { t } = useTranslation("storage");
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={className}
            aria-label={t("page.actions", { name: location.name })}
            disabled={disabled}
          >
            <IconDots />
          </Button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onShare(location)}>
          <IconShare />
          {t("shareLink.trigger")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate(storageLabelsPath([location.guid]))}>
          <IconPrinter />
          {t("labels.printLabel")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onRename(location)}>
          <IconEdit />
          {t("page.rename")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(location)}>
          <IconTrash />
          {t("page.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
