import { DeleteDialog } from "@/components/delete-dialog";
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
import { StorageDeleteWarning } from "@/features/cards/components/storage-delete-warning";
import type { CardContextMenuProps } from "@/lib/interfaces/cards";
import {
  IconCheck,
  IconCopy,
  IconExternalLink,
  IconRosette,
  IconSparkles,
  IconSquareCheck,
  IconSquare,
  IconTrash,
} from "@tabler/icons-react";
import { CARD_CONDITIONS } from "@magic-vault/shared";
import { useState } from "react";
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
    currentCondition,
    confirm,
    setFoil,
    setCondition,
    copyName,
    remove,
  } = useCardActions(entry);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);
  const storedCount = entry.storedCount ?? (entry.storageLocation ? 1 : 0);
  const requestRemove = () =>
    storedCount > 0 ? setConfirmRemoveOpen(true) : remove();

  return (
    <>
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
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <IconRosette />
              {t("condition.label")}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {CARD_CONDITIONS.map((option) => (
                <ContextMenuItem
                  key={option}
                  onClick={() => setCondition(option)}
                >
                  {currentCondition === option ? (
                    <IconCheck />
                  ) : (
                    <span className="size-3.5" />
                  )}
                  {t(`condition.names.${option}`)}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onClick={() => void copyName()}>
            <IconCopy />
            {t("cardContextMenu.copyName")}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem variant="destructive" onClick={requestRemove}>
            <IconTrash />
            {t("cardContextMenu.remove", { count: entry.scanIds.length })}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <DeleteDialog
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        title={t("cardGrid.deleteCardsTitle", { count: entry.scanIds.length })}
        description={t("cardGrid.deleteCardsDescription", {
          count: entry.scanIds.length,
        })}
        onConfirm={remove}
      >
        <StorageDeleteWarning
          storedCount={storedCount}
          total={entry.scanIds.length}
          location={entry.storageLocation}
          className="mt-4"
        />
      </DeleteDialog>
    </>
  );
}
