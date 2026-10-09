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
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { StorageUpgradeNote } from "@/features/storage/components/storage-upgrade-note";
import {
  EMPTY_BIN_NEW_LOCATION,
  EMPTY_BIN_NO_LOCATION,
} from "@/lib/constants/storage";
import type { EmptyBinToLocationDialogProps } from "@/lib/interfaces/storage";
import {
  emptyBinLocationSchema,
  type EmptyBinLocationFormValues,
} from "@/schemas/storage.schema";
import type { StorageLocation } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

function lastUsedLocationGuid(locations: StorageLocation[]): string | null {
  let latest: StorageLocation | null = null;
  for (const location of locations) {
    if (!location.lastUsedAt) continue;
    if (
      !latest?.lastUsedAt ||
      new Date(location.lastUsedAt) > new Date(latest.lastUsedAt)
    )
      latest = location;
  }
  return latest?.guid ?? null;
}

export function EmptyBinToLocationDialog({
  binNumber,
  step,
  title,
  description,
  dismissLabel,
  preferLocation = true,
  collectionGuid,
  onOpenChange,
  onConfirm,
}: EmptyBinToLocationDialogProps) {
  const { t } = useTranslation("storage");
  const { locations, isLoading: locationsLoading, create } =
    useStorageLocations();
  const { isLocked } = useStorageAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const open = binNumber != null;
  const isLastStep = !step || step.index >= step.total;

  const form = useForm<EmptyBinLocationFormValues>({
    resolver: zodResolver(emptyBinLocationSchema),
    defaultValues: { locationGuid: "", newName: "" },
  });

  const lastPickedRef = useRef<string | null>(null);
  const latestRef = useRef({ locations, preferLocation, isLocked });
  latestRef.current = { locations, preferLocation, isLocked };

  useEffect(() => {
    if (!open || locationsLoading) return;
    const { locations, preferLocation, isLocked } = latestRef.current;
    const fallback =
      isLocked || !preferLocation
        ? EMPTY_BIN_NO_LOCATION
        : locations.length > 0
          ? ""
          : EMPTY_BIN_NEW_LOCATION;
    const lastPicked = lastPickedRef.current;
    const lastUsed =
      lastPicked && locations.some((l) => l.guid === lastPicked)
        ? lastPicked
        : lastUsedLocationGuid(locations);
    form.reset({
      locationGuid: isLocked ? fallback : (lastUsed ?? fallback),
      newName: "",
    });
  }, [open, binNumber, locationsLoading, form]);

  const locationGuid = form.watch("locationGuid");

  const handleSubmit = async (values: EmptyBinLocationFormValues) => {
    if (!open) return;
    setIsSubmitting(true);
    try {
      if (values.locationGuid === EMPTY_BIN_NO_LOCATION) {
        await onConfirm({});
        return;
      }
      const guid =
        values.locationGuid === EMPTY_BIN_NEW_LOCATION
          ? await create(values.newName)
          : values.locationGuid;
      if (!guid) return;
      lastPickedRef.current = guid;
      await onConfirm({ locationGuid: guid, collectionGuid });
    } finally {
      setIsSubmitting(false);
    }
  };

  const optionLabel = (value: string) => {
    if (value === EMPTY_BIN_NEW_LOCATION) return t("emptyDialog.newLocation");
    if (value === EMPTY_BIN_NO_LOCATION) return t("emptyDialog.noLocation");
    return locations.find((l) => l.guid === value)?.name ?? "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title ??
              (step
                ? t("emptyDialog.stepTitle", {
                    bin: binNumber,
                    index: step.index,
                    total: step.total,
                  })
                : t("emptyDialog.title", { bin: binNumber }))}
          </DialogTitle>
          <DialogDescription>
            {description ??
              (step
                ? t("emptyDialog.allFullDescription", { bin: binNumber })
                : isLocked
                  ? t("emptyDialog.lockedDescription", { bin: binNumber })
                  : t("emptyDialog.description"))}
          </DialogDescription>
        </DialogHeader>
        <form
          id="empty-bin-location-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          {isLocked ? (
            <p className="text-xs text-foreground/70">
              <StorageUpgradeNote />
            </p>
          ) : (
            <>
              <Controller
                name="locationGuid"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel>{t("emptyDialog.locationLabel")}</FieldLabel>
                    <Select
                      value={field.value || null}
                      onValueChange={(value) => field.onChange(value ?? "")}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t("emptyDialog.placeholder")}>
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
                          {t("emptyDialog.newLocation")}
                        </SelectItem>
                        <SelectItem value={EMPTY_BIN_NO_LOCATION}>
                          {t("emptyDialog.noLocation")}
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
                      <FieldLabel htmlFor="empty-bin-new-location">
                        {t("emptyDialog.newLocationName")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="empty-bin-new-location"
                        placeholder={t("emptyDialog.newLocationPlaceholder")}
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
            </>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {dismissLabel ??
              (step ? t("emptyDialog.notNow") : t("emptyDialog.cancel"))}
          </Button>
          <Button
            type="submit"
            form="empty-bin-location-form"
            disabled={isSubmitting}
          >
            {isSubmitting && <IconLoader2 className="animate-spin" />}
            {!step
              ? t("emptyDialog.confirm")
              : isLastStep
                ? t("emptyDialog.confirmResume")
                : t("emptyDialog.confirmNext")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
