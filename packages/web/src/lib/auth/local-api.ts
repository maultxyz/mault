import { API_BASE, getAuthHeaders } from "@/lib/api/client";

// apiPost/apiDelete (lib/api/client.ts) throw a generic "API error: <status>"
// without reading the body, losing real messages like "Invalid email or
// password" - fine for most data calls, but not auth flows. Kept separate
// rather than changing that shared behavior, which other call sites depend
// on. Callers should check the parsed body's `success`/`message` fields;
// these only throw on a genuine network/parse failure, never a non-2xx status.
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
