import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { lastUsedLocationGuid } from "@/features/storage/lib/last-used-location";
import { EMPTY_BIN_NEW_LOCATION } from "@/lib/constants/storage";
import type { ExportedCardsDialogProps } from "@/lib/interfaces/cards";
import {
  emptyBinLocationSchema,
  type EmptyBinLocationFormValues,
} from "@/schemas/storage.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconBox, IconLoader2, IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function ExportedCardsDialog({
  open,
  count,
  isMoving,
  onOpenChange,
  onMove,
  onDelete,
}: ExportedCardsDialogProps) {
  const { t } = useTranslation("cards");
  const { t: tStorage } = useTranslation("storage");
  const { locations, isLoading: locationsLoading, create } =
    useStorageLocations();
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<EmptyBinLocationFormValues>({
    resolver: zodResolver(emptyBinLocationSchema),
    defaultValues: { locationGuid: "", newName: "" },
  });

  useEffect(() => {
    if (!open || locationsLoading) return;
    form.reset({
      locationGuid:
        lastUsedLocationGuid(locations) ??
        locations[0]?.guid ??
        EMPTY_BIN_NEW_LOCATION,
      newName: "",
    });
  }, [open, locationsLoading, locations, form]);

  const locationGuid = form.watch("locationGuid");
  const isBusy = isMoving || isCreating;

  const handleSubmit = async (values: EmptyBinLocationFormValues) => {
    let guid: string | null = values.locationGuid;
    if (guid === EMPTY_BIN_NEW_LOCATION) {
      setIsCreating(true);
      guid = await create(values.newName).finally(() => setIsCreating(false));
      if (!guid) return;
    }
    if (await onMove(guid)) onOpenChange(false);
  };

  const optionLabel = (value: string) =>
    value === EMPTY_BIN_NEW_LOCATION
      ? tStorage("emptyDialog.newLocation")
      : (locations.find((l) => l.guid === value)?.name ?? "");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("exportedDialog.title", { count })}</DialogTitle>
          <DialogDescription>
            {t("exportedDialog.description", { count })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="exported-cards-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          <Controller
            name="locationGuid"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel>{tStorage("emptyDialog.locationLabel")}</FieldLabel>
                <Select
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={tStorage("emptyDialog.placeholder")}
                    >
                      {field.value ? optionLabel(field.value) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.guid} value={location.guid}>
                        {location.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={EMPTY_BIN_NEW_LOCATION}>
                      {tStorage("emptyDialog.newLocation")}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          {locationGuid === EMPTY_BIN_NEW_LOCATION && (
            <Controller
              name="newName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid || undefined}>
                  <FieldLabel htmlFor="exported-cards-new-location">
                    {tStorage("emptyDialog.newLocationName")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="exported-cards-new-location"
                    placeholder={tStorage("emptyDialog.newLocationPlaceholder")}
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          )}
        </form>
        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline-destructive"
            disabled={isBusy}
            onClick={onDelete}
          >
            <IconTrash />
            {t("exportedDialog.delete", { count })}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              variant="outline"
              disabled={isBusy}
              onClick={() => onOpenChange(false)}
            >
              {t("cardGrid.exportedKeep")}
            </Button>
            <Button type="submit" form="exported-cards-form" disabled={isBusy}>
              {isBusy ? <IconLoader2 className="animate-spin" /> : <IconBox />}
              {t("exportedDialog.move")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
