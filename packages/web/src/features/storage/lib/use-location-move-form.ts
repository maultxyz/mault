import { useStorageLocations } from "@/features/storage/api/use-storage-locations";
import { lastUsedLocationGuid } from "@/features/storage/lib/last-used-location";
import {
  collectionGuidFromMoveTarget,
  collectionMoveTarget,
} from "@/features/storage/lib/move-target";
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
  showLocations = true,
  collections = [],
  onMove,
  onMoveToCollection,
  onMoved,
}: LocationMoveFormOptions) {
  const {
    locations: allLocations,
    isLoading: locationsLoading,
    create,
  } = useStorageLocations({ withList: showLocations });
  const locations = useMemo(
    () =>
      allLocations.filter((location) => location.guid !== excludedLocationGuid),
    [allLocations, excludedLocationGuid],
  );
  const [isCreating, setIsCreating] = useState(false);
  const firstCollectionGuid = collections[0]?.guid;

  const form = useForm<EmptyBinLocationFormValues>({
    resolver: zodResolver(emptyBinLocationSchema),
    defaultValues: { locationGuid: "", newName: "" },
  });

  useEffect(() => {
    if (!open || (showLocations && locationsLoading)) return;
    const defaultCollectionTarget = firstCollectionGuid
      ? collectionMoveTarget(firstCollectionGuid)
      : "";
    form.reset({
      locationGuid: showLocations
        ? (lastUsedLocationGuid(locations) ??
          locations[0]?.guid ??
          EMPTY_BIN_NEW_LOCATION)
        : defaultCollectionTarget,
      newName: "",
    });
  }, [open, showLocations, locationsLoading, locations, firstCollectionGuid, form]);

  const submit = form.handleSubmit(
    async ({ locationGuid, newName }: EmptyBinLocationFormValues) => {
      const collectionGuid = collectionGuidFromMoveTarget(locationGuid);
      if (collectionGuid) {
        if (onMoveToCollection && (await onMoveToCollection(collectionGuid))) {
          onMoved();
        }
        return;
      }
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
