import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useCardActions } from "@/features/cards/api/use-card-actions";
import type { CardContextMenuProps } from "@/lib/interfaces/cards";
import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconSparkles,
  IconSquareCheck,
  IconSquare,
  IconTrash,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function CardContextMenu({
  entry,
  isSelected,
  onOpen,
  onToggleSelect,
  children,
}: CardContextMenuProps) {
  const { t } = useTranslation("cards");
  const {
    canConfirm,
    currentFoil,
    foilOptions,
    confirm,
    setFoil,
    copyName,
    remove,
  } = useCardActions(entry);

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div />}>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuLabel>{entry.card.name}</ContextMenuLabel>
        </ContextMenuGroup>
        <ContextMenuItem onClick={onOpen}>
          <IconExternalLink />
          {t("cardContextMenu.open")}
        </ContextMenuItem>
        <ContextMenuItem onClick={onToggleSelect}>
          {isSelected ? <IconSquareCheck /> : <IconSquare />}
          {isSelected
            ? t("cardContextMenu.deselect")
            : t("cardContextMenu.select")}
        </ContextMenuItem>
        {canConfirm && (
          <ContextMenuItem onClick={confirm}>
            <IconCheck />
            {t("cardContextMenu.markCorrect")}
          </ContextMenuItem>
        )}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <IconSparkles />
            {t("cardContextMenu.foil")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => setFoil(null)}>
              {currentFoil == null ? (
                <IconCheck />
              ) : (
                <span className="size-3.5" />
              )}
              {t("cardContextMenu.nonFoil")}
            </ContextMenuItem>
            {foilOptions.map((option) => (
              <ContextMenuItem key={option} onClick={() => setFoil(option)}>
                {currentFoil === option ? (
                  <IconCheck />
                ) : (
                  <span className="size-3.5" />
                )}
                {option}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuItem onClick={() => void copyName()}>
          <IconCopy />
          {t("cardContextMenu.copyName")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onClick={remove}>
          <IconTrash />
          {t("cardContextMenu.remove", { count: entry.scanIds.length })}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
