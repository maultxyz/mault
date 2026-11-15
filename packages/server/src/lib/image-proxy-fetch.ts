import { CARD_API_USER_AGENT } from "./constants/card-search";
import {
  IMAGE_PROXY_MAX_BYTES,
  IMAGE_PROXY_MAX_REDIRECTS,
} from "./constants/urls";
import type { ProxiedImage } from "./interfaces/image-proxy";

async function readBodyUpTo(
  response: Response,
  maxBytes: number,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (declaredLength > maxBytes) {
    await response.body?.cancel();
    return null;
  }
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function fetchProxiedImage(
  url: string,
  isAllowedUrl: (url: URL) => boolean,
): Promise<ProxiedImage | null> {
  let currentUrl = new URL(url);
  for (let redirects = 0; redirects <= IMAGE_PROXY_MAX_REDIRECTS; redirects++) {
    if (!isAllowedUrl(currentUrl)) return null;
    const upstream = await fetch(currentUrl.toString(), {
      headers: { "User-Agent": CARD_API_USER_AGENT, Accept: "image/*" },
      redirect: "manual",
    });
    const location = upstream.headers.get("location");
    if (upstream.status >= 300 && upstream.status < 400 && location) {
      await upstream.body?.cancel();
      currentUrl = new URL(location, currentUrl);
      continue;
    }
    const contentType = upstream.headers.get("content-type") ?? "";
    if (
      !upstream.ok ||
      !contentType.startsWith("image/") ||
      contentType.startsWith("image/svg")
    ) {
      await upstream.body?.cancel();
      return null;
    }
    const body = await readBodyUpTo(upstream, IMAGE_PROXY_MAX_BYTES);
    return body ? { body, contentType } : null;
  }
  return null;
}
