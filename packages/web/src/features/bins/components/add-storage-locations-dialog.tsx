import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { storageLocationFillText } from "@/features/storage/lib/storage-location-fill";
import { ADD_STORAGE_LOCATIONS_SEARCH_ID } from "@/lib/constants/bins";
import type { AddStorageLocationsDialogProps } from "@/lib/interfaces/bins";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export function AddStorageLocationsDialog({
  open,
  onOpenChange,
  locations,
  onAdd,
}: AddStorageLocationsDialogProps) {
  const { t } = useTranslation("bins");
  const { t: tStorage } = useTranslation("storage");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(new Set());
    }
  }, [open]);

  const trimmedQuery = query.trim().toLowerCase();
  const visible = trimmedQuery
    ? locations.filter((location) =>
        location.name.toLowerCase().includes(trimmedQuery),
      )
    : locations;
  const allVisibleSelected =
    visible.length > 0 && visible.every((location) => selected.has(location.guid));
  const toggle = (guid: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(guid);
      else next.delete(guid);
      return next;
    });
  const toggleVisible = (checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      for (const location of visible) {
        if (checked) next.add(location.guid);
        else next.delete(location.guid);
      }
      return next;
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("storagePlan.addDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("storagePlan.addDialog.description")}
          </DialogDescription>
        </DialogHeader>
        {locations.length === 0 ? (
          <p className="text-control text-foreground/70">
            {t("storagePlan.addDialog.none")}
          </p>
        ) : (
          <div className="flex min-h-0 flex-col gap-2">
            <Input
              id={ADD_STORAGE_LOCATIONS_SEARCH_ID}
              type="search"
              value={query}
              autoFocus
              aria-label={t("storagePlan.addDialog.search")}
              placeholder={t("storagePlan.addDialog.search")}
              onChange={(event) => setQuery(event.target.value)}
            />
            {visible.length === 0 ? (
              <p className="text-control text-foreground/70">
                {t("storagePlan.addDialog.noMatches")}
              </p>
            ) : (
              <div className="flex max-h-80 min-h-0 flex-col overflow-y-auto rounded-lg bg-foreground/6 p-1">
                <Label className="flex items-center gap-2 rounded-md px-2 py-1.5 font-medium">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={(checked) => toggleVisible(checked === true)}
                  />
                  {t("storagePlan.addDialog.selectAll")}
                </Label>
                {visible.map((location) => (
                  <Label
                    key={location.guid}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 font-normal"
                  >
                    <Checkbox
                      checked={selected.has(location.guid)}
                      onCheckedChange={(checked) =>
                        toggle(location.guid, checked === true)
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{location.name}</span>
                    <span className="shrink-0 text-xs tabular-nums text-foreground/70">
                      {storageLocationFillText(location, tStorage) ??
                        t("storagePlan.addDialog.noCapacity")}
                    </span>
                  </Label>
                ))}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("storagePlan.addDialog.cancel")}
          </Button>
          <Button
            disabled={selected.size === 0}
            onClick={() => {
              onAdd(
                locations
                  .filter((location) => selected.has(location.guid))
                  .map((location) => location.guid),
              );
              onOpenChange(false);
            }}
          >
            {t("storagePlan.addDialog.submit", { count: selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
