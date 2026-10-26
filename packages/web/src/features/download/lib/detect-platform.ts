import type { DesktopPlatform } from "@/lib/interfaces/download";

export function detectDesktopPlatform(): DesktopPlatform | null {
  if (typeof navigator === "undefined") return null;
  const agent = navigator.userAgent.toLowerCase();
  if (/android|iphone|ipad|ipod/.test(agent)) return null;
  if (agent.includes("windows")) return "windows";
  if (agent.includes("mac os") || agent.includes("macintosh")) return null;
  if (agent.includes("linux") || agent.includes("x11")) return "linux";
  return null;
}
