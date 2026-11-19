import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCollections } from "@/features/collections/api/use-collections";
import { ShareMonitorLinkDialog } from "@/features/collections/components/share-monitor-link-dialog";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { ShareStorageLinkDialog } from "@/features/storage/components/share-storage-link-dialog";
import type { TradeLinkSource, TradeLinkSourceDialogProps } from "@/lib/interfaces/trade-offers";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

export function TradeLinkSourceDialog({ open, onOpenChange }: TradeLinkSourceDialogProps) {
  const { t } = useTranslation("common");
  const sourceSelectId = useId();
  const { collections } = useCollections();
  const { locations } = useStorageLocations();
  const [selectedValue, setSelectedValue] = useState("");
  const [chosenSource, setChosenSource] = useState<TradeLinkSource | null>(null);
  const sources: TradeLinkSource[] = [
    ...collections.map((collection) => ({ kind: "collection" as const, guid: collection.guid, name: collection.name })),
    ...locations.map((location) => ({ kind: "storage" as const, guid: location.guid, name: location.name })),
  ];
  const sourceValue = (source: TradeLinkSource) => `${source.kind}:${source.guid}`;
  const selectedSource = sources.find((source) => sourceValue(source) === selectedValue) ?? null;
  const closeShareDialog = (isOpen: boolean) => {
    if (!isOpen) setChosenSource(null);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          onOpenChange(isOpen);
          if (!isOpen) setSelectedValue("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tradeOffers.newTrade.linkTitle")}</DialogTitle>
            <DialogDescription>{t("tradeOffers.newTrade.linkDescription")}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor={sourceSelectId}>{t("tradeOffers.newTrade.sourceLabel")}</FieldLabel>
            <Select value={selectedValue} onValueChange={(value) => setSelectedValue(String(value ?? ""))}>
              <SelectTrigger id={sourceSelectId}>
                <SelectValue placeholder={t("tradeOffers.newTrade.sourcePlaceholder")}>
                  {selectedSource?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {collections.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>{t("tradeOffers.newTrade.collections")}</SelectLabel>
                    {sources
                      .filter((source) => source.kind === "collection")
                      .map((source) => (
                        <SelectItem key={sourceValue(source)} value={sourceValue(source)}>
                          {source.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                )}
                {locations.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>{t("tradeOffers.newTrade.storageLocations")}</SelectLabel>
                    {sources
                      .filter((source) => source.kind === "storage")
                      .map((source) => (
                        <SelectItem key={sourceValue(source)} value={sourceValue(source)}>
                          {source.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("actions.cancel")}
            </Button>
            <Button
              disabled={!selectedSource}
              onClick={() => {
                setChosenSource(selectedSource);
                setSelectedValue("");
                onOpenChange(false);
              }}
            >
              {t("tradeOffers.newTrade.continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {chosenSource?.kind === "collection" && (
        <ShareMonitorLinkDialog
          collectionGuid={chosenSource.guid}
          open
          onOpenChange={closeShareDialog}
          startsWithNewTradeLink
        />
      )}
      {chosenSource?.kind === "storage" && (
        <ShareStorageLinkDialog
          locationGuid={chosenSource.guid}
          open
          onOpenChange={closeShareDialog}
          startsWithNewTradeLink
        />
      )}
    </>
  );
}
