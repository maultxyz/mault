import { API_BASE, getRequestAuth } from "@/lib/api/client";

export async function createAppStreamSource(
  orgId: string,
  watchGuids: string[] = [],
): Promise<EventSource> {
  const { token } = await getRequestAuth();
  const params = new URLSearchParams();
  if (token) params.set("token", token);
  params.set("orgId", orgId);
  if (watchGuids.length) params.set("guids", watchGuids.join(","));
  return new EventSource(`${API_BASE}/api/stream?${params}`);
}

export function createMonitorLinkStreamSource(token: string): EventSource {
  const params = new URLSearchParams({ share: token });
  return new EventSource(`${API_BASE}/api/stream?${params}`);
}
