import { API_BASE } from "@/lib/constants/api";
import { SYNC_API_PATH } from "@magic-vault/shared";

export function syncApiUrl(): string {
  return `${API_BASE || window.location.origin}/api${SYNC_API_PATH}`;
}
