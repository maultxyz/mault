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
import { Switch } from "@/components/ui/switch";
import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { StorageLocationSelect } from "@/features/storage/components/storage-location-select";
import { lastUsedLocationGuid } from "@/features/storage/lib/last-used-location";
import {
  EMPTY_BIN_NEW_LOCATION,
  EMPTY_BIN_NO_LOCATION,
} from "@/lib/constants/storage";
import type { EmptyAllBinsDialogProps } from "@/lib/interfaces/storage";
import {
  emptyAllBinsSchema,
  type EmptyAllBinsFormValues,
} from "@/schemas/storage.schema";
import type { EmptyAllBinLocation } from "@magic-vault/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconLoader2 } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function EmptyAllBinsDialog({
  open,
  bins,
  preferLocation,
  collectionGuid,
  onOpenChange,
  onConfirm,
}: EmptyAllBinsDialogProps) {
  const { t } = useTranslation("storage");
  const {
    locations,
    isLoading: locationsLoading,
    create,
  } = useStorageLocations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalCards = bins.reduce((sum, bin) => sum + bin.count, 0);

  const form = useForm<EmptyAllBinsFormValues>({
    resolver: zodResolver(emptyAllBinsSchema),
    defaultValues: {
      perBin: false,
      all: { locationGuid: "", newName: "" },
      bins: [],
    },
  });

  const latestRef = useRef({ locations, bins, preferLocation });
  latestRef.current = { locations, bins, preferLocation };

  useEffect(() => {
    if (!open || locationsLoading) return;
    const { locations, bins, preferLocation } = latestRef.current;
    const initial = preferLocation
      ? (lastUsedLocationGuid(locations) ??
        locations[0]?.guid ??
        EMPTY_BIN_NEW_LOCATION)
      : EMPTY_BIN_NO_LOCATION;
    form.reset({
      perBin: false,
      all: { locationGuid: initial, newName: "" },
      bins: bins.map((bin) => ({
        binNumber: bin.binNumber,
        locationGuid: initial,
        newName: "",
      })),
    });
  }, [open, locationsLoading, form]);

  const perBin = form.watch("perBin");
  const allLocation = form.watch("all.locationGuid");
  const binChoices = form.watch("bins");

  const handleSubmit = async (values: EmptyAllBinsFormValues) => {
    setIsSubmitting(true);
    try {
      const choices = values.perBin
        ? values.bins
        : values.bins.map((bin) => ({
            ...values.all,
            binNumber: bin.binNumber,
          }));
      const created = new Map<string, string>();
      const assignments: EmptyAllBinLocation[] = [];
      for (const choice of choices) {
        if (choice.locationGuid === EMPTY_BIN_NO_LOCATION) continue;
        let locationGuid = choice.locationGuid;
        if (locationGuid === EMPTY_BIN_NEW_LOCATION) {
          const name = choice.newName.trim();
          const key = name.toLowerCase();
          const guid = created.get(key) ?? (await create(name));
          if (!guid) return;
          created.set(key, guid);
          locationGuid = guid;
        }
        assignments.push({ binNumber: choice.binNumber, locationGuid });
      }
      const ok = await onConfirm(
        assignments.length > 0
          ? { collectionGuid, locations: assignments }
          : {},
      );
      if (ok) onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("emptyAllDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("emptyAllDialog.description", { count: totalCards })}
          </DialogDescription>
        </DialogHeader>
        <form
          id="empty-all-bins-form"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex min-h-0 flex-col gap-4"
        >
          <Controller
            control={form.control}
            name="perBin"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground/70">
                  {t("emptyAllDialog.perBin")}
                </span>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </label>
            )}
          />

          {perBin ? (
            <div className="-mx-1 flex max-h-80 flex-col gap-3 overflow-y-auto px-1">
              {binChoices.map((bin, index) => (
                <div key={bin.binNumber} className="flex flex-col gap-2">
                  <Controller
                    control={form.control}
                    name={`bins.${index}.locationGuid`}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid || undefined}>
                        <FieldLabel htmlFor={`empty-all-bin-${bin.binNumber}`}>
                          {t("emptyAllDialog.binLabel", {
                            bin: bin.binNumber,
                            count: bins[index]?.count ?? 0,
                          })}
                        </FieldLabel>
                        <StorageLocationSelect
                          id={`empty-all-bin-${bin.binNumber}`}
                          value={field.value}
                          onChange={field.onChange}
                          invalid={fieldState.invalid}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                  {bin.locationGuid === EMPTY_BIN_NEW_LOCATION && (
                    <Controller
                      control={form.control}
                      name={`bins.${index}.newName`}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid || undefined}>
                          <Input
                            {...field}
                            aria-label={t("emptyDialog.newLocationName")}
                            placeholder={t(
                              "emptyDialog.newLocationPlaceholder",
                            )}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && (
                            <FieldError errors={[fieldState.error]} />
                          )}
                        </Field>
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <Controller
                control={form.control}
                name="all.locationGuid"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="empty-all-location">
                      {t("emptyDialog.locationLabel")}
                    </FieldLabel>
                    <StorageLocationSelect
                      id="empty-all-location"
                      value={field.value}
                      onChange={field.onChange}
                      invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              {allLocation === EMPTY_BIN_NEW_LOCATION && (
                <Controller
                  control={form.control}
                  name="all.newName"
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid || undefined}>
                      <FieldLabel htmlFor="empty-all-new-location">
                        {t("emptyDialog.newLocationName")}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="empty-all-new-location"
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
            {t("emptyDialog.cancel")}
          </Button>
          <Button
            type="submit"
            form="empty-all-bins-form"
            disabled={isSubmitting}
          >
            {isSubmitting && <IconLoader2 className="animate-spin" />}
            {t("emptyAllDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
