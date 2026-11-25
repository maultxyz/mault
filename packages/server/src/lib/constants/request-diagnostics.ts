export const REQUEST_DIAGNOSTICS_SLOW_MS = 2_000;
export const REQUEST_DIAGNOSTICS_MAX_TRACKED = 128;
export const REQUEST_DIAGNOSTICS_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
export const REQUEST_DIAGNOSTICS_STAGES = new Set(["request", "verifyImpersonationToken", "verifyToken", "getUserRole", "orgMembership", "memberSeat", "handler"]);
export const REQUEST_DIAGNOSTICS_CATEGORIES: Readonly<Record<string, string>> = Object.freeze({
  "/public/health": "public-health",
  "/public/version": "public-version",
  "/stream": "events",
  "/pi-camera/frame": "camera-frame",
  "/pi-camera/stream": "camera-stream",
  "/pi-camera/health": "camera-health",
  "/pi-camera/devices": "camera-devices",
  "/pi-camera/focus": "camera-focus",
  "/pi-camera/zoom": "camera-zoom",
  "/scan-session": "scan-status",
  "/scan-session/pause": "scan-pause",
  "/scan-session/resume": "scan-resume",
  "/scan-session/emergency-stop": "scan-emergency-stop",
  "/scan-session/feed": "scan-feed",
  "/scan-session/settings": "scan-settings",
  "/scan-session/reset-stats": "scan-reset-stats",
  "/scan-session/removal": "scan-removal",
  "/cards/image-proxy": "card-image-proxy",
});
export const REQUEST_DIAGNOSTICS_CATEGORY_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^\/cards\/netdeck-image\/[^/]+\/[^/]+\/[^/]+$/, "netdeck-image"],
  [/^\/collections\/[^/]+\/cards\/[^/]+\/image$/, "collection-photo-url"],
  [/^\/collections\/[^/]+\/cards\/[^/]+\/image\/download$/, "collection-photo-download"],
  [/^\/match-validations\/scans\/[^/]+\/thumbnail$/, "scan-thumbnail"],
];
