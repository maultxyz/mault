import { SERIAL_BOOT_MATCH_TOLERANCE_MS } from "@/lib/constants/firmware";
import { SORTER_BOOT_NOTICES_STORAGE_KEY } from "@/lib/constants/storage-keys";

export function claimBootNotice(hardwareId: string, uptimeMs: number): boolean {
  const bootAt = Date.now() - uptimeMs;
  try {
    const raw = localStorage.getItem(SORTER_BOOT_NOTICES_STORAGE_KEY);
    const notices: Record<string, number> = raw ? JSON.parse(raw) : {};
    const noticedBootAt = notices[hardwareId];
    if (
      typeof noticedBootAt === "number" &&
      Math.abs(noticedBootAt - bootAt) < SERIAL_BOOT_MATCH_TOLERANCE_MS
    ) {
      return false;
    }
    notices[hardwareId] = bootAt;
    localStorage.setItem(
      SORTER_BOOT_NOTICES_STORAGE_KEY,
      JSON.stringify(notices),
    );
  } catch {}
  return true;
}
