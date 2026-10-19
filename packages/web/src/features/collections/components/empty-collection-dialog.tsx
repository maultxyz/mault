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
import { useStorageAccess } from "@/features/storage/api/use-storage-access";
import {
  useMoveCollectionsToLocation,
  useStorageLocations,
} from "@/features/storage/api/use-storage-locations";
import { StorageUpgradeNote } from "@/features/storage/components/storage-upgrade-note";
import { lastUsedLocationGuid } from "@/features/storage/lib/last-used-location";
import { EMPTY_COLLECTION_DELETE } from "@/lib/constants/collections";
import { EMPTY_BIN_NEW_LOCATION } from "@/lib/constants/storage";
import type { EmptyCollectionDialogProps } from "@/lib/interfaces/collections";
import {
  emptyBinLocationSchema,
  type EmptyBinLocationFormValues,
} from "@/schemas/storage.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function EmptyCollectionDialog({
  targets,
  onOpenChange,
  onChooseDelete,
}: EmptyCollectionDialogProps) {
  const { t } = useTranslation("collections");
  const {
    locations,
    isLoading: locationsLoading,
    create,
  } = useStorageLocations();
  const { isLocked } = useStorageAccess();
  const { moveCollections, isMoving } = useMoveCollectionsToLocation();
  const open = targets.length > 0;

  const form = useForm<EmptyBinLocationFormValues>({
    resolver: zodResolver(emptyBinLocationSchema),
    defaultValues: { locationGuid: "", newName: "" },
  });

  const latestRef = useRef({ locations, isLocked });
  latestRef.current = { locations, isLocked };

  useEffect(() => {
    if (!open || locationsLoading) return;
    const { locations, isLocked } = latestRef.current;
    form.reset({
      locationGuid: isLocked
        ? EMPTY_COLLECTION_DELETE
        : (lastUsedLocationGuid(locations) ??
          (locations.length > 0 ? "" : EMPTY_BIN_NEW_LOCATION)),
      newName: "",
    });
  }, [open, locationsLoading, form]);

  const locationGuid = form.watch("locationGuid");
  const isDelete = locationGuid === EMPTY_COLLECTION_DELETE;

  const handleSubmit = async (values: EmptyBinLocationFormValues) => {
    if (values.locationGuid === EMPTY_COLLECTION_DELETE) {
      onChooseDelete();
      return;
    }
    const guid =
      values.locationGuid === EMPTY_BIN_NEW_LOCATION
        ? await create(values.newName)
        : values.locationGuid;
    if (!guid) return;
    const moved = await moveCollections({
      guid,
      collectionGuids: targets.map((target) => target.guid),
    });
    if (moved) onOpenChange(false);
  };

  const optionLabel = (value: string) => {
    if (value === EMPTY_BIN_NEW_LOCATION) return t("emptyChoice.newBox");
    if (value === EMPTY_COLLECTION_DELETE) return t("emptyChoice.delete");
    return locations.find((l) => l.guid === value)?.name ?? "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {targets.length === 1
              ? t("emptyChoice.title", { name: targets[0].name })
              : t("emptyChoice.titleBulk", { count: targets.length })}
          </DialogTitle>
          <DialogDescription>
            {isLocked
              ? t("emptyChoice.lockedDescription")
              : t("emptyChoice.description")}
          </DialogDescription>
        </DialogHeader>
        <form
          id="empty-collection-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          {isLocked && (
            <p className="text-xs text-foreground/70">
              <StorageUpgradeNote />
            </p>
          )}
          <Controller
            name="locationGuid"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel>{t("emptyChoice.locationLabel")}</FieldLabel>
                <Select
                  value={field.value || null}
                  onValueChange={(value) => field.onChange(value ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("emptyChoice.placeholder")}>
                      {field.value ? optionLabel(field.value) : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {!isLocked &&
                      locations.map((location) => (
                        <SelectItem key={location.guid} value={location.guid}>
                          {location.name}
                        </SelectItem>
                      ))}
                    {!isLocked && (
                      <SelectItem value={EMPTY_BIN_NEW_LOCATION}>
                        {t("emptyChoice.newBox")}
                      </SelectItem>
                    )}
                    <SelectItem value={EMPTY_COLLECTION_DELETE}>
                      {t("emptyChoice.delete")}
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
                  <FieldLabel htmlFor="empty-collection-new-box">
                    {t("emptyChoice.newBoxName")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="empty-collection-new-box"
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("createDialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="empty-collection-form"
            variant={isDelete ? "destructive" : "default"}
            disabled={isMoving}
          >
            {isMoving && <IconLoader2 className="animate-spin" />}
            {isDelete ? t("emptyChoice.continue") : t("emptyChoice.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
