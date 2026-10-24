import { SOUND_CLIP_WAVEFORM_BARS } from "@magic-vault/shared";
import {
  IconApi,
  IconArrowsShuffle,
  IconArrowsSplit2,
  IconBrandDiscord,
  IconBellRinging,
  IconBroadcast,
  IconLanguage,
  IconLayoutGrid,
  IconListSearch,
  IconLock,
  IconTextRecognition,
  IconUsers,
} from "@tabler/icons-react";
import type {
  DemoIntakeRow,
  DemoPickListEntry,
  DemoPickRow,
  DemoStorageBox,
  LandingFeatureExtra,
} from "@/lib/interfaces/landing";

export const GAMES_MARQUEE_MIN_ITEMS = 12;

export const GAMES_MARQUEE_SECONDS_PER_ITEM = 4;

export const DEMO_ALPHABET_BINS = [
  { letter: "A", card: "Arcane Signet" },
  { letter: "B", card: "Brainstorm" },
  { letter: "C", card: "Counterspell" },
  { letter: "D", card: "Dark Ritual" },
  { letter: "E", card: "Evolving Wilds" },
  { letter: "F", card: "Fatal Push" },
];

export const DEMO_ALPHABET_DEEPER = ["AA", "AB", "AC", "AD"];

function demoPeaks(seed: number): number[] {
  return Array.from({ length: SOUND_CLIP_WAVEFORM_BARS }, (_, i) => {
    const t = i / SOUND_CLIP_WAVEFORM_BARS;
    const envelope = Math.exp(-((t - 0.25 - seed * 0.2) ** 2) / 0.03);
    const ripple = Math.abs(Math.sin((i + seed * 7) * 0.9));
    return Math.min(1, 0.15 + envelope * 0.7 + ripple * 0.2);
  });
}

export const DEMO_SOUND_RULES = [
  {
    rule: "Rarity is Mythic",
    clip: "fanfare.mp3",
    peaks: demoPeaks(0),
    progress: 0.55,
  },
  {
    rule: "Price over $20",
    clip: "cha-ching.wav",
    peaks: demoPeaks(1),
    progress: 0,
  },
];

export const DEMO_AUTO_ASSIGN_ROWS = [
  { value: "Mythic", bin: 1 },
  { value: "Rare", bin: 2 },
  { value: "Uncommon", bin: 3 },
  { value: "Common", bin: 4 },
];

export const DEMO_BIN_DIAGRAM_MODULES = [
  { module: 1, left: 1, right: 2 },
  { module: 2, left: 3, right: 4 },
  { module: 3, left: 5, right: 6 },
];

export const HERO_SORT_INTERVAL_MS = 2600;

export const HERO_QUEUE_PREVIEW = 3;

export const HERO_BIN_BASE_COUNTS: Record<number, number> = {
  1: 41,
  2: 57,
  3: 23,
  4: 66,
  5: 18,
  6: 4,
  7: 12,
};

export const DEMO_REPACK_SLOTS = [
  { label: "Bin 1", note: "commons", done: 3, total: 3 },
  { label: "Bin 2", note: "uncommons", done: 1, total: 2 },
  { label: "Bin 3", note: "rare", done: 0, total: 1 },
];

export const DEMO_RULE_FIELD_OPTIONS = ["Rarity", "Color", "Set", "Type"];

export const DEMO_RULE_OPERATOR_OPTIONS = ["is", "is not", "includes"];

export const MARKETING_FOOTER_LINK_CLASS =
  "transition-colors hover:text-foreground";

export const DEMO_STORAGE_BOXES: DemoStorageBox[] = [
  { name: "Box 1 · Rares", cardCount: 248, value: 1284.5 },
  { name: "Box 2 · Commons", cardCount: 812, value: 96.4 },
  { name: "Box 3 · Trades", cardCount: 96, value: 412.75 },
];

export const DEMO_STORAGE_ACTIVE_BOX = 0;

export const DEMO_STORAGE_SEARCH = "Ragavan";

export const DEMO_STORAGE_FIRST_POSITION = 117;

export const DEMO_STORAGE_HIGHLIGHT_INDEX = 1;

export const DEMO_STORAGE_CARD_INDEXES = [1, 5, 4];

export const DEMO_PICK_LIST_BIN = 3;

export const DEMO_PICK_LIST_ENTRIES: DemoPickListEntry[] = [
  { name: "Lightning Bolt", quantity: 4, found: 4 },
  { name: "Sol Ring", quantity: 1, found: 1 },
  { name: "Counterspell", quantity: 2, found: 1 },
  { name: "Brainstorm", quantity: 4, found: 0 },
];

export const DEMO_PRICING_CARD_INDEX = 5;

export const DEMO_PRICING_PRICES = {
  tcgplayer: 42.16,
  cardmarket: 38.9,
  cardkingdom: 49.99,
};

export const LANDING_FEATURE_EXTRAS: LandingFeatureExtra[] = [
  { key: "chaos", icon: IconArrowsShuffle },
  { key: "overflow", icon: IconArrowsSplit2 },
  { key: "monitor", icon: IconBroadcast },
  { key: "discord", icon: IconBrandDiscord },
  { key: "stations", icon: IconLayoutGrid },
  { key: "ocr", icon: IconTextRecognition },
  { key: "languages", icon: IconLanguage },
  { key: "api", icon: IconApi },
  { key: "accuracy", icon: IconListSearch },
  { key: "staff", icon: IconUsers },
  { key: "fleet", icon: IconBellRinging },
  { key: "permissions", icon: IconLock },
];

export const LANDING_FEATURE_GRID_CLASS =
  "mt-10 grid gap-px overflow-hidden rounded-lg bg-border ring-1 ring-border md:grid-cols-2 lg:grid-cols-6";

export const LANDING_FEATURE_TILE_CLASS =
  "flex flex-col gap-4 bg-card p-5 md:p-6";

export const LANDING_FEATURE_DEMO_CLASS =
  "flex flex-1 items-center justify-center rounded-md border bg-background bg-blueprint p-4";

export const DEMO_INTAKE_CUSTOMER = "Ann";

export const DEMO_INTAKE_CREDIT_BONUS = 25;

export const DEMO_INTAKE_ROWS: DemoIntakeRow[] = [
  { cardIndex: 5, market: 42.16, offer: 29.51 },
  { cardIndex: 1, market: 1.85, offer: 0.93 },
  { cardIndex: 0, market: 1.12, offer: 0.56 },
  { cardIndex: 3, market: 0.14, offer: 0, declined: true },
];

export const DEMO_PICKS_NAME = "Monday's orders";

export const DEMO_PICKS_ROWS: DemoPickRow[] = [
  { cardIndex: 5, box: "Box 1", position: 118, picked: true },
  { cardIndex: 1, box: "Box 1", position: 204, picked: true },
  { cardIndex: 2, box: "Box 3", position: 12, picked: false },
  { cardIndex: 4, box: "Box 3", position: 57, picked: false },
];
