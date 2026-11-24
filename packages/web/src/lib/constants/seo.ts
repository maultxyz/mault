export const SITE_URL = "https://mault.xyz";
export const SITE_NAME = "Mault";
export const NO_INDEX_ROBOTS = "noindex, nofollow";
export const DEFAULT_ROBOTS = "index, follow";
export const PRERENDER_PATH_GUARD_SCRIPT =
  '<script>(function(r){var p=location.pathname;while(p.length>1&&p.slice(-1)==="/")p=p.slice(0,-1);if(r.dataset.prerenderedPath!==p)r.innerHTML=""})(document.getElementById("root"))</script>';
export const CLIENT_RENDERED_BOUNDARY_MARKER = "<!--$!-->";
export const PRERENDER_MAX_PASSES = 40;
export const PRERENDER_PASS_DELAY_MS = 50;

export const SITE_DOMAIN = new URL(SITE_URL).host;
export const SHARE_PAGE_FILE = "share.html";
export const SHARE_PREVIEW_SSI_PATH = "/__share_preview";
export const SHARE_PREVIEW_SSI_DEFAULT_BLOCK = "share_preview_default";

export const SITE_PUBLIC_API_URL = `${SITE_URL}/api/public`;
export const SITE_ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const SITE_WEBSITE_ID = `${SITE_URL}/#website`;
export const SITE_SOFTWARE_ID = `${SITE_URL}/#software`;
export const SITE_HOME_BREADCRUMB_NAME = "Home";
export const SITE_TITLE_SUFFIX_PATTERN = /\s*\|\s*Mault$/;
export const SITE_LANGUAGE = "en";
export const SITE_REPOSITORY_URL = "https://github.com/maultxyz/mault";
export const SOFTWARE_APPLICATION_CATEGORY = "UtilitiesApplication";
export const SOFTWARE_OPERATING_SYSTEMS = "Web, Windows, Linux, iOS, Android";
export const DESKTOP_OPERATING_SYSTEMS = "Windows 10 or later, Linux";
export const SOFTWARE_FREE_PRICE = "0";
export const SOFTWARE_PRICE_CURRENCY = "USD";
export const SUPPORTED_GAME_NAMES = [
  "Magic: The Gathering",
  "Pokémon Trading Card Game",
  "Yu-Gi-Oh!",
  "Disney Lorcana",
  "One Piece Card Game",
  "Flesh and Blood",
  "Star Wars: Unlimited",
  "Digimon Card Game",
  "Gundam Card Game",
  "Grand Archive",
  "Sorcery: Contested Realm",
  "Riftbound",
  "Elestrals",
];
