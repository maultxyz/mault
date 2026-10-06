import { SOUND_CLIP_WAVEFORM_BARS } from "@magic-vault/shared";
import {
  IconLayoutGrid,
  IconRoute,
  IconSparkles,
  IconStack2,
} from "@tabler/icons-react";

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

export const DEMO_REPACK_SLOTS = [
  { label: "Bin 1", note: "commons", done: 3, total: 3 },
  { label: "Bin 2", note: "uncommons", done: 1, total: 2 },
  { label: "Bin 3", note: "rare", done: 0, total: 1 },
];

export const DEMO_RULE_FIELD_OPTIONS = ["Rarity", "Color", "Set", "Type"];

export const DEMO_RULE_OPERATOR_OPTIONS = ["is", "is not", "includes"];

export const LANDING_PIPELINE_STEPS = [
  { key: "showCard", icon: IconStack2 },
  { key: "recognized", icon: IconSparkles },
  { key: "sorted", icon: IconRoute },
  { key: "organized", icon: IconLayoutGrid },
] as const;
