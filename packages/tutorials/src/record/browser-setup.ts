import { readFileSync } from "node:fs";
import type { BrowserContext } from "playwright";
import {
  DEFAULT_TUTORIAL_BASE_URL,
  TUTORIAL_ACTIVE_ORG_STORAGE_KEY,
  FEATURE_HIGHLIGHTS_API_PATH,
  TUTORIAL_LANGUAGE_STORAGE_KEY,
  TUTORIAL_PRESEEDED_LOCAL_STORAGE,
} from "../lib/constants/tutorial";
import type { TutorialLanguage, TutorialViewport } from "../lib/interfaces/tutorial";
import { installFakeCamera } from "./fake-camera";

export function tutorialBaseUrl(): string {
  return process.env.TUTORIAL_BASE_URL || DEFAULT_TUTORIAL_BASE_URL;
}

export function assertSavedSessionHasOrganization(storageStatePath: string): void {
  const storageState = JSON.parse(readFileSync(storageStatePath, "utf8")) as {
    origins?: { localStorage?: { name: string; value: string }[] }[];
  };
  const hasActiveOrg = (storageState.origins ?? []).some((origin) =>
    (origin.localStorage ?? []).some(
      (entry) => entry.name === TUTORIAL_ACTIVE_ORG_STORAGE_KEY && entry.value.length > 0,
    ),
  );
  if (!hasActiveOrg) {
    throw new Error(
      "The saved session has no organization chosen. Run `pnpm --filter @magic-vault/tutorials sign-in` again and pick the demo organization.",
    );
  }
}

export async function assertAppIsReachable(baseUrl: string): Promise<void> {
  try {
    await fetch(baseUrl, { method: "HEAD" });
  } catch {
    throw new Error(
      `Nothing answered at ${baseUrl}. Start the app with \`pnpm dev\`, or set TUTORIAL_BASE_URL in the root .env to a running instance.`,
    );
  }
}

export async function prepareTutorialContext(
  context: BrowserContext,
  language: TutorialLanguage,
  viewport: TutorialViewport,
): Promise<void> {
  await context.addInitScript(
    ({ preseededEntries, languageStorageKey, selectedLanguage }) => {
      try {
        for (const [key, value] of Object.entries(preseededEntries)) localStorage.setItem(key, value);
        localStorage.setItem(languageStorageKey, selectedLanguage);
      } catch {}
    },
    {
      preseededEntries: TUTORIAL_PRESEEDED_LOCAL_STORAGE,
      languageStorageKey: TUTORIAL_LANGUAGE_STORAGE_KEY,
      selectedLanguage: language,
    },
  );
  await installFakeCamera(context, viewport);
  await context.grantPermissions(["camera"]);
  const unseenFeatureHighlightsPattern = new RegExp(`${FEATURE_HIGHLIGHTS_API_PATH}(\\?.*)?$`);
  await context.route(unseenFeatureHighlightsPattern, (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: { success: true, data: { highlights: [], seenHighlightIds: [] } } })
      : route.continue(),
  );
}
