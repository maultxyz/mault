export function describeUserAgent(ua: string | null | undefined): { label: string; isMobile: boolean } {
  if (!ua) return { label: "", isMobile: false };
  const isMobile = /iPad|Tablet|Mobi|Android|iPhone|okhttp|Darwin|CFNetwork|Expo/i.test(ua);

  let client = "";
  if (/okhttp|Expo|CFNetwork|Darwin/i.test(ua)) client = "Mault app";
  else if (/Edg\//.test(ua)) client = "Edge";
  else if (/OPR\//.test(ua)) client = "Opera";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) client = "Chrome";
  else if (/Firefox\//.test(ua)) client = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) client = "Safari";

  let os = "";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Android|okhttp/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod|Darwin|CFNetwork/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";

  return { label: [client, os].filter(Boolean).join(" on "), isMobile };
}
