import {
  PENDING_SCAN_SAVES_DB_NAME,
  PENDING_SCAN_SAVES_DB_VERSION,
  PENDING_SCAN_SAVES_STORE_NAME,
} from "@/lib/constants/scanner";
import type { PendingScanSave } from "@/lib/interfaces/scanner";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(
      PENDING_SCAN_SAVES_DB_NAME,
      PENDING_SCAN_SAVES_DB_VERSION,
    );
    request.onupgradeneeded = () => {
      if (
        !request.result.objectStoreNames.contains(PENDING_SCAN_SAVES_STORE_NAME)
      ) {
        request.result.createObjectStore(PENDING_SCAN_SAVES_STORE_NAME, {
          keyPath: "scanId",
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((err) => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
}

async function runWrite(
  write: (store: IDBObjectStore) => void,
): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(PENDING_SCAN_SAVES_STORE_NAME, "readwrite");
    write(tx.objectStore(PENDING_SCAN_SAVES_STORE_NAME));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function putPendingScanSave(save: PendingScanSave): Promise<void> {
  try {
    await runWrite((store) => store.put(save));
  } catch (err) {
    console.error("Failed to persist pending scan save:", err);
  }
}

export async function deletePendingScanSave(scanId: string): Promise<void> {
  try {
    await runWrite((store) => store.delete(scanId));
  } catch (err) {
    console.error("Failed to delete pending scan save:", err);
  }
}

export async function listPendingScanSaves(): Promise<PendingScanSave[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(PENDING_SCAN_SAVES_STORE_NAME, "readonly");
      const req = tx.objectStore(PENDING_SCAN_SAVES_STORE_NAME).getAll();
      req.onsuccess = () => resolve((req.result as PendingScanSave[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error("Failed to read pending scan saves:", err);
    return [];
  }
}
