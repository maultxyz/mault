import { API_BASE } from "@/lib/api/client";
import { getAuthSession } from "@/lib/auth/session";

export async function createAppStreamSource(
  orgId: string,
  watchGuids: string[] = [],
): Promise<EventSource> {
  const session = await getAuthSession();
  const params = new URLSearchParams();
  if (session?.token) params.set("token", session.token);
  params.set("orgId", orgId);
  if (watchGuids.length) params.set("guids", watchGuids.join(","));
  return new EventSource(`${API_BASE}/api/stream?${params}`);
}
