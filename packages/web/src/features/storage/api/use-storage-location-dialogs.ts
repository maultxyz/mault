import type { StorageLocationDialogsState } from "@/lib/interfaces/storage";
import type { StorageLocation } from "@magic-vault/shared";
import { useState } from "react";

export function useStorageLocationDialogs(): StorageLocationDialogsState {
  const [createOpen, setCreateOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [menuLocation, setMenuLocation] = useState<StorageLocation | null>(
    null,
  );
  const openLocationAction = (
    location: StorageLocation,
    openDialog: (open: boolean) => void,
  ) => {
    setMenuLocation(location);
    openDialog(true);
  };
  return {
    createOpen,
    setCreateOpen,
    renameOpen,
    setRenameOpen,
    deleteOpen,
    setDeleteOpen,
    shareOpen,
    setShareOpen,
    menuLocation,
    setMenuLocation,
    openLocationAction,
  };
}
