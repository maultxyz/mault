import type {
  StoredStoragePickList,
  StoredStorageVerify,
} from "../interfaces/storage-locations.interface";

export const EMPTY_STORED_STORAGE_PICK_LIST: StoredStoragePickList = {
  decklist: "",
  pickedScanIds: [],
};

export const STORAGE_PICK_LIST_STORAGE_KEY_PREFIX = "mault:storage-pick-list:";

export const EMPTY_STORED_STORAGE_VERIFY: StoredStorageVerify = {
  verifiedScanIds: [],
  notInLocationCardNames: [],
};

export const STORAGE_VERIFY_STORAGE_KEY_PREFIX = "mault:storage-verify:";
