import { Label } from "@/components/ui/label";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAddManualCard } from "@/features/cards/api/use-add-manual-card";
import { CardSearchPicker } from "@/features/cards/components/card-search-picker";
import { useCollections } from "@/features/collections/api/use-collections";
import type { AddCardDialogProps } from "@/lib/interfaces/cards";
import type { PlayingCard } from "@magic-vault/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function AddCardDialog({
  open,
  onOpenChange,
  collectionGuid,
  locationGuid,
}: AddCardDialogProps) {
  const { t } = useTranslation("cards");
  const { collections, activeCollection } = useCollections();
  const { addCard, isAdding } = useAddManualCard();
  const [pickedGuid, setPickedGuid] = useState<string | null>(null);
  const targetGuid =
    collectionGuid ??
    pickedGuid ??
    activeCollection?.guid ??
    collections[0]?.guid;
  const collectionName = (guid: string | undefined) =>
    collections.find((c) => c.guid === guid)?.name ?? "";

  const handleSelect = async (card: PlayingCard) => {
    if (!targetGuid || isAdding) return;
    if (await addCard({ collectionGuid: targetGuid, card, locationGuid })) {
      onOpenChange(false);
    }
  };

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("addCard.title")}
      description={t("addCard.description")}
      className="sm:max-w-2xl data-[vaul-drawer-direction=bottom]:max-h-[90dvh]"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {!collectionGuid && (
          <div className="flex flex-col gap-1.5">
            <Label>{t("addCard.collection")}</Label>
            <Select
              value={targetGuid ?? null}
              onValueChange={(value) => setPickedGuid(value as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>{collectionName(targetGuid)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {collections.map((collection) => (
                  <SelectItem key={collection.guid} value={collection.guid}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <CardSearchPicker
          key={targetGuid}
          collectionGuid={targetGuid}
          disabled={isAdding || !targetGuid}
          onSelect={(card) => void handleSelect(card)}
        />
      </div>
    </DynamicDialog>
  );
}
