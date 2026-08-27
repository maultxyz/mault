import { API_BASE, getAuthHeaders } from "@/lib/api/client";

// apiPost/apiDelete/etc. (lib/api/client.ts) throw a generic
// "API error: <status>" on any non-ok response without ever reading the
// body, so a real server message like "Invalid email or password" never
// reaches the caller - fine for most data calls (which just toast a generic
// failure), but not for auth flows where showing the actual reason matters.
// Deliberately local-mode-only and separate from apiPost/apiDelete
// themselves rather than changing that shared behavior, which dozens of
// call sites in both auth modes depend on. Callers should check the parsed
// body's own `success`/`message` fields - these never throw for a non-2xx
// response, only for a genuine network/parse failure.
export async function localPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function localDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { ...(await getAuthHeaders()) },
  });
  return res.json();
}
