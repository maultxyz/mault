import type {
  TutorialLanguage,
  TutorialViewport,
  TutorialViewportName,
} from "../interfaces/tutorial";

export const TUTORIAL_LANGUAGE: TutorialLanguage = "en";

export const TUTORIAL_VIEWPORTS: Record<TutorialViewportName, TutorialViewport> = {
  desktop: {
    name: "desktop",
    cssWidth: 1280,
    cssHeight: 720,
    deviceScaleFactor: 1.5,
    videoWidth: 1920,
    videoHeight: 1080,
    compositionWidth: 1920,
    compositionHeight: 1080,
    isMobile: false,
    maximumZoomScale: 1.8,
  },
  mobile: {
    name: "mobile",
    cssWidth: 390,
    cssHeight: 844,
    deviceScaleFactor: 3,
    videoWidth: 1170,
    videoHeight: 2532,
    compositionWidth: 1080,
    compositionHeight: 1920,
    isMobile: true,
    maximumZoomScale: 1.4,
  },
};

export const DEFAULT_TUTORIAL_BASE_URL = "http://localhost:5173";
export const TUTORIAL_SIGN_IN_TIMEOUT_MS = 10 * 60 * 1000;
export const TUTORIAL_PAGE_READY_TIMEOUT_MS = 30_000;
export const TUTORIAL_PAGE_SETTLE_MS = 1200;

export const CURSOR_TRAVEL_MS = 750;
export const CURSOR_ARRIVES_BEFORE_ACTION_MS = 120;
export const AFTER_POINTER_ACTION_MS = 600;
export const TYPING_DELAY_PER_CHARACTER_MS = 70;
export const CAPTION_READING_MS_PER_CHARACTER = 55;
export const CAPTION_MINIMUM_READING_MS = 2000;
export const RECORDING_TAIL_MS = 900;

export const ZOOM_TRANSITION_MS = 650;
export const ZOOM_HOLD_AFTER_ACTION_MS = 1600;
export const ZOOM_TARGET_SHARE_OF_SCREEN = 0.32;

export const CLICK_RIPPLE_MS = 450;
export const CAPTION_FADE_MS = 180;

export const TUTORIAL_FRAMES_PER_SECOND = 30;
export const TUTORIAL_INTRO_MS = 2400;
export const TUTORIAL_OUTRO_MS = 2600;
export const TUTORIAL_POSTER_AT_INTRO_SHARE = 0.75;
export const TUTORIAL_COMPOSITION_ID = "Tutorial";

export const TUTORIAL_FRAMES_DIRECTORY_NAME = "frames";
export const SCREENCAST_JPEG_QUALITY = 90;
export const TUTORIAL_TIMELINE_FILE_NAME = "timeline.json";
export const TUTORIAL_VIDEO_FILE_NAME = "tutorial.mp4";
export const TUTORIAL_CAPTIONS_FILE_NAME = "captions.vtt";
export const TUTORIAL_TRANSCRIPT_FILE_NAME = "transcript.txt";
export const TUTORIAL_POSTER_FILE_NAME = "poster.jpg";

export const TUTORIAL_PRESEEDED_LOCAL_STORAGE: Record<string, string> = {
  "magic-vault:onboarding-completed": "true",
  "magic-vault:sorting-rules-tour-completed": "true",
  "magic-vault:calibration-tour-completed": "true",
  "magic-vault:repack-tour-completed": "true",
  "magic-vault:business-overview-tour-completed": "true",
  "magic-vault:business-buys-tour-completed": "true",
  "magic-vault:business-picks-tour-completed": "true",
  "magic-vault:business-reservations-tour-completed": "true",
  "magic-vault:business-labels-tour-completed": "true",
  "magic-vault:business-sales-tour-completed": "true",
  "magic-vault:scanner-buy-tour-completed": "true",
  "magic-vault:match-validation-guide-seen": "true",
  "magic-vault:support-prompt": JSON.stringify({ scans: 0, lastShownAt: null, optedOut: true }),
  theme: "light",
};

export const TUTORIAL_LANGUAGE_STORAGE_KEY = "language";
export const TUTORIAL_ACTIVE_ORG_STORAGE_KEY = "activeOrgId";
export const FEATURE_HIGHLIGHTS_API_PATH = "/feature-highlights";
export const TUTORIAL_MAIN_HEADING_SELECTOR = "#main-content h1";
