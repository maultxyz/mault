import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
  TUTORIAL_ACTIVE_ORG_STORAGE_KEY,
  TUTORIAL_MAIN_HEADING_SELECTOR,
  TUTORIAL_SIGN_IN_TIMEOUT_MS,
} from "../lib/constants/tutorial";
import { TUTORIAL_AUTH_STATE_PATH } from "../lib/constants/tutorial-paths";
import { assertAppIsReachable, tutorialBaseUrl } from "./browser-setup";

const baseUrl = tutorialBaseUrl();
await assertAppIsReachable(baseUrl);
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
await page.goto(new URL("/app/home", baseUrl).toString());

console.log(`Sign in to ${baseUrl} with the demo account and pick the demo organization.`);
console.log("The session is saved as soon as an app page loads.");

await page.waitForFunction(
  ({ headingSelector, activeOrgStorageKey }) => {
    let hasActiveOrg = false;
    try {
      hasActiveOrg = Boolean(localStorage.getItem(activeOrgStorageKey));
    } catch {}
    return (
      window.location.pathname.startsWith("/app/") &&
      document.querySelector(headingSelector) !== null &&
      hasActiveOrg
    );
  },
  { headingSelector: TUTORIAL_MAIN_HEADING_SELECTOR, activeOrgStorageKey: TUTORIAL_ACTIVE_ORG_STORAGE_KEY },
  { timeout: TUTORIAL_SIGN_IN_TIMEOUT_MS, polling: 500 },
);
await page.waitForTimeout(2000);

mkdirSync(path.dirname(TUTORIAL_AUTH_STATE_PATH), { recursive: true });
await context.storageState({ path: TUTORIAL_AUTH_STATE_PATH });
console.log(`Saved the signed-in session to ${TUTORIAL_AUTH_STATE_PATH}`);
await browser.close();
