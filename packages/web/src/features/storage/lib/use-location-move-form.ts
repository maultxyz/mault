import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { lastUsedLocationGuid } from "@/features/storage/lib/last-used-location";
import { EMPTY_BIN_NEW_LOCATION } from "@/lib/constants/storage";
import type { LocationMoveFormOptions } from "@/lib/interfaces/storage";
import {
  emptyBinLocationSchema,
  type EmptyBinLocationFormValues,
} from "@/schemas/storage.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

export function useLocationMoveForm({
  open,
  excludedLocationGuid,
  onMove,
  onMoved,
}: LocationMoveFormOptions) {
  const {
    locations: allLocations,
    isLoading: locationsLoading,
    create,
  } = useStorageLocations();
  const locations = useMemo(
    () =>
      allLocations.filter((location) => location.guid !== excludedLocationGuid),
    [allLocations, excludedLocationGuid],
  );
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

  const submit = form.handleSubmit(
    async ({ locationGuid, newName }: EmptyBinLocationFormValues) => {
      let targetGuid: string | null = locationGuid;
      if (targetGuid === EMPTY_BIN_NEW_LOCATION) {
        setIsCreating(true);
        targetGuid = await create(newName).finally(() => setIsCreating(false));
        if (!targetGuid) return;
      }
      if (await onMove(targetGuid)) onMoved();
    },
  );

  return { form, locations, submit, isCreating };
}
