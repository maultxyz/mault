import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  collectionGuidFromMoveTarget,
  collectionMoveTarget,
} from "@/features/storage/lib/move-target";
import { EMPTY_BIN_NEW_LOCATION } from "@/lib/constants/storage";
import type { LocationMoveFieldsProps } from "@/lib/interfaces/storage";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

export function LocationMoveFields({
  form,
  locations,
  showLocations = true,
  collections = [],
  idPrefix,
}: LocationMoveFieldsProps) {
  const { t } = useTranslation("storage");
  const locationGuid = form.watch("locationGuid");

  const hasCollections = collections.length > 0;

  const optionLabel = (value: string) => {
    if (value === EMPTY_BIN_NEW_LOCATION) return t("emptyDialog.newLocation");
    const collectionGuid = collectionGuidFromMoveTarget(value);
    if (collectionGuid) {
      return (
        collections.find((collection) => collection.guid === collectionGuid)
          ?.name ?? ""
      );
    }
    return locations.find((location) => location.guid === value)?.name ?? "";
  };

  return (
    <>
      <Controller
        name="locationGuid"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid || undefined}>
            <FieldLabel>
              {hasCollections
                ? t("moveDialog.targetLabel")
                : t("emptyDialog.locationLabel")}
            </FieldLabel>
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
                {showLocations && (
                  <SelectGroup>
                    {hasCollections && (
                      <SelectLabel>{t("moveDialog.locationsGroup")}</SelectLabel>
                    )}
                    {locations.map((location) => (
                      <SelectItem key={location.guid} value={location.guid}>
                        {location.name}
                      </SelectItem>
                    ))}
                    <SelectItem value={EMPTY_BIN_NEW_LOCATION}>
                      {t("emptyDialog.newLocation")}
                    </SelectItem>
                  </SelectGroup>
                )}
                {showLocations && hasCollections && <SelectSeparator />}
                {hasCollections && (
                  <SelectGroup>
                    <SelectLabel>{t("moveDialog.collectionsGroup")}</SelectLabel>
                    {collections.map((collection) => (
                      <SelectItem
                        key={collection.guid}
                        value={collectionMoveTarget(collection.guid)}
                      >
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      {locationGuid === EMPTY_BIN_NEW_LOCATION && (
        <Controller
          name="newName"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid || undefined}>
              <FieldLabel htmlFor={`${idPrefix}-new-location`}>
                {t("emptyDialog.newLocationName")}
              </FieldLabel>
              <Input
                {...field}
                id={`${idPrefix}-new-location`}
                placeholder={t("emptyDialog.newLocationPlaceholder")}
                aria-invalid={fieldState.invalid}
                autoFocus
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      )}
    </>
  );
}
