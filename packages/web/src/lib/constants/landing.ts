import { SOUND_CLIP_WAVEFORM_BARS } from "@magic-vault/shared";

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
