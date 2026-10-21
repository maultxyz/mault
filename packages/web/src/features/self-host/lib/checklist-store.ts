import { createChecklistStore } from "@/lib/checklist-store";
import { SELF_HOST_CHECKLIST_STORAGE_KEY } from "@/lib/constants/storage-keys";

export const selfHostChecklistStore = createChecklistStore(
  SELF_HOST_CHECKLIST_STORAGE_KEY,
);
