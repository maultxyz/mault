import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

export const TUTORIALS_PACKAGE_ROOT = packageRoot;
export const TUTORIALS_SOURCE_DIRECTORY = path.join(packageRoot, "src", "tutorials");
export const TUTORIALS_OUTPUT_DIRECTORY = path.join(packageRoot, "out");
export const FAKE_CAMERA_BROWSER_SCRIPT_PATH = path.join(packageRoot, "src", "record", "fake-camera.browser.js");
export const TUTORIAL_CARD_IMAGE_CACHE_DIRECTORY = path.join(packageRoot, "out", ".card-images");
export const TUTORIAL_AUTH_STATE_PATH = path.join(packageRoot, ".auth", "storage-state.json");
export const TUTORIAL_RENDER_ENTRY_POINT = path.join(packageRoot, "src", "render", "index.ts");
export const WEB_LOCALES_DIRECTORY = path.resolve(packageRoot, "..", "web", "src", "locales");
