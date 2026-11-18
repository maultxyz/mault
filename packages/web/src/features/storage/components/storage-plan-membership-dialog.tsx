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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { STORAGE_PLAN_PRESET_SELECT_ID } from "@/lib/constants/storage";
import type { StoragePlanMembershipDialogProps } from "@/lib/interfaces/storage";
import type { BinSet } from "@magic-vault/shared";
import { IconLoader2 } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export function StoragePlanMembershipDialog({
  open,
  onOpenChange,
  action,
  count,
  onSubmit,
}: StoragePlanMembershipDialogProps) {
  const { t } = useTranslation("storage");
  const { data: sets = [] } = useQuery({ ...binsQueryOptions, enabled: open });
  const [presetGuid, setPresetGuid] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const presets =
    action === "remove"
      ? sets.filter((set) => set.fillStorageLocationGuids.length > 0)
      : sets;
  const presetLabel = (set: BinSet) =>
    set.game
      ? t("bulk.presetWithGame", { preset: set.name, game: set.game.name })
      : set.name;
  const chosen = presets.find((set) => set.guid === presetGuid);

  const submit = async () => {
    if (!presetGuid) return;
    setIsSaving(true);
    const saved = await onSubmit(presetGuid);
    setIsSaving(false);
    if (saved) {
      setPresetGuid(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} drawerOnMobile={false}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t(
              action === "add"
                ? "bulk.addToPlanTitle"
                : "bulk.removeFromPlanTitle",
              { count },
            )}
          </DialogTitle>
          <DialogDescription>
            {t(
              action === "add"
                ? "bulk.addToPlanDescription"
                : "bulk.removeFromPlanDescription",
            )}
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={STORAGE_PLAN_PRESET_SELECT_ID}>
            {t("bulk.presetLabel")}
          </FieldLabel>
          <Select
            value={presetGuid}
            onValueChange={(next) => setPresetGuid(next)}
          >
            <SelectTrigger
              id={STORAGE_PLAN_PRESET_SELECT_ID}
              className="w-full"
            >
              <SelectValue placeholder={t("bulk.presetPlaceholder")}>
                {chosen ? presetLabel(chosen) : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {presets.map((set) => (
                <SelectItem key={set.guid} value={set.guid}>
                  {presetLabel(set)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("nameDialog.cancel")}
          </Button>
          <Button
            disabled={!presetGuid || isSaving}
            onClick={() => void submit()}
          >
            {isSaving && (
              <IconLoader2 className="animate-spin motion-reduce:animate-none" />
            )}
            {t(action === "add" ? "bulk.addToPlan" : "bulk.removeFromPlan")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
