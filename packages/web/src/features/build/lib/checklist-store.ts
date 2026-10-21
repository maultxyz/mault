import { createChecklistStore } from "@/lib/checklist-store";
import {
  BUILD_CHECKLIST_STORAGE_KEY,
  BUILD_PARTS_CHECKLIST_STORAGE_KEY,
} from "@/lib/constants/storage-keys";

export const buildChecklistStore = createChecklistStore(
  BUILD_CHECKLIST_STORAGE_KEY,
);

export const partsChecklistStore = createChecklistStore(
  BUILD_PARTS_CHECKLIST_STORAGE_KEY,
);
