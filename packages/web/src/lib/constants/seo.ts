export const SITE_URL = "https://mault.xyz";
export const SITE_NAME = "MAULT";
export const NO_INDEX_ROBOTS = "noindex, nofollow";
export const DEFAULT_ROBOTS = "index, follow";
export const PRERENDER_PATH_GUARD_SCRIPT =
  '<script>(function(r){var p=location.pathname;while(p.length>1&&p.slice(-1)==="/")p=p.slice(0,-1);if(r.dataset.prerenderedPath!==p)r.innerHTML=""})(document.getElementById("root"))</script>';
export const CLIENT_RENDERED_BOUNDARY_MARKER = "<!--$!-->";
export const PRERENDER_MAX_PASSES = 40;
export const PRERENDER_PASS_DELAY_MS = 50;
